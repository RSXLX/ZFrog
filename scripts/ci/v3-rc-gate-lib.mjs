const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toDate = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toPositiveNumber = (value, fallback) => {
  const candidate = Number(value);
  if (!Number.isFinite(candidate) || candidate <= 0) {
    return fallback;
  }
  return candidate;
};

const toNonNegativeNumber = (value, fallback) => {
  const candidate = Number(value);
  if (!Number.isFinite(candidate) || candidate < 0) {
    return fallback;
  }
  return candidate;
};

const toEventSet = (value) => {
  if (!Array.isArray(value)) {
    return new Set();
  }

  const events = value
    .map((item) => toTrimmedString(item).toLowerCase())
    .filter(Boolean);

  return new Set(events);
};

const normalizeRunEvent = (value) => toTrimmedString(value).toLowerCase();

const toStatusLabel = (value) => {
  const normalized = toTrimmedString(value).toLowerCase();
  return normalized || 'unknown';
};

export const getRunUpdatedAt = (run) => {
  if (!isObject(run)) {
    return null;
  }

  return toDate(run.updated_at) ?? toDate(run.run_started_at) ?? toDate(run.created_at);
};

export const normalizeRuns = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (isObject(payload) && Array.isArray(payload.workflow_runs)) {
    return payload.workflow_runs;
  }
  return [];
};

export const filterRunsByAllowedEvents = (runs, allowedEvents) => {
  if (!(allowedEvents instanceof Set) || allowedEvents.size === 0) {
    return runs;
  }

  return runs.filter((run) => allowedEvents.has(normalizeRunEvent(run?.event)));
};

export const countConsecutiveSuccesses = (runs) => {
  let count = 0;

  for (const run of runs) {
    if (run?.status !== 'completed') {
      continue;
    }

    if (run?.conclusion === 'success') {
      count += 1;
      continue;
    }

    break;
  }

  return count;
};

export const getLatestSuccessfulRun = (runs) =>
  runs.find((run) => run?.status === 'completed' && run?.conclusion === 'success') ?? null;

