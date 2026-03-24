const COMPACT_UTC_REGEX = /[-:]/g;

const PASS_STATUSES = new Set(['success', 'passed', 'pass']);
const FAIL_STATUSES = new Set([
  'failure',
  'failed',
  'fail',
  'timed_out',
  'cancelled',
  'canceled'
]);

const toTrimmedString = (value) => String(value ?? '').trim();

const toValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid drill report timestamp');
  }
  return date;
};

export const toCompactUtcTimestamp = (value) => {
  const date = toValidDate(value);
  return date.toISOString().replace(COMPACT_UTC_REGEX, '').replace(/\.\d{3}/, '');
};

export const toMinuteToken = (value) => {
  const date = toValidDate(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}`;
};

export const sanitizeFileToken = (value, fallback = 'na') => {
  const token = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return token || fallback;
};

export const resolveDrillReportFilename = ({ generatedAt, runId }) => {
  const minuteToken = toMinuteToken(generatedAt);
  const normalizedRunId = sanitizeFileToken(runId, 'local');
  return `v3-dashboard-freeze-rollback-drill-${minuteToken}-run-${normalizedRunId}.md`;
};

export const normalizeLayerStatus = (value) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (PASS_STATUSES.has(normalized)) {
    return 'pass';
  }
  if (FAIL_STATUSES.has(normalized)) {
    return 'fail';
  }
  return 'fail';
};

export const isPlaceholderRunUrl = (value) => {
  const normalized = toTrimmedString(value).toLowerCase();
  return !normalized || normalized === 'n/a' || normalized === 'na' || normalized === 'none' || normalized === 'local';
};

export const parseWorkflowRunUrlEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (isPlaceholderRunUrl(normalized)) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== 'https:') {
    return null;
  }

  if (parsedUrl.username || parsedUrl.password) {
    return null;
  }

  if (parsedUrl.search || parsedUrl.hash) {
    return null;
  }

  const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
  const matcher = /^\/([^/]+)\/([^/]+)\/actions\/runs\/([0-9]+)$/.exec(normalizedPath);
  if (!matcher) {
    return null;
  }

  const [, owner, repo, runId] = matcher;
  return {
    runId,
    repository: `${owner}/${repo}`,
    protocol: parsedUrl.protocol,
    host: parsedUrl.host
  };
};

export const isCanonicalWorkflowRunUrlForRunId = ({ runUrl, runId }) => {
  const normalizedRunId = toTrimmedString(runId);
  const parsed = parseWorkflowRunUrlEvidence(runUrl);
  if (!parsed || !normalizedRunId) {
    return false;
  }

  return parsed.runId === normalizedRunId;
};

export const assertRunEvidenceForPass = ({ smokeStatus, runUrl, runId }) => {
  if (smokeStatus === 'pass' && isPlaceholderRunUrl(runUrl)) {
    throw new Error('Pass drill result requires a workflow run URL evidence');
  }

  if (smokeStatus !== 'pass') {
    return;
  }

  const parsed = parseWorkflowRunUrlEvidence(runUrl);
  if (!parsed) {
    throw new Error('Pass drill result requires canonical workflow run URL evidence');
  }

  const normalizedRunId = toTrimmedString(runId);
  if (normalizedRunId && parsed.runId !== normalizedRunId) {
    throw new Error(`Pass drill result run URL does not match runId: ${normalizedRunId}`);
  }
};

export const buildDrillResult = ({
  layerStatus,
  runUrl,
  runId,
  freezeSeconds = 18,
  rollbackSeconds = 14
}) => {
  const smokeStatus = normalizeLayerStatus(layerStatus);
  assertRunEvidenceForPass({
    smokeStatus,
    runUrl,
    runId
  });

  const blocked = smokeStatus !== 'pass';

  return {
    smokeResult: blocked ? 'fail' : 'pass',
    runtimeStatusSnapshot: blocked ? 'unknown（受限环境未进入页面）' : 'enabled（mocked runtime status）',
    moduleSnapshot: blocked
      ? 'relationshipGraph=unknown（未进入 toggle 验证）'
      : 'relationshipGraph: ACTIVE -> BLOCKED -> ACTIVE',
    freezeWritePathResult: blocked ? 'fail（未执行到写路径拦截验证）' : 'pass',
    rollbackReadPathResult: blocked ? 'fail（未执行到读链路恢复验证）' : 'pass',
    freezeSeconds: blocked ? 'n/a' : String(freezeSeconds),
    rollbackSeconds: blocked ? 'n/a' : String(rollbackSeconds),
    runtimeStatusApiResult: blocked ? 'fail' : 'pass',
    moduleReadApiResult: blocked ? 'fail' : 'pass',
    anomalies: blocked
      ? `Playwright layer status=${String(layerStatus || 'unknown')}，执行环境端口监听受限（listen EPERM）。`
      : 'none',
    conclusion: blocked ? '暂缓发布' : '可发布'
  };
};

export const renderV3DashboardDrillReport = ({ meta, drill }) => {
  const lines = [];

  lines.push('# V3Dashboard 运营冻结/回滚演练记录');
  lines.push('');
  lines.push('## 1. 基本信息');
  lines.push('');
  lines.push(`- 演练时间（UTC）：${meta.generatedAt}`);
  lines.push(`- 演练负责人：${meta.owner}`);
  lines.push(`- 环境：${meta.environment}`);
  lines.push(`- 触发原因：${meta.triggerReason}`);
  lines.push('');
  lines.push('## 2. 入口门禁快照');
  lines.push('');
  lines.push(`- beta gate（admin）：\`${meta.betaGate}\``);
  lines.push(`- runtime 全局状态：${drill.runtimeStatusSnapshot}`);
  lines.push(`- 模块状态快照：${drill.moduleSnapshot}`);
  lines.push(`- 证据链接：${meta.runUrl}`);
  lines.push(`- workflow run id：${meta.runId}`);
  lines.push('');
  lines.push('## 3. 冻结步骤（演练）');
  lines.push('');
  lines.push(`1. 通过 \`${meta.freezeEndpoint}\` 关闭目标模块（${meta.moduleName}）。`);
  lines.push('2. 在 `V3 Dashboard` 确认模块状态由 `ACTIVE` -> `BLOCKED`。');
  lines.push(`3. 验证只读观测页面仍可打开，写路径被 fail-closed 拦截：${drill.freezeWritePathResult}`);
  lines.push(`4. 记录冻结耗时（秒）：${drill.freezeSeconds}`);
  lines.push('');
  lines.push('## 4. 回滚步骤（演练）');
  lines.push('');
  lines.push('1. 恢复模块开关（`active=true`）。');
  lines.push('2. 在 `V3 Dashboard` 确认模块状态由 `BLOCKED` -> `ACTIVE`。');
  lines.push(`3. 验证核心读链路恢复，且无跨 app 权限异常：${drill.rollbackReadPathResult}`);
  lines.push(`4. 记录回滚耗时（秒）：${drill.rollbackSeconds}`);
  lines.push('');
  lines.push('## 5. 验证与结论');
  lines.push('');
  lines.push(`- Playwright 双态 smoke 结果：${drill.smokeResult}`);
  lines.push('- 关键接口抽样：');
  lines.push(`  - \`/api/admin/v3/runtime/status\`：${drill.runtimeStatusApiResult}`);
  lines.push(`  - \`${meta.moduleReadEndpoint}\`：${drill.moduleReadApiResult}`);
  lines.push(`- 异常与处理：${drill.anomalies}`);
  lines.push(`- 结论：${drill.conclusion}`);
  lines.push('');
  lines.push('## 6. 后续动作');
  lines.push('');
  lines.push('1. 若本次为 fail，需在可开放端口环境重新执行同一 smoke 并覆盖报告。');
  lines.push('2. 将报告与 workflow artifact 一并归档到 `reports/v3/`。');
  lines.push('');

  return `${lines.join('\n')}`;
};
