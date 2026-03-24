const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }
  return fallback;
};

const toNonNegativeInteger = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const toPositiveInteger = (value, fallback) => {
  const normalized = toNonNegativeInteger(value, fallback);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }
  return normalized;
};

const normalizeObservationConfig = (observationConfig) => {
  const source = isObject(observationConfig) ? observationConfig : {};
  return {
    requiredConsecutivePassedWeeks: toPositiveInteger(source.requiredConsecutivePassedWeeks, 2),
    failOnInsufficientConsecutivePassedWeeks: toBoolean(source.failOnInsufficientConsecutivePassedWeeks, true),
    requireLatestTimeoutRunPass: toBoolean(source.requireLatestTimeoutRunPass, true),
    requireNoTimeoutConsecutiveFailure: toBoolean(source.requireNoTimeoutConsecutiveFailure, true),
    requireTimeoutGatePass: toBoolean(source.requireTimeoutGatePass, true),
    maxLabelDriftIssues: toNonNegativeInteger(source.maxLabelDriftIssues, 0),
    failOnLabelDrift: toBoolean(source.failOnLabelDrift, true),
    requireRatchetingCheck: toBoolean(source.requireRatchetingCheck, true),
    ratchetingCheckId:
      toTrimmedString(source.ratchetingCheckId) || 'timeout-candidate-recovery-threshold-ratchet',
    failOnMissingRatchetingCheck: toBoolean(source.failOnMissingRatchetingCheck, true),
    failOnRatchetingCheckFailure: toBoolean(source.failOnRatchetingCheckFailure, true)
  };
};

const buildCheck = ({ id, name, expected, actual, pass, enabled = true }) => {
  if (enabled) {
    return {
      id,
      name,
      expected,
      actual,
      pass
    };
  }

  return {
    id,
    name,
    expected: 'n/a (disabled)',
    actual,
    pass: true,
    skipped: true
  };
};

const findCheckById = (checks, checkId) => {
  if (!Array.isArray(checks) || !checkId) {
    return null;
  }
  return checks.find((check) => toTrimmedString(check?.id) === checkId) || null;
};

export const evaluateTimeoutStabilityObservationGate = ({ summary, timeoutGateResult, config }) => {
  const gateConfig = isObject(config) ? config : {};
  const observation = normalizeObservationConfig(gateConfig.observation);

  const summarySnapshot = isObject(summary) ? summary : {};
  const timeoutSnapshot = isObject(timeoutGateResult) ? timeoutGateResult : {};

  const observedConsecutivePassedWeeks = toNonNegativeInteger(summarySnapshot.timeoutConsecutivePassedWeeks, 0);
  const timeoutConsecutiveFailureDetected = toBoolean(summarySnapshot.timeoutConsecutiveFailureDetected, false);
  const timeoutLatestRunFailed = toBoolean(summarySnapshot.timeoutLatestRunFailed, false);
  const timeoutGatePassed = toBoolean(timeoutSnapshot.passed, false);
  const labelDriftIssues = toNonNegativeInteger(timeoutSnapshot?.metrics?.labelDriftIssues, null);
  const ratchetingCheck = findCheckById(timeoutSnapshot?.checks, observation.ratchetingCheckId);

  const checks = [];
  checks.push(
    buildCheck({
      id: 'observation-consecutive-passed-weeks',
      name: 'Timeout consecutive passed weeks',
      expected: `>= ${observation.requiredConsecutivePassedWeeks}`,
      actual: String(observedConsecutivePassedWeeks),
      pass: observedConsecutivePassedWeeks >= observation.requiredConsecutivePassedWeeks,
      enabled: observation.failOnInsufficientConsecutivePassedWeeks
    })
  );
  checks.push(
    buildCheck({
      id: 'observation-no-consecutive-failure',
      name: 'Timeout consecutive failure trend absent',
      expected: 'false',
      actual: String(timeoutConsecutiveFailureDetected),
      pass: !timeoutConsecutiveFailureDetected,
      enabled: observation.requireNoTimeoutConsecutiveFailure
    })
  );
  checks.push(
    buildCheck({
      id: 'observation-latest-run-pass',
      name: 'Timeout latest run passed',
      expected: 'true',
      actual: String(!timeoutLatestRunFailed),
      pass: !timeoutLatestRunFailed,
      enabled: observation.requireLatestTimeoutRunPass
    })
  );
  checks.push(
    buildCheck({
      id: 'observation-timeout-gate-pass',
      name: 'Current timeout gate verdict',
      expected: 'PASS',
      actual: timeoutGatePassed ? 'PASS' : 'FAIL',
      pass: timeoutGatePassed,
      enabled: observation.requireTimeoutGatePass
    })
  );
  checks.push(
    buildCheck({
      id: 'observation-label-drift-budget',
      name: 'Timeout gate label drift budget',
      expected: `<= ${observation.maxLabelDriftIssues}`,
      actual: labelDriftIssues === null ? 'missing' : String(labelDriftIssues),
      pass: labelDriftIssues !== null && labelDriftIssues <= observation.maxLabelDriftIssues,
      enabled: observation.failOnLabelDrift
    })
  );

  const ratchetingCheckFound = ratchetingCheck !== null;
  const ratchetingCheckPass = ratchetingCheckFound ? Boolean(ratchetingCheck.pass) : false;
  checks.push(
    buildCheck({
      id: 'observation-ratcheting-check-present',
      name: 'Timeout ratcheting check present',
      expected: `check id=${observation.ratchetingCheckId}`,
      actual: ratchetingCheckFound ? 'found' : 'missing',
      pass: ratchetingCheckFound,
      enabled: observation.requireRatchetingCheck && observation.failOnMissingRatchetingCheck
    })
  );
  checks.push(
    buildCheck({
      id: 'observation-ratcheting-check-pass',
      name: 'Timeout ratcheting check pass',
      expected: 'PASS',
      actual: ratchetingCheckFound ? (ratchetingCheckPass ? 'PASS' : 'FAIL') : 'missing',
      pass: ratchetingCheckPass,
      enabled:
        observation.requireRatchetingCheck &&
        (!observation.failOnMissingRatchetingCheck || ratchetingCheckFound) &&
        observation.failOnRatchetingCheckFailure
    })
  );

  return {
    passed: checks.every((check) => check.pass),
    checks,
    metrics: {
      observedConsecutivePassedWeeks,
      requiredConsecutivePassedWeeks: observation.requiredConsecutivePassedWeeks,
      timeoutConsecutiveFailureDetected,
      timeoutLatestRunFailed,
      timeoutGatePassed,
      labelDriftIssues,
      maxLabelDriftIssues: observation.maxLabelDriftIssues,
      ratchetingCheckFound,
      ratchetingCheckPass,
      ratchetingCheckId: observation.ratchetingCheckId
    },
    meta: {
      gateId: toTrimmedString(gateConfig.gateId) || 'v2-p1-timeout-stability-observation-gate',
      observation
    }
  };
};

