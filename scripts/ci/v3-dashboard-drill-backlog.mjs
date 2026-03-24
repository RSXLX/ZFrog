#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  evaluateDrillBacklogEvidence,
  renderV3DashboardBacklogSnippet
} from './v3-dashboard-drill-backlog-lib.mjs';

const DEFAULT_TASK_ID = 'V3-RC-02';
const DEFAULT_ENVIRONMENT = 'ci';

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

const resolveReportMdPath = ({ explicitReportMdPath, drillJsonPath }) => {
  if (explicitReportMdPath) {
    return String(explicitReportMdPath);
  }

  return String(drillJsonPath).replace(/\.json$/i, '.md');
};

const resolveOutputPath = ({ explicitOutputPath, drillJsonPath }) => {
  if (explicitOutputPath) {
    return String(explicitOutputPath);
  }

  return String(drillJsonPath).replace(/\.json$/i, '-backlog-snippet.md');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const drillJsonPath = String(args['drill-json'] || '').trim();
  if (!drillJsonPath) {
    throw new Error('Missing --drill-json <path>');
  }

  const reportMdPath = resolveReportMdPath({
    explicitReportMdPath: args['report-md'],
    drillJsonPath
  });
  const outputPath = resolveOutputPath({
    explicitOutputPath: args['out-md'],
    drillJsonPath
  });

  const payload = await readJson(drillJsonPath);
  const evidence = evaluateDrillBacklogEvidence({
    payload,
    expectedRunId: args['expected-run-id']
  });

  const snippet = renderV3DashboardBacklogSnippet({
    taskId: String(args['task-id'] || DEFAULT_TASK_ID),
    environment: String(args.environment || DEFAULT_ENVIRONMENT),
    evidence,
    reportMdPath,
    drillJsonPath
  });

  await ensureDirectoryForFile(outputPath);
  await writeFile(outputPath, snippet, 'utf8');
  process.stdout.write(snippet);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-backlog] ${message}\n`);
  process.exit(1);
});

