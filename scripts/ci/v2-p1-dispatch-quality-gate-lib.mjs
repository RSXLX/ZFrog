const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toNonNegativeInteger = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const toPositiveInteger = (value, fallback) => Math.max(1, toNonNegativeInteger(value, fallback));

const toAttempts = (action) => {
  const attempts = Number(action?.attempts);
  if (!Number.isFinite(attempts) || attempts <= 0) {
    return 0;
  }
  return Math.floor(attempts);
};

const countByDecision = (actions, decision) => actions.filter((action) => action?.decision === decision).length;

const summarizeIdempotencyLog = (idempotencyLog) => {
  const records = Array.isArray(idempotencyLog?.records) ? idempotencyLog.records : [];
  const parseErrors = toNonNegativeInteger(idempotencyLog?.parseErrors, 0);
  const totalLines = toNonNegativeInteger(idempotencyLog?.totalLines, records.length + parseErrors);
  const missing = Boolean(idempotencyLog?.missing);

  const uniqueKeys = new Set();
  let duplicateKeys = 0;
  let createdRecords = 0;
  let failedRecords = 0;
  let latestRecordedAt = null;

  for (const record of records) {
    if (!isObject(record)) {
      continue;
    }

    const key = toTrimmedString(record.key);
    if (key) {
      if (uniqueKeys.has(key)) {
        duplicateKeys += 1;
      } else {
        uniqueKeys.add(key);
      }
    }

    const decision = toTrimmedString(record.decision);
    if (decision === 'created') {
      createdRecords += 1;
    } else if (decision === 'failed') {
      failedRecords += 1;
    }

    const recordedAt = toTrimmedString(record.recordedAt);
    if (!recordedAt) {
      continue;
    }

    const recordedAtDate = new Date(recordedAt);
    if (Number.isNaN(recordedAtDate.getTime())) {
      continue;
    }

    if (!latestRecordedAt) {
      latestRecordedAt = recordedAtDate.toISOString();
      continue;
    }

    const currentLatest = new Date(latestRecordedAt);
    if (!Number.isNaN(currentLatest.getTime()) && recordedAtDate > currentLatest) {
      latestRecordedAt = recordedAtDate.toISOString();
    }
  }

  return {
    idempotencyRecordsTotal: records.length,
    idempotencyLinesTotal: totalLines,
    idempotencyParseErrors: parseErrors,
    idempotencyCreatedRecords: createdRecords,
    idempotencyFailedRecords: failedRecords,
    idempotencyUniqueKeys: uniqueKeys.size,
    idempotencyDuplicateKeys: duplicateKeys,
    idempotencyLogMissing: missing,
    idempotencyLatestRecordedAt: latestRecordedAt
  };
};

