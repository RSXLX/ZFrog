const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

export const getLatestSuccessfulRun = (runs) => {
  return runs.find((run) => run?.status === 'completed' && run?.conclusion === 'success') ?? null;
};

export const evaluateGate = ({ config, runs, now }) => {
  const defects = config.defectSnapshot ?? {};
  const defectBudget = config.defectBudget ?? {};
  const nightly = config.nightly ?? {};

  const p0Open = Number(defects.p0Open ?? Number.POSITIVE_INFINITY);
  const p1Open = Number(defects.p1Open ?? Number.POSITIVE_INFINITY);
  const p0Budget = Number(defectBudget.p0Open ?? 0);
  const p1Budget = Number(defectBudget.p1Open ?? 0);

  const consecutiveSuccesses = countConsecutiveSuccesses(runs);
  const requiredSuccesses = Number(nightly.requiredConsecutiveSuccesses ?? 1);
  const latestSuccess = getLatestSuccessfulRun(runs);
  const latestSuccessDate = getRunUpdatedAt(latestSuccess);
  const maxHoursSinceLatestSuccess = Number(nightly.maxHoursSinceLatestSuccess ?? 24);
  const hoursSinceLatestSuccess = latestSuccessDate
    ? (now.getTime() - latestSuccessDate.getTime()) / (60 * 60 * 1000)
    : Number.POSITIVE_INFINITY;

  const checks = [
    {
      id: 'defect-p0',
      name: 'P0 defects cleared',
      expected: `<= ${p0Budget}`,
      actual: String(p0Open),
      pass: Number.isFinite(p0Open) && p0Open <= p0Budget
    },
    {
      id: 'defect-p1',
      name: 'P1 defects cleared',
      expected: `<= ${p1Budget}`,
      actual: String(p1Open),
      pass: Number.isFinite(p1Open) && p1Open <= p1Budget
    },
    {
      id: 'nightly-stability',
      name: 'Nightly stability',
      expected: `${requiredSuccesses} consecutive success runs`,
      actual: `${consecutiveSuccesses} consecutive success runs`,
      pass: consecutiveSuccesses >= requiredSuccesses
    },
    {
      id: 'nightly-freshness',
      name: 'Nightly freshness',
      expected: `latest success <= ${maxHoursSinceLatestSuccess}h ago`,
      actual: Number.isFinite(hoursSinceLatestSuccess)
        ? `latest success ${hoursSinceLatestSuccess.toFixed(2)}h ago`
        : 'latest success not found',
      pass: Number.isFinite(hoursSinceLatestSuccess) && hoursSinceLatestSuccess <= maxHoursSinceLatestSuccess
    }
  ];

  return {
    passed: checks.every((item) => item.pass),
    checks,
    meta: {
      gateId: config.gateId ?? 'v2-rc',
      workflowFile: nightly.workflowFile ?? 'unknown',
      consecutiveSuccesses,
      requiredSuccesses,
      latestSuccessUrl: latestSuccess?.html_url ?? null,
      latestSuccessAt: latestSuccessDate ? latestSuccessDate.toISOString() : null,
      defectSnapshotUpdatedAt: defects.updatedAt ?? null,
      defectSnapshotSource: defects.source ?? 'unknown'
    }
  };
};

export const renderMarkdownReport = ({ configPath, runSource, generatedAt, result }) => {
  const lines = [];
  lines.push('# V2 RC Release Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Nightly Workflow: \`${result.meta.workflowFile}\``);
  lines.push(`- Run source: \`${runSource}\``);
  lines.push(`- Defect snapshot: \`${result.meta.defectSnapshotSource}\` @ \`${result.meta.defectSnapshotUpdatedAt ?? 'unknown'}\``);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${check.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  if (result.meta.latestSuccessUrl) {
    lines.push(`- Latest successful nightly run: ${result.meta.latestSuccessUrl}`);
  } else {
    lines.push('- Latest successful nightly run: none');
  }
  return `${lines.join('\n')}\n`;
};