const formatDurationHours = (value) => {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value.toFixed(2)}h`;
};

export const evaluateV3RcGate = ({ config, runs, now }) => {
  const safeConfig = isObject(config) ? config : {};
  const nightly = isObject(safeConfig.nightly) ? safeConfig.nightly : {};
  const defectBudget = isObject(safeConfig.defectBudget) ? safeConfig.defectBudget : {};
  const defects = isObject(safeConfig.defectSnapshot) ? safeConfig.defectSnapshot : {};

  const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();

  const requiredSuccesses = toPositiveNumber(nightly.requiredConsecutiveSuccesses, 3);
  const maxHoursSinceLatestSuccess = toPositiveNumber(nightly.maxHoursSinceLatestSuccess, 30);
  const allowedEvents = toEventSet(nightly.allowedEvents);

  const normalizedRuns = normalizeRuns(runs);
  const scopedRuns = filterRunsByAllowedEvents(normalizedRuns, allowedEvents);

  const consecutiveSuccesses = countConsecutiveSuccesses(scopedRuns);
  const latestSuccess = getLatestSuccessfulRun(scopedRuns);
  const latestSuccessDate = getRunUpdatedAt(latestSuccess);
  const hoursSinceLatestSuccess = latestSuccessDate
    ? (safeNow.getTime() - latestSuccessDate.getTime()) / (60 * 60 * 1000)
    : Number.POSITIVE_INFINITY;

  const p0Open = Number(defects.p0Open ?? Number.POSITIVE_INFINITY);
  const p1Open = Number(defects.p1Open ?? Number.POSITIVE_INFINITY);
  const p0Budget = toNonNegativeNumber(defectBudget.p0Open, 0);
  const p1Budget = toNonNegativeNumber(defectBudget.p1Open, 0);

  const defectSnapshotDate = toDate(defects.updatedAt);
  const maxHoursSinceSnapshot = toPositiveNumber(defects.maxHoursSinceUpdated, 168);
  const hoursSinceSnapshot = defectSnapshotDate
    ? (safeNow.getTime() - defectSnapshotDate.getTime()) / (60 * 60 * 1000)
    : Number.POSITIVE_INFINITY;

  const checks = [
    {
      id: 'defect-p0',
      name: 'P0 defects within budget',
      expected: `<= ${p0Budget}`,
      actual: String(p0Open),
      pass: Number.isFinite(p0Open) && p0Open <= p0Budget
    },
    {
      id: 'defect-p1',
      name: 'P1 defects within budget',
      expected: `<= ${p1Budget}`,
      actual: String(p1Open),
      pass: Number.isFinite(p1Open) && p1Open <= p1Budget
    },
    {
      id: 'defect-snapshot-freshness',
      name: 'Defect snapshot freshness',
      expected: `updated <= ${maxHoursSinceSnapshot}h`,
      actual: Number.isFinite(hoursSinceSnapshot)
        ? `updated ${hoursSinceSnapshot.toFixed(2)}h ago`
        : 'snapshot updatedAt missing/invalid',
      pass: Number.isFinite(hoursSinceSnapshot) && hoursSinceSnapshot <= maxHoursSinceSnapshot
    },
    {
      id: 'nightly-run-coverage',
      name: 'Nightly run coverage',
      expected: `>= ${requiredSuccesses} sampled runs in scope`,
      actual: `${scopedRuns.length} sampled runs in scope`,
      pass: scopedRuns.length >= requiredSuccesses
    },
    {
      id: 'nightly-stability',
      name: 'Nightly stability',
      expected: `${requiredSuccesses} consecutive successful runs`,
      actual: `${consecutiveSuccesses} consecutive successful runs`,
      pass: consecutiveSuccesses >= requiredSuccesses
    },
    {
      id: 'nightly-freshness',
      name: 'Nightly freshness',
      expected: `latest success <= ${maxHoursSinceLatestSuccess}h ago`,
      actual: Number.isFinite(hoursSinceLatestSuccess)
        ? `latest success ${hoursSinceLatestSuccess.toFixed(2)}h ago`
        : 'latest successful run not found',
      pass: Number.isFinite(hoursSinceLatestSuccess) && hoursSinceLatestSuccess <= maxHoursSinceLatestSuccess
    }
  ];

  return {
    passed: checks.every((item) => item.pass),
    checks,
    meta: {
      gateId: toTrimmedString(safeConfig.gateId) || 'v3-rc-gate',
      workflowFile: toTrimmedString(nightly.workflowFile) || 'unknown',
      allowedEvents: [...allowedEvents],
      scopedRunCount: scopedRuns.length,
      consecutiveSuccesses,
      requiredSuccesses,
      latestSuccessUrl: toTrimmedString(latestSuccess?.html_url) || null,
      latestSuccessAt: latestSuccessDate ? latestSuccessDate.toISOString() : null,
      latestSuccessEvent: normalizeRunEvent(latestSuccess?.event) || null,
      maxHoursSinceLatestSuccess,
      defect: {
        p0Open,
        p1Open,
        p0Budget,
        p1Budget,
        snapshotUpdatedAt: defectSnapshotDate ? defectSnapshotDate.toISOString() : null,
        snapshotSource: toTrimmedString(defects.source) || 'unknown',
        snapshotNotes: toTrimmedString(defects.notes) || '',
        maxHoursSinceSnapshot,
        hoursSinceSnapshot: Number.isFinite(hoursSinceSnapshot) ? Number(hoursSinceSnapshot.toFixed(2)) : null
      },
      scopedRunPreview: scopedRuns.slice(0, 8).map((run) => {
        const updatedAtDate = getRunUpdatedAt(run);
        return {
          id: run?.id ?? null,
          event: normalizeRunEvent(run?.event) || null,
          status: toStatusLabel(run?.status),
          conclusion: toStatusLabel(run?.conclusion),
          updatedAt: updatedAtDate ? updatedAtDate.toISOString() : null,
          url: toTrimmedString(run?.html_url) || null
        };
      })
    }
  };
};

export const renderV3RcGateReport = ({ configPath, runSource, generatedAt, result }) => {
  const lines = [];
  lines.push('# V3 RC Release Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Nightly Workflow: \`${result.meta.workflowFile}\``);
  lines.push(`- Allowed run events: \`${result.meta.allowedEvents.join(', ') || 'all'}\``);
  lines.push(`- Run source: \`${runSource}\``);
  lines.push(
    `- Defect snapshot: \`${result.meta.defect.snapshotSource}\` @ \`${result.meta.defect.snapshotUpdatedAt ?? 'unknown'}\``
  );
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${check.pass ? 'PASS' : 'FAIL'} |`);
  }

  lines.push('');
  if (result.meta.latestSuccessUrl) {
    lines.push(`- Latest successful scoped run: ${result.meta.latestSuccessUrl}`);
    lines.push(`- Latest successful scoped run event: ${result.meta.latestSuccessEvent || 'unknown'}`);
    lines.push(`- Latest successful scoped run at: ${result.meta.latestSuccessAt}`);
  } else {
    lines.push('- Latest successful scoped run: none');
  }

  lines.push('');
  lines.push('## Scoped Run Preview (Most Recent First)');
  lines.push('');
  lines.push('| Run ID | Event | Status | Conclusion | Updated At |');
  lines.push('| --- | --- | --- | --- | --- |');
  if (!Array.isArray(result.meta.scopedRunPreview) || result.meta.scopedRunPreview.length === 0) {
    lines.push('| - | - | - | - | - |');
  } else {
    for (const run of result.meta.scopedRunPreview) {
      lines.push(
        `| ${run.id ?? '-'} | ${run.event ?? '-'} | ${run.status ?? '-'} | ${run.conclusion ?? '-'} | ${
          run.updatedAt ?? '-'
        } |`
      );
    }
  }

  lines.push('');
  lines.push('## Gate Metrics');
  lines.push('');
  lines.push(`- Scoped run count: ${result.meta.scopedRunCount}`);
  lines.push(`- Consecutive successes: ${result.meta.consecutiveSuccesses}/${result.meta.requiredSuccesses}`);
  lines.push(
    `- Latest success freshness threshold: ${formatDurationHours(result.meta.maxHoursSinceLatestSuccess)} (max allowed)`
  );
  lines.push(`- Defect budget: P0<=${result.meta.defect.p0Budget}, P1<=${result.meta.defect.p1Budget}`);

  return `${lines.join('\n')}\n`;
};
