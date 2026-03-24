#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertV3DashboardDrillEvidenceGate,
  evaluateV3DashboardDrillEvidenceGate,
  renderV3DashboardDrillEvidenceGateReport
} from './v3-dashboard-drill-evidence-gate-lib.mjs';
import {
  isV3DashboardDrillArtifactPathMatch,
  resolveV3DashboardDrillExpectedArtifactPaths,
  resolveV3DashboardDrillReportsDir,
  V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS
} from './v3-dashboard-drill-run-manifest-lib.mjs';

const DEFAULT_REPORTS_DIR = 'reports/v3';
const DEFAULT_TASK_ID = 'V3-RC-02';

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
  const requirePublishable =
    args['require-publishable'] === true || toTrimmedString(args['require-publishable']) === 'true';
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

  const reportPath =
    toTrimmedString(args.report) ||
    path.join(reportsDir, `v3-dashboard-freeze-rollback-drill-${runId}-evidence-gate.md`);
  const outputJsonPath =
    toTrimmedString(args['out-json']) || reportPath.replace(/\.md$/i, '.json');

  const [reportMdContent, drillJsonContent, snippetContent, appliedContent, runManifestContent] = await Promise.all([
    readFile(artifactPaths.reportMdPath, 'utf8'),
    readFile(artifactPaths.drillJsonPath, 'utf8'),
    readFile(artifactPaths.snippetMdPath, 'utf8'),
    readFile(artifactPaths.backlogAppliedPath, 'utf8'),
    readFile(artifactPaths.runManifestPath, 'utf8')
  ]);

  const result = evaluateV3DashboardDrillEvidenceGate({
    runId,
    taskId,
    reportsDir,
    drillPayload: JSON.parse(drillJsonContent),
    drillPayloadRaw: drillJsonContent,
    drillReportMd: reportMdContent,
    backlogSnippet: snippetContent,
    backlogAppliedDoc: appliedContent,
    runManifest: JSON.parse(runManifestContent),
    artifactPaths: {
      reportMdPath: artifactPaths.reportMdPath,
      drillJsonPath: artifactPaths.drillJsonPath,
      snippetMdPath: artifactPaths.snippetMdPath,
      backlogAppliedPath: artifactPaths.backlogAppliedPath
    },
    now,
    maxManifestAgeHours,
    expectedServerUrl,
    expectedRepository,
    expectedRunAttempt,
    expectedRef,
    expectedSha
  });

  const report = renderV3DashboardDrillEvidenceGateReport({
    result,
    generatedAt: now.toISOString(),
    requirePublishable
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');

  await ensureDirectoryForFile(outputJsonPath);
  await writeFile(
    outputJsonPath,
    `${JSON.stringify(
      {
        generatedAt: now.toISOString(),
        runId,
        taskId,
        requirePublishable,
        reportsDir,
        maxManifestAgeHours,
        expectedServerUrl: expectedServerUrl || 'n/a',
        expectedRepository: expectedRepository || 'n/a',
        expectedRunAttempt: expectedRunAttempt || 'n/a',
        expectedRef: expectedRef || 'n/a',
        expectedSha: expectedSha || 'n/a',
        artifacts: artifactPaths,
        result
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  assertV3DashboardDrillEvidenceGate({
    result,
    requirePublishable
  });

  process.stdout.write(report);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-evidence-gate] ${message}\n`);
  process.exit(1);
});
