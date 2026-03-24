import { finalizeV3DashboardDrillCloseout } from './v3-dashboard-drill-closeout-lib.mjs';

const DEFAULT_TASK_ID = 'V3-RC-02';

const toTrimmedString = (value) => String(value ?? '').trim();

const normalizeNewlines = (value) => String(value ?? '').replace(/\r\n/g, '\n');

export const applyV3DashboardDrillCloseoutPreview = ({
  runId,
  drillPayload,
  drillPayloadRaw,
  drillReportMd,
  backlogSnippet,
  backlogAppliedDoc,
  runManifest,
  artifactPaths,
  backlogDoc,
  closeoutPreviewDoc,
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
  const normalizedPreview = toTrimmedString(closeoutPreviewDoc);
  if (!normalizedPreview) {
    throw new Error('Closeout preview content is empty');
  }

  const closeout = finalizeV3DashboardDrillCloseout({
    runId,
    drillPayload,
    drillPayloadRaw,
    drillReportMd,
    backlogSnippet,
    backlogAppliedDoc,
    runManifest,
    artifactPaths,
    backlogDoc,
    taskId,
    reportsDir,
    expectedRunId,
    requirePublishable,
    now,
    maxManifestAgeHours,
    expectedServerUrl,
    expectedRepository,
    expectedRunAttempt,
    expectedRef,
    expectedSha
  });

  if (normalizeNewlines(closeout.updatedContent) !== normalizeNewlines(closeoutPreviewDoc)) {
    throw new Error(
      'Closeout preview does not match deterministic closeout output; regenerate preview before apply'
    );
  }

  return {
    ...closeout,
    appliedContent: closeout.updatedContent
  };
};
