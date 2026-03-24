#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildV3DashboardDrillArtifactDigest,
  buildV3DashboardDrillRunManifest,
  isV3DashboardDrillArtifactPathMatch,
  resolveV3DashboardDrillExpectedArtifactPaths,
  resolveV3DashboardDrillReportsDir,
  V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS
} from './v3-dashboard-drill-run-manifest-lib.mjs';

const DEFAULT_REPORTS_DIR = 'reports/v3';

const toTrimmedString = (value) => String(value ?? '').trim();

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

const resolveDigestArtifactPaths = ({ reportsDir, runId, args }) => {
  const prefix = resolveV3DashboardDrillReportsDir(reportsDir || DEFAULT_REPORTS_DIR);
  return {
    drillReportMdPath:
      toTrimmedString(args['drill-report-md-path']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}.md`),
    drillJsonPath:
      toTrimmedString(args['drill-json-path']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}.json`),
    backlogSnippetPath:
      toTrimmedString(args['backlog-snippet-path']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}-backlog.md`),
    backlogAppliedPath:
      toTrimmedString(args['backlog-applied-path']) ||
      path.join(prefix, `v3-dashboard-freeze-rollback-drill-${runId}-backlog-applied.md`)
  };
};

const assertDigestArtifactPathsMatchExpected = ({
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
      label: 'drill report markdown path',
      actual: artifactPaths.drillReportMdPath,
      expected: expectedPaths.reportMdPath
    },
    {
      label: 'drill payload json path',
      actual: artifactPaths.drillJsonPath,
      expected: expectedPaths.drillJsonPath
    },
    {
      label: 'backlog snippet markdown path',
      actual: artifactPaths.backlogSnippetPath,
      expected: expectedPaths.snippetMdPath
    },
    {
      label: 'backlog applied markdown path',
      actual: artifactPaths.backlogAppliedPath,
      expected: expectedPaths.backlogAppliedPath
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
        `Unexpected ${check.label}: expected ${check.expected}, got ${check.actual}`
      );
    }
  }
};

const readDigestArtifact = async ({ label, filePath }) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read ${label} artifact for run manifest digest: ${filePath}`
    );
  }
};

const resolveRunUrlFromEnv = () => {
  const serverUrl = toTrimmedString(process.env.GITHUB_SERVER_URL);
  const repository = toTrimmedString(process.env.GITHUB_REPOSITORY);
  const runId = toTrimmedString(process.env.GITHUB_RUN_ID);
  if (!serverUrl || !repository || !runId) {
    return '';
  }

  return `${serverUrl}/${repository}/actions/runs/${runId}`;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const runId =
    toTrimmedString(args['run-id']) ||
    toTrimmedString(process.env.GITHUB_RUN_ID) ||
    'local';
  const runUrl =
    toTrimmedString(args['run-url']) ||
    resolveRunUrlFromEnv() ||
    'n/a';

  const reportsDir =
    resolveV3DashboardDrillReportsDir(args['reports-dir']) ||
    DEFAULT_REPORTS_DIR;
  const digestArtifactPaths = resolveDigestArtifactPaths({
    reportsDir,
    runId,
    args
  });
  assertDigestArtifactPathsMatchExpected({
    runId,
    reportsDir,
    artifactPaths: digestArtifactPaths
  });

  const [
    drillReportMdContent,
    drillJsonContent,
    backlogSnippetContent,
    backlogAppliedContent
  ] = await Promise.all([
    readDigestArtifact({
      label: 'drill report markdown',
      filePath: digestArtifactPaths.drillReportMdPath
    }),
    readDigestArtifact({
      label: 'drill payload json',
      filePath: digestArtifactPaths.drillJsonPath
    }),
    readDigestArtifact({
      label: 'backlog snippet markdown',
      filePath: digestArtifactPaths.backlogSnippetPath
    }),
    readDigestArtifact({
      label: 'backlog applied markdown',
      filePath: digestArtifactPaths.backlogAppliedPath
    })
  ]);

  const artifactDigests = {
    drillReportMd: buildV3DashboardDrillArtifactDigest({
      path: digestArtifactPaths.drillReportMdPath,
      content: drillReportMdContent
    }),
    drillJson: buildV3DashboardDrillArtifactDigest({
      path: digestArtifactPaths.drillJsonPath,
      content: drillJsonContent
    }),
    backlogSnippetMd: buildV3DashboardDrillArtifactDigest({
      path: digestArtifactPaths.backlogSnippetPath,
      content: backlogSnippetContent
    }),
    backlogAppliedMd: buildV3DashboardDrillArtifactDigest({
      path: digestArtifactPaths.backlogAppliedPath,
      content: backlogAppliedContent
    })
  };

  const outputPath =
    toTrimmedString(args['out-json']) ||
    resolveV3DashboardDrillExpectedArtifactPaths({
      reportsDir,
      runId
    }).runManifestPath;

  const manifest = buildV3DashboardDrillRunManifest({
    runId,
    runUrl,
    serverUrl:
      toTrimmedString(args['server-url']) ||
      toTrimmedString(process.env.GITHUB_SERVER_URL) ||
      'unknown',
    workflowName:
      toTrimmedString(args['workflow-name']) ||
      toTrimmedString(process.env.GITHUB_WORKFLOW) ||
      V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.workflowName,
    workflowFile:
      toTrimmedString(args['workflow-file']) ||
      V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.workflowFile,
    eventName:
      toTrimmedString(args['event-name']) ||
      toTrimmedString(process.env.GITHUB_EVENT_NAME) ||
      'unknown',
    repository:
      toTrimmedString(args.repository) ||
      toTrimmedString(process.env.GITHUB_REPOSITORY) ||
      'unknown',
    ref:
      toTrimmedString(args.ref) ||
      toTrimmedString(process.env.GITHUB_REF) ||
      'unknown',
    sha:
      toTrimmedString(args.sha) ||
      toTrimmedString(process.env.GITHUB_SHA) ||
      'unknown',
    runAttempt:
      toTrimmedString(args['run-attempt']) ||
      toTrimmedString(process.env.GITHUB_RUN_ATTEMPT) ||
      '1',
    generatedAt: toTrimmedString(args['generated-at']) || new Date().toISOString(),
    artifactDigests
  });

  await ensureDirectoryForFile(outputPath);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  process.stdout.write(
    [
      `Run manifest generated`,
      `runId=${manifest.runId}`,
      `runUrl=${manifest.runUrl}`,
      `serverUrl=${manifest.serverUrl}`,
      `workflow=${manifest.workflowName}`,
      `artifactDigests=${Object.keys(manifest.artifactDigests || {}).length}`,
      `output=${outputPath}`
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-run-manifest] ${message}\n`);
  process.exit(1);
});
