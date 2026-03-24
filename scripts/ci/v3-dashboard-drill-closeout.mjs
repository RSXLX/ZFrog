#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { finalizeV3DashboardDrillCloseout } from './v3-dashboard-drill-closeout-lib.mjs';
import {
  isV3DashboardDrillArtifactPathMatch,
  resolveV3DashboardDrillExpectedArtifactPaths,
  resolveV3DashboardDrillReportsDir,
  V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS
} from './v3-dashboard-drill-run-manifest-lib.mjs';

const DEFAULT_REPORTS_DIR = 'reports/v3';
const DEFAULT_TASK_ID = 'V3-RC-02';
const DEFAULT_BACKLOG_DOC = './docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md';

const toTrimmedString = (value) => String(value ?? '').trim();
const toPositiveNumber = (value, fieldName, fallbackValue) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return fallbackValue;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`Invalid ${fieldName} value`);
  }
  return numeric;
};

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = nextToken;
    index += 1;
  }
  return args;
};

const parseBooleanArg = (value, defaultValue) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (value === true) {
    return true;
  }

  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
};

const ensureDirectoryForFile = async (filePath) => {
  const directory = path.dirname(filePath);
  if (!directory || directory === '.') {
    return;
  }

  await mkdir(directory, {
    recursive: true
  });
};

const resolveArtifactPaths = ({ reportsDir, runId, args }) => {
  const prefix = resolveV3DashboardDrillReportsDir(reportsDir || DEFAULT_REPORTS_DIR);
  return {
    reportMdPath:
      toTrimmedString(args['report-md']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}.md`),
    drillJsonPath:
      toTrimmedString(args['drill-json']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}.json`),
    snippetMdPath:
      toTrimmedString(args['snippet-md']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}-backlog.md`),
    backlogAppliedPath:
      toTrimmedString(args['backlog-applied']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}-backlog-applied.md`),
    runManifestPath:
      toTrimmedString(args['run-manifest']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}-run-manifest.json`)
  };
};

const assertArtifactPathsMatchExpected = ({
  runId,
  reportsDir,
  artifactPaths
}) => {
  const expectedPaths = resolveV3DashboardDrillExpectedArtifactPaths({
    reportsDir,
    runId
  });
  const checks = [
    {
      label: 'report-md',
      actual: artifactPaths.reportMdPath,
      expected: expectedPaths.reportMdPath
    },
    {
      label: 'drill-json',
      actual: artifactPaths.drillJsonPath,
      expected: expectedPaths.drillJsonPath
    },
    {
      label: 'snippet-md',
      actual: artifactPaths.snippetMdPath,
      expected: expectedPaths.snippetMdPath
    },
    {
      label: 'backlog-applied',
      actual: artifactPaths.backlogAppliedPath,
      expected: expectedPaths.backlogAppliedPath
    },
    {
      label: 'run-manifest',
      actual: artifactPaths.runManifestPath,
      expected: expectedPaths.runManifestPath
    }
  ];

  for (const check of checks) {
    if (
      !isV3DashboardDrillArtifactPathMatch({
        actualPath: check.actual,
        expectedPath: check.expected
      })
    ) {
      throw new Error(
        `Unexpected --${check.label} path: expected ${check.expected}, got ${check.actual}`
      );
    }
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const runId = toTrimmedString(args['run-id']);
  if (!runId) {
    throw new Error('Missing --run-id <id>');
  }

  const reportsDir = resolveV3DashboardDrillReportsDir(args['reports-dir']) || DEFAULT_REPORTS_DIR;
  const taskId = toTrimmedString(args['task-id']) || DEFAULT_TASK_ID;
  const backlogDocPath = toTrimmedString(args['backlog-doc']) || DEFAULT_BACKLOG_DOC;
  const outputPath = toTrimmedString(args['out-doc']) || backlogDocPath;
  const requirePublishable = parseBooleanArg(args['require-publishable'], true);
  const maxManifestAgeHours = toPositiveNumber(
    args['max-manifest-age-hours'],
    'max-manifest-age-hours',
    V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.maxAgeHours
  );
  const expectedServerUrl =
    toTrimmedString(args['expected-server-url']) ||
    toTrimmedString(process.env.GITHUB_SERVER_URL);
  const expectedRepository =
    toTrimmedString(args['expected-repository']) ||
    toTrimmedString(process.env.GITHUB_REPOSITORY);
  const expectedRunAttempt =
    toTrimmedString(args['expected-run-attempt']) ||
    toTrimmedString(process.env.GITHUB_RUN_ATTEMPT);
  const expectedRef =
    toTrimmedString(args['expected-ref']) ||
    toTrimmedString(process.env.GITHUB_REF);
  const expectedSha =
    toTrimmedString(args['expected-sha']) ||
    toTrimmedString(process.env.GITHUB_SHA);
  const now = args.now ? new Date(toTrimmedString(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const artifactPaths = resolveArtifactPaths({
    reportsDir,
    runId,
    args
  });
  assertArtifactPathsMatchExpected({
    runId,
    reportsDir,
    artifactPaths
  });

  const [reportMdContent, drillJsonContent, snippetContent, backlogAppliedContent, runManifestContent, backlogDoc] =
    await Promise.all([
      readFile(artifactPaths.reportMdPath, 'utf8'),
      readFile(artifactPaths.drillJsonPath, 'utf8'),
      readFile(artifactPaths.snippetMdPath, 'utf8'),
      readFile(artifactPaths.backlogAppliedPath, 'utf8'),
      readFile(artifactPaths.runManifestPath, 'utf8'),
      readFile(backlogDocPath, 'utf8')
    ]);

  const closeout = finalizeV3DashboardDrillCloseout({
    runId,
    taskId,
    reportsDir,
    drillPayload: JSON.parse(drillJsonContent),
    drillPayloadRaw: drillJsonContent,
    drillReportMd: reportMdContent,
    backlogSnippet: snippetContent,
    backlogAppliedDoc: backlogAppliedContent,
    runManifest: JSON.parse(runManifestContent),
    artifactPaths: {
      reportMdPath: artifactPaths.reportMdPath,
      drillJsonPath: artifactPaths.drillJsonPath,
      snippetMdPath: artifactPaths.snippetMdPath,
      backlogAppliedPath: artifactPaths.backlogAppliedPath
    },
    backlogDoc,
    expectedRunId: args['expected-run-id'],
    requirePublishable,
    now,
    maxManifestAgeHours,
    expectedServerUrl,
    expectedRepository,
    expectedRunAttempt,
    expectedRef,
    expectedSha
  });

  await ensureDirectoryForFile(outputPath);
  await writeFile(outputPath, closeout.updatedContent, 'utf8');

  process.stdout.write(
    [
      `Closeout applied for task ${closeout.taskId}`,
      `runId=${closeout.runId}`,
      `publishable=${closeout.evidenceResult.publishable ? 'yes' : 'no'}`,
      `readyToClose=${closeout.evidenceResult.readyToClose ? 'yes' : 'no'}`,
      `output=${outputPath}`
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-closeout] ${message}\n`);
  process.exit(1);
});
