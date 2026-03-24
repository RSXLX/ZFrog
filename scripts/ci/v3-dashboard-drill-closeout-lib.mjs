import {
  assertV3DashboardDrillEvidenceGate,
  evaluateV3DashboardDrillEvidenceGate
} from './v3-dashboard-drill-evidence-gate-lib.mjs';
import { applyV3DashboardBacklogSnippetToDoc } from './v3-dashboard-drill-backlog-apply-lib.mjs';

const DEFAULT_TASK_ID = 'V3-RC-02';

const toTrimmedString = (value) => String(value ?? '').trim();
const splitLines = (content) => String(content ?? '').split(/\r?\n/);

const findTaskSectionRange = ({ content, taskId }) => {
  const lines = splitLines(content);
  const heading = `### \`${taskId}\``;
  const start = lines.findIndex((line) => line.trim().startsWith(heading));
  if (start < 0) {
    throw new Error(`Task section not found in closeout doc: ${taskId}`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('### ') || lines[index].trim() === '---') {
      end = index;
      break;
    }
  }

  return {
    lines,
    start,
    end,
    sectionLines: lines.slice(start, end)
  };
};

const areLineArraysEqual = (left, right) =>
  left.length === right.length && left.every((line, index) => line === right[index]);

const isLineSubsequence = (target, source) => {
  if (target.length === 0) {
    return true;
  }

  let pointer = 0;
  for (const line of source) {
    if (line === target[pointer]) {
      pointer += 1;
      if (pointer >= target.length) {
        return true;
      }
    }
  }

  return false;
};

export const assertV3DashboardCloseoutDocChangeScope = ({
  backlogDoc,
  updatedBacklogDoc,
  taskId = DEFAULT_TASK_ID
}) => {
  const normalizedTaskId = toTrimmedString(taskId) || DEFAULT_TASK_ID;
  const before = findTaskSectionRange({
    content: backlogDoc,
    taskId: normalizedTaskId
  });
  const after = findTaskSectionRange({
    content: updatedBacklogDoc,
    taskId: normalizedTaskId
  });

  const beforePrefix = before.lines.slice(0, before.start);
  const afterPrefix = after.lines.slice(0, after.start);
  if (!areLineArraysEqual(beforePrefix, afterPrefix)) {
    throw new Error('Closeout update touched content before task section');
  }

  const beforeSuffix = before.lines.slice(before.end);
  const afterSuffix = after.lines.slice(after.end);
  if (!areLineArraysEqual(beforeSuffix, afterSuffix)) {
    throw new Error('Closeout update touched content after task section');
  }

  if (!isLineSubsequence(before.sectionLines, after.sectionLines)) {
    throw new Error('Closeout update must preserve existing task section lines (append-only)');
  }
};

export const finalizeV3DashboardDrillCloseout = ({
  runId,
  drillPayload,
  drillPayloadRaw,
  drillReportMd,
  backlogSnippet,
  backlogAppliedDoc,
  runManifest,
  artifactPaths,
  backlogDoc,
  taskId = DEFAULT_TASK_ID,
  reportsDir = 'reports/v3',
  expectedRunId,
  requirePublishable = true,
  now = new Date(),
  maxManifestAgeHours,
  expectedServerUrl,
  expectedRepository,
  expectedRunAttempt,
  expectedRef,
  expectedSha
}) => {
  const normalizedRunId = toTrimmedString(runId);
  if (!normalizedRunId) {
    throw new Error('Missing required runId for closeout');
  }

  const normalizedTaskId = toTrimmedString(taskId) || DEFAULT_TASK_ID;
  const normalizedExpectedRunId = toTrimmedString(expectedRunId) || normalizedRunId;

  const evidenceResult = evaluateV3DashboardDrillEvidenceGate({
    runId: normalizedRunId,
    taskId: normalizedTaskId,
    reportsDir,
    drillPayload,
    drillPayloadRaw,
    drillReportMd,
    backlogSnippet,
    backlogAppliedDoc,
    runManifest,
    artifactPaths,
    now,
    maxManifestAgeHours,
    expectedServerUrl,
    expectedRepository,
    expectedRunAttempt,
    expectedRef,
    expectedSha
  });

  assertV3DashboardDrillEvidenceGate({
    result: evidenceResult,
    requirePublishable
  });

  const applyResult = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc,
    snippet: backlogSnippet,
    taskId: normalizedTaskId,
    expectedRunId: normalizedExpectedRunId
  });

  if (applyResult.meta.runId !== evidenceResult.runId) {
    throw new Error(
      `Closeout runId mismatch between snippet and evidence gate: ${applyResult.meta.runId} vs ${evidenceResult.runId}`
    );
  }

  const expectedConclusion = evidenceResult.publishable ? '可发布' : '暂缓发布';
  if (applyResult.meta.conclusion !== expectedConclusion) {
    throw new Error('Closeout conclusion mismatch between snippet and evidence gate verdict');
  }

  if (applyResult.meta.publishable !== evidenceResult.publishable) {
    throw new Error('Closeout publishable flag mismatch between snippet and evidence gate verdict');
  }

  assertV3DashboardCloseoutDocChangeScope({
    backlogDoc,
    updatedBacklogDoc: applyResult.updatedContent,
    taskId: normalizedTaskId
  });

  return {
    taskId: normalizedTaskId,
    runId: normalizedRunId,
    requirePublishable: Boolean(requirePublishable),
    evidenceResult,
    meta: applyResult.meta,
    updatedContent: applyResult.updatedContent
  };
};
