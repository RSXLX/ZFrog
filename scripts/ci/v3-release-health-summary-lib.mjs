const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toNumberOrNull = (value) => {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : null;
};

const buildActionForCheck = (checkId) => {
  switch (checkId) {
    case 'defect-p0':
      return 'P0 缺陷未清零，暂停扩量并立即进入回滚判定。';
    case 'defect-p1':
      return 'P1 缺陷超预算，冻结新发布并补齐修复后再重跑 RC gate。';
    case 'defect-snapshot-freshness':
      return '缺陷快照过期，先刷新 triage 快照再继续发布判定。';
    case 'nightly-run-coverage':
      return '夜间样本不足，等待更多 schedule runs 后再判定连续稳定性。';
    case 'nightly-stability':
      return '连续成功次数不足，保持 V3 beta 小流量并持续回归。';
    case 'nightly-freshness':
      return '最近成功 run 不新鲜，先触发一次新的 matrix 并观察结果。';
    default:
      return '存在未分类失败项，需人工评估后再继续放量。';
  }
};

export const evaluateV3ReleaseHealth = ({ rcGatePayload, now }) => {
  const payload = isObject(rcGatePayload) ? rcGatePayload : {};
  const result = isObject(payload.result) ? payload.result : payload;

  const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const checks = Array.isArray(result.checks) ? result.checks : [];
  const failedChecks = checks.filter((check) => check?.pass === false);

  const checkMap = new Map(checks.filter((check) => isObject(check)).map((check) => [check.id, check]));

  const defectP0Pass = Boolean(checkMap.get('defect-p0')?.pass);
  const defectP1Pass = Boolean(checkMap.get('defect-p1')?.pass);
  const snapshotFreshPass = Boolean(checkMap.get('defect-snapshot-freshness')?.pass);
  const stabilityPass = Boolean(checkMap.get('nightly-stability')?.pass);
  const freshnessPass = Boolean(checkMap.get('nightly-freshness')?.pass);

  const rcPassed = Boolean(result.passed);
  const defectHealthy = defectP0Pass && defectP1Pass;
  const regressionHealthy = stabilityPass && freshnessPass;

  const healthLevel = rcPassed ? 'GREEN' : defectHealthy ? 'AMBER' : 'RED';

  const defectMeta = isObject(result?.meta?.defect) ? result.meta.defect : {};

  const actionItems = failedChecks.map((check) => ({
    checkId: toTrimmedString(check.id) || 'unknown',
    checkName: toTrimmedString(check.name) || 'Unknown check',
    action: buildActionForCheck(toTrimmedString(check.id))
  }));

  return {
    passed: rcPassed,
    healthLevel,
    generatedAt: safeNow.toISOString(),
    checks: checks.map((check) => ({
      id: toTrimmedString(check.id) || 'unknown',
      name: toTrimmedString(check.name) || 'Unknown check',
      expected: toTrimmedString(check.expected),
      actual: toTrimmedString(check.actual),
      pass: Boolean(check.pass)
    })),
    failedCheckCount: failedChecks.length,
    actionItems,
    source: {
      gateId: toTrimmedString(result?.meta?.gateId) || 'v3-rc-gate',
      workflowFile: toTrimmedString(result?.meta?.workflowFile) || 'unknown',
      configPath: toTrimmedString(payload?.configPath) || 'unknown',
      runSource: toTrimmedString(payload?.runSource) || 'unknown'
    },
    metrics: {
      defect: {
        p0Open: toNumberOrNull(defectMeta.p0Open),
        p1Open: toNumberOrNull(defectMeta.p1Open),
        p0Budget: toNumberOrNull(defectMeta.p0Budget),
        p1Budget: toNumberOrNull(defectMeta.p1Budget),
        snapshotUpdatedAt: toTrimmedString(defectMeta.snapshotUpdatedAt) || null,
        snapshotSource: toTrimmedString(defectMeta.snapshotSource) || 'unknown',
        snapshotHoursSinceUpdate: toNumberOrNull(defectMeta.hoursSinceSnapshot),
        snapshotFreshPass
      },
      regression: {
        consecutiveSuccesses: toNumberOrNull(result?.meta?.consecutiveSuccesses),
        requiredSuccesses: toNumberOrNull(result?.meta?.requiredSuccesses),
        latestSuccessAt: toTrimmedString(result?.meta?.latestSuccessAt) || null,
        latestSuccessUrl: toTrimmedString(result?.meta?.latestSuccessUrl) || null,
        stabilityPass,
        freshnessPass,
        regressionHealthy
      },
      defectHealthy
    }
  };
};

const renderMetricValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'n/a';
  }
  return String(value);
};

export const renderV3ReleaseHealthSummaryReport = ({ rcResultPath, summary }) => {
  const lines = [];
  lines.push('# V3 Release Health Summary');
  lines.push('');
  lines.push(`- Generated at: ${summary.generatedAt}`);
  lines.push(`- RC gate verdict: **${summary.passed ? 'PASS' : 'FAIL'}**`);
  lines.push(`- Health level: **${summary.healthLevel}**`);
  lines.push(`- Gate: \`${summary.source.gateId}\``);
  lines.push(`- Workflow: \`${summary.source.workflowFile}\``);
  lines.push(`- RC result source: \`${rcResultPath}\``);
  lines.push(`- RC run source: \`${summary.source.runSource}\``);
  lines.push('');
  lines.push('| Signal | Value |');
  lines.push('| --- | --- |');
  lines.push(`| P0 defects (open/budget) | ${renderMetricValue(summary.metrics.defect.p0Open)}/${renderMetricValue(summary.metrics.defect.p0Budget)} |`);
  lines.push(`| P1 defects (open/budget) | ${renderMetricValue(summary.metrics.defect.p1Open)}/${renderMetricValue(summary.metrics.defect.p1Budget)} |`);
  lines.push(
    `| Defect snapshot | ${renderMetricValue(summary.metrics.defect.snapshotSource)} @ ${renderMetricValue(
      summary.metrics.defect.snapshotUpdatedAt
    )} |`
  );
  lines.push(
    `| Nightly stability | ${renderMetricValue(summary.metrics.regression.consecutiveSuccesses)}/${renderMetricValue(
      summary.metrics.regression.requiredSuccesses
    )} consecutive success |`
  );
  lines.push(`| Latest successful run | ${renderMetricValue(summary.metrics.regression.latestSuccessAt)} |`);
  lines.push(`| Failed checks | ${summary.failedCheckCount} |`);
  lines.push('');

  if (summary.actionItems.length === 0) {
    lines.push('## Action Items');
    lines.push('');
    lines.push('- 当前无阻断项，可按 runbook 继续灰度扩量。');
  } else {
    lines.push('## Action Items');
    lines.push('');
    for (const actionItem of summary.actionItems) {
      lines.push(`- [${actionItem.checkId}] ${actionItem.checkName}: ${actionItem.action}`);
    }
  }

  if (summary.metrics.regression.latestSuccessUrl) {
    lines.push('');
    lines.push(`- Latest successful run URL: ${summary.metrics.regression.latestSuccessUrl}`);
  }

  return `${lines.join('\n')}\n`;
};
