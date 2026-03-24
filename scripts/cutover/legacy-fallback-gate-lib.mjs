const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toPositiveNumber = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
};

const toRateNumber = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    return fallback;
  }
  return numeric;
};

const reasonArrayToMap = (reasons) => {
  const reasonMap = new Map();
  for (const item of reasons ?? []) {
    if (!item || typeof item.key !== 'string') {
      continue;
    }
    reasonMap.set(item.key, Number(item.count || 0));
  }
  return reasonMap;
};

const checkResult = ({ id, name, expected, actual, pass, skipped = false }) => ({
  id,
  name,
  expected,
  actual,
  pass,
  skipped
});

export const isDryRunEntry = (entry) => {
  if (!entry || typeof entry.args !== 'string') {
    return false;
  }
  return entry.args.includes('--dry-run');
};

export const filterEntriesForGate = ({ entries, excludeDryRun }) => {
  if (!excludeDryRun) {
    return {
      entries: Array.isArray(entries) ? entries : [],
      excludedDryRunCount: 0
    };
  }

  const sourceEntries = Array.isArray(entries) ? entries : [];
  const filteredEntries = sourceEntries.filter((entry) => !isDryRunEntry(entry));
  return {
    entries: filteredEntries,
    excludedDryRunCount: sourceEntries.length - filteredEntries.length
  };
};

export const evaluateFallbackGate = ({ stats, config, excludedDryRunCount = 0 }) => {
  const gateConfig = isObject(config) ? config : {};
  const thresholds = isObject(gateConfig.thresholds) ? gateConfig.thresholds : {};
  const reasonBudgets = isObject(gateConfig.reasonBudgets) ? gateConfig.reasonBudgets : {};

  const maxLegacyLaunches = toPositiveNumber(thresholds.maxLegacyLaunches, Number.POSITIVE_INFINITY);
  const maxLegacyRate = toRateNumber(thresholds.maxLegacyRate, 1);
  const minTotalLaunchesForRate = toPositiveNumber(thresholds.minTotalLaunchesForRate, 1);

  const checks = [];
  checks.push(
    checkResult({
      id: 'legacy-launch-count',
      name: 'Legacy launch count',
      expected: `<= ${maxLegacyLaunches === Number.POSITIVE_INFINITY ? 'unbounded' : maxLegacyLaunches}`,
      actual: String(stats.legacyEntries),
      pass: stats.legacyEntries <= maxLegacyLaunches
    })
  );

  if (stats.totalEntries < minTotalLaunchesForRate) {
    checks.push(
      checkResult({
        id: 'legacy-launch-rate',
        name: 'Legacy launch rate',
        expected: `<= ${(maxLegacyRate * 100).toFixed(2)}%`,
        actual: `insufficient sample (${stats.totalEntries} < ${minTotalLaunchesForRate})`,
        pass: true,
        skipped: true
      })
    );
  } else {
    checks.push(
      checkResult({
        id: 'legacy-launch-rate',
        name: 'Legacy launch rate',
        expected: `<= ${(maxLegacyRate * 100).toFixed(2)}%`,
        actual: `${(stats.legacyRate * 100).toFixed(2)}%`,
        pass: stats.legacyRate <= maxLegacyRate
      })
    );
  }

  const reasonCountMap = reasonArrayToMap(stats.reasons);
  for (const [reason, budget] of Object.entries(reasonBudgets)) {
    const numericBudget = toPositiveNumber(budget, 0);
    const actualCount = reasonCountMap.get(reason) || 0;
    checks.push(
      checkResult({
        id: `reason-budget-${reason}`,
        name: `Reason budget: ${reason}`,
        expected: `<= ${numericBudget}`,
        actual: String(actualCount),
        pass: actualCount <= numericBudget
      })
    );
  }

  return {
    passed: checks.every((check) => check.pass),
    checks,
    meta: {
      gateId: String(gateConfig.gateId || 'v2-cutover-fallback'),
      windowDays: stats.windowDays,
      totalLaunches: stats.totalEntries,
      legacyLaunches: stats.legacyEntries,
      excludedDryRunCount
    }
  };
};

const renderCheckStatus = (check) => {
  if (!check.pass) {
    return 'FAIL';
  }
  if (check.skipped) {
    return 'SKIP';
  }
  return 'PASS';
};

export const renderFallbackGateReport = ({ configPath, logPath, generatedAt, result, stats }) => {
  const lines = [];
  lines.push('# Legacy Fallback Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Log source: \`${logPath}\``);
  lines.push(
    `- Window: ${stats.windowStart.toISOString()} ~ ${stats.now.toISOString()} (${stats.windowDays} days)`
  );
  lines.push(`- Total launches in window: ${stats.totalEntries}`);
  lines.push(`- Legacy launches in window: ${stats.legacyEntries} (${(stats.legacyRate * 100).toFixed(2)}%)`);
  lines.push(`- Excluded dry-run launches: ${result.meta.excludedDryRunCount}`);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${renderCheckStatus(check)} |`);
  }
  lines.push('');
  lines.push('## Legacy reasons in window');
  lines.push('');
  if (!Array.isArray(stats.reasons) || stats.reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of stats.reasons) {
      lines.push(`- ${reason.key}: ${reason.count}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
};
