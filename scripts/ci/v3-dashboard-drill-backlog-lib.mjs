import {
  isCanonicalWorkflowRunUrlForRunId,
  isPlaceholderRunUrl
} from './v3-dashboard-drill-report-lib.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => String(value ?? '').trim();

const toValidDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid drill evidence generatedAt timestamp');
  }
  return date;
};

const toDateLabel = (value) => {
  const date = toValidDate(value);
  return date.toISOString().slice(0, 10);
};

const normalizeSmokeResult = (value) => {
  const normalized = toTrimmedString(value).toLowerCase();
  return normalized === 'pass' ? 'pass' : 'fail';
};

export const evaluateDrillBacklogEvidence = ({ payload, expectedRunId }) => {
  if (!isObject(payload)) {
    throw new Error('Drill evidence payload must be a JSON object');
  }

  const generatedAt = toTrimmedString(payload.generatedAt);
  if (!generatedAt) {
    throw new Error('Drill evidence missing generatedAt');
  }

  const runId = toTrimmedString(payload.runId);
  if (!runId) {
    throw new Error('Drill evidence missing runId');
  }

  const expected = toTrimmedString(expectedRunId);
  if (expected && expected !== runId) {
    throw new Error(`Drill evidence runId mismatch: expected ${expected}, got ${runId}`);
  }

  const runUrl = toTrimmedString(payload.runUrl) || 'n/a';
  const drill = isObject(payload.drill) ? payload.drill : null;
  if (!drill) {
    throw new Error('Drill evidence missing drill section');
  }

  const smokeResult = normalizeSmokeResult(drill.smokeResult);
  const conclusion = toTrimmedString(drill.conclusion);
  if (!conclusion) {
    throw new Error('Drill evidence missing drill.conclusion');
  }

  const publishable = smokeResult === 'pass' && conclusion === '可发布';
  const blocked = smokeResult !== 'pass' && conclusion === '暂缓发布';

  if (!publishable && !blocked) {
    throw new Error(
      `Drill evidence inconsistent: smokeResult=${smokeResult}, conclusion=${conclusion}`
    );
  }

  if (publishable && isPlaceholderRunUrl(runUrl)) {
    throw new Error('Publishable drill evidence requires a workflow run URL');
  }

  if (
    publishable &&
    !isCanonicalWorkflowRunUrlForRunId({
      runUrl,
      runId
    })
  ) {
    throw new Error('Publishable drill evidence requires canonical workflow run URL bound to runId');
  }

  return {
    generatedAt,
    generatedDate: toDateLabel(generatedAt),
    runId,
    runUrl,
    smokeResult,
    conclusion,
    publishable
  };
};

export const renderV3DashboardBacklogSnippet = ({
  taskId = 'V3-RC-02',
  environment = 'ci',
  evidence,
  reportMdPath,
  drillJsonPath
}) => {
  const nextAction = evidence.publishable
    ? '回写 backlog 执行记录中的 run URL 与 PASS 证据，正式关闭 `V3-RC-02`。'
    : '保持 `暂缓发布`，修复阻塞项后在可开放端口环境重跑并覆盖同类演练报告。';

  const lines = [];
  lines.push(`## ${taskId} 执行记录回写片段（自动生成）`);
  lines.push('');
  lines.push(
    `1. 已完成（\`${evidence.generatedDate}\`）：在 \`${environment}\` 触发 \`v3-beta-regression-matrix\` run \`${evidence.runId}\`（${evidence.runUrl}），\`V3Dashboard\` 双态 smoke=\`${evidence.smokeResult}\`，演练结论=\`${evidence.conclusion}\`。`
  );
  lines.push(`2. 已归档：\`${reportMdPath}\`、\`${drillJsonPath}\`。`);
  lines.push(`3. 下一点：${nextAction}`);
  lines.push('');
  return `${lines.join('\n')}`;
};
