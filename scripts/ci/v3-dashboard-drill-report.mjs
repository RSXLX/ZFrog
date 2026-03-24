#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildDrillResult,
  renderV3DashboardDrillReport,
  resolveDrillReportFilename
} from './v3-dashboard-drill-report-lib.mjs';

const DEFAULT_PLAYWRIGHT_LAYER_REPORT = 'reports/v3/layers/playwright.json';
const DEFAULT_REPORT_DIR = 'reports/v3';
const DEFAULT_ENVIRONMENT = 'staging';
const DEFAULT_OWNER = 'QA Owner + Admin Owner';
const DEFAULT_TRIGGER_REASON = 'V3-RC-02 freeze/rollback drill';
const DEFAULT_MODULE_NAME = 'relationshipGraph';
const DEFAULT_BETA_GATE =
  'VITE_V3_DASHBOARD_BETA_ENABLED=true + __ZFROG_ADMIN_V3_DASHBOARD_BETA__=true';
const DEFAULT_FREEZE_ENDPOINT = '/api/admin/v3/runtime/modules/:module/toggle';
const DEFAULT_MODULE_READ_ENDPOINT = '/api/admin/v3/relationship-graph/frogs/:frogId';

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

const readJson = async (filePath) => {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
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

const buildRunUrl = ({ runUrl, serverUrl, repository, runId }) => {
  const explicit = String(runUrl || '').trim();
  if (explicit) {
    return explicit;
  }

  if (!serverUrl || !repository || !runId) {
    return 'n/a';
  }

  return `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${runId}`;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const layerReportPath = String(args['playwright-layer-report'] || DEFAULT_PLAYWRIGHT_LAYER_REPORT);
  const layerPayload = await readJson(layerReportPath);
  const layerStatus =
    String(layerPayload?.status || layerPayload?.outcome || layerPayload?.result || '').trim() || 'failure';

  const runId = String(args['run-id'] || process.env.GITHUB_RUN_ID || 'local').trim() || 'local';
  const runUrl = buildRunUrl({
    runUrl: args['run-url'],
    serverUrl: String(process.env.GITHUB_SERVER_URL || 'https://github.com').trim(),
    repository: String(process.env.GITHUB_REPOSITORY || '').trim(),
    runId
  });

  const reportPath =
    args.report ||
    path.join(
      DEFAULT_REPORT_DIR,
      resolveDrillReportFilename({
        generatedAt: now,
        runId
      })
    );

  const outputJsonPath =
    args['out-json'] || reportPath.replace(/\.md$/i, '.json');

  const freezeSeconds = Number.isFinite(Number(args['freeze-seconds']))
    ? Number(args['freeze-seconds'])
    : 18;
  const rollbackSeconds = Number.isFinite(Number(args['rollback-seconds']))
    ? Number(args['rollback-seconds'])
    : 14;

  const drill = buildDrillResult({
    layerStatus,
    runUrl,
    runId,
    freezeSeconds,
    rollbackSeconds
  });

  const report = renderV3DashboardDrillReport({
    meta: {
      generatedAt: now.toISOString(),
      owner: String(args.owner || DEFAULT_OWNER),
      environment: String(args.environment || DEFAULT_ENVIRONMENT),
      triggerReason: String(args['trigger-reason'] || DEFAULT_TRIGGER_REASON),
      runId,
      runUrl,
      moduleName: String(args.module || DEFAULT_MODULE_NAME),
      betaGate: String(args['beta-gate'] || DEFAULT_BETA_GATE),
      freezeEndpoint: String(args['freeze-endpoint'] || DEFAULT_FREEZE_ENDPOINT),
      moduleReadEndpoint: String(args['module-read-endpoint'] || DEFAULT_MODULE_READ_ENDPOINT)
    },
    drill
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
        runUrl,
        layerReportPath,
        layerStatus,
        drill
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  process.stdout.write(report);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-report] ${message}\n`);
  process.exit(1);
});