const renderCheckStatus = (check) => (check.pass ? 'PASS' : 'FAIL');

export const renderTimeoutStabilityObservationGateReport = ({
  generatedAt,
  configPath,
  summaryJsonPath,
  timeoutGateJsonPath,
  result
}) => {
  const lines = [];
  lines.push('# V2 P1 Timeout Stability Observation Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Summary source: \`${summaryJsonPath}\``);
  lines.push(`- Timeout gate source: \`${timeoutGateJsonPath}\``);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');

  lines.push('## Observation overview');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Required consecutive passed weeks | ${result.metrics.requiredConsecutivePassedWeeks} |`);
  lines.push(`| Observed consecutive passed weeks | ${result.metrics.observedConsecutivePassedWeeks} |`);
  lines.push(`| Timeout consecutive failure detected | ${result.metrics.timeoutConsecutiveFailureDetected} |`);
  lines.push(`| Timeout latest run failed | ${result.metrics.timeoutLatestRunFailed} |`);
  lines.push(`| Current timeout gate verdict | ${result.metrics.timeoutGatePassed ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Label drift issues (current run) | ${result.metrics.labelDriftIssues ?? 'missing'} |`);
  lines.push(`| Label drift budget | ${result.metrics.maxLabelDriftIssues} |`);
  lines.push(`| Ratcheting check id | ${result.metrics.ratchetingCheckId} |`);
  lines.push(`| Ratcheting check found | ${result.metrics.ratchetingCheckFound ? 'yes' : 'no'} |`);
  lines.push(`| Ratcheting check pass | ${result.metrics.ratchetingCheckPass ? 'yes' : 'no'} |`);
  lines.push('');

  lines.push('## Gate checks');
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    const suffix = check.skipped ? ' (SKIP)' : '';
    lines.push(`| ${check.name}${suffix} | ${check.expected} | ${check.actual} | ${renderCheckStatus(check)} |`);
  }
  lines.push('');

  lines.push('## Policy');
  lines.push('');
  lines.push(
    `- failOnInsufficientConsecutivePassedWeeks: ${
      result.meta.observation.failOnInsufficientConsecutivePassedWeeks ? 'enabled' : 'disabled'
    }`
  );
  lines.push(
    `- requireNoTimeoutConsecutiveFailure: ${
      result.meta.observation.requireNoTimeoutConsecutiveFailure ? 'enabled' : 'disabled'
    }`
  );
  lines.push(
    `- requireLatestTimeoutRunPass: ${
      result.meta.observation.requireLatestTimeoutRunPass ? 'enabled' : 'disabled'
    }`
  );
  lines.push(
    `- requireTimeoutGatePass: ${result.meta.observation.requireTimeoutGatePass ? 'enabled' : 'disabled'}`
  );
  lines.push(`- failOnLabelDrift: ${result.meta.observation.failOnLabelDrift ? 'enabled' : 'disabled'}`);
  lines.push(
    `- requireRatchetingCheck: ${result.meta.observation.requireRatchetingCheck ? 'enabled' : 'disabled'}`
  );
  lines.push(
    `- failOnMissingRatchetingCheck: ${
      result.meta.observation.failOnMissingRatchetingCheck ? 'enabled' : 'disabled'
    }`
  );
  lines.push(
    `- failOnRatchetingCheckFailure: ${
      result.meta.observation.failOnRatchetingCheckFailure ? 'enabled' : 'disabled'
    }`
  );

  return `${lines.join('\n')}\n`;
};