export const evaluateDispatchQualityGate = ({ dispatchResult, config, idempotencyLog }) => {
  const gateConfig = isObject(config) ? config : {};
  const thresholds = isObject(gateConfig.thresholds) ? gateConfig.thresholds : {};
  const actions = Array.isArray(dispatchResult?.actions) ? dispatchResult.actions : [];
  const mode = toTrimmedString(dispatchResult?.mode) || 'unknown';
  const retryMaxAttempts = toPositiveInteger(dispatchResult?.retryPolicy?.maxAttempts, 1);

  const metrics = {
    actionTotal: actions.length,
    plannedCreate: countByDecision(actions, 'create'),
    created: countByDecision(actions, 'created'),
    dryRunCreate: countByDecision(actions, 'would-create'),
    failedCreates: countByDecision(actions, 'failed'),
    skippedExisting: countByDecision(actions, 'skip-existing'),
    skippedQuota: countByDecision(actions, 'skip-quota'),
    skippedOwnerRouteMissing: countByDecision(actions, 'skip-owner-route-missing'),
    skippedIdempotencyLog: countByDecision(actions, 'skip-idempotency-log'),
    retriedSuccesses: actions.filter((action) => action?.decision === 'created' && toAttempts(action) > 1).length,
    retryExhausted: actions.filter(
      (action) => action?.decision === 'failed' && toAttempts(action) >= retryMaxAttempts
    ).length,
    maxAttemptsObserved: actions.reduce((max, action) => Math.max(max, toAttempts(action)), 0),
    ...summarizeIdempotencyLog(idempotencyLog)
  };

  const maxFailedCreatesPerRun = toNonNegativeInteger(thresholds.maxFailedCreatesPerRun, 0);
  const maxRetryExhausted = toNonNegativeInteger(thresholds.maxRetryExhausted, 0);
  const maxIdempotencyParseErrors = toNonNegativeInteger(thresholds.maxIdempotencyParseErrors, 0);

  const checks = [
    {
      id: 'failed-creates-per-run',
      name: 'Failed creates per run',
      expected: `<= ${maxFailedCreatesPerRun}`,
      actual: String(metrics.failedCreates),
      pass: metrics.failedCreates <= maxFailedCreatesPerRun
    },
    {
      id: 'retry-exhausted',
      name: 'Retry exhausted creates',
      expected: `<= ${maxRetryExhausted}`,
      actual: String(metrics.retryExhausted),
      pass: metrics.retryExhausted <= maxRetryExhausted
    },
    {
      id: 'idempotency-log-parse-errors',
      name: 'Idempotency log parse errors',
      expected: `<= ${maxIdempotencyParseErrors}`,
      actual: String(metrics.idempotencyParseErrors),
      pass: metrics.idempotencyParseErrors <= maxIdempotencyParseErrors
    }
  ];

  return {
    passed: checks.every((check) => check.pass),
    checks,
    metrics,
    meta: {
      gateId: toTrimmedString(gateConfig.gateId) || 'v2-p1-dispatch-quality-gate',
      mode,
      retryMaxAttempts
    }
  };
};

const renderCheckStatus = (check) => (check.pass ? 'PASS' : 'FAIL');

export const renderDispatchQualityGateReport = ({
  generatedAt,
  configPath,
  dispatchJsonPath,
  idempotencyLogPath,
  result
}) => {
  const lines = [];
  lines.push('# V2 P1 Dispatch Quality Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Dispatch source: \`${dispatchJsonPath}\``);
  lines.push(`- Idempotency log source: \`${idempotencyLogPath}\``);
  lines.push(`- Dispatch mode: \`${result.meta.mode}\``);
  lines.push(`- Retry max attempts: ${result.meta.retryMaxAttempts}`);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');

  lines.push('## Dispatch quality overview');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Action total | ${result.metrics.actionTotal} |`);
  lines.push(`| Created | ${result.metrics.created} |`);
  lines.push(`| Failed creates | ${result.metrics.failedCreates} |`);
  lines.push(`| Retry exhausted | ${result.metrics.retryExhausted} |`);
  lines.push(`| Retried success | ${result.metrics.retriedSuccesses} |`);
  lines.push(`| Max attempts observed | ${result.metrics.maxAttemptsObserved} |`);
  lines.push(`| Idempotency log skipped | ${result.metrics.skippedIdempotencyLog} |`);
  lines.push(`| Idempotency records total | ${result.metrics.idempotencyRecordsTotal} |`);
  lines.push(`| Idempotency parse errors | ${result.metrics.idempotencyParseErrors} |`);
  lines.push(`| Idempotency duplicate keys | ${result.metrics.idempotencyDuplicateKeys} |`);
  lines.push(`| Idempotency log missing | ${result.metrics.idempotencyLogMissing ? 'yes' : 'no'} |`);
  lines.push('');

  lines.push('## Gate checks');
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${renderCheckStatus(check)} |`);
  }
  lines.push('');

  if (result.metrics.idempotencyLatestRecordedAt) {
    lines.push(`- Latest idempotency record: ${result.metrics.idempotencyLatestRecordedAt}`);
  } else {
    lines.push('- Latest idempotency record: none');
  }

  return `${lines.join('\n')}\n`;
};
