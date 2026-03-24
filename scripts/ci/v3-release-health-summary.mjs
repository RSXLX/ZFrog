#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { evaluateV3ReleaseHealth, renderV3ReleaseHealthSummaryReport } from './v3-release-health-summary-lib.mjs';

const DEFAULT_RC_RESULT_PATH = 'reports/v3/v3-rc-gate.json';
const DEFAULT_REPORT_PATH = 'reports/v3/v3-release-health-summary.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v3/v3-release-health-summary.json';

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
  await mkdir(directory, { recursive: true });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const rcResultPath = String(args['rc-result'] || DEFAULT_RC_RESULT_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);

  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const rcGatePayload = await readJson(rcResultPath);
  const summary = evaluateV3ReleaseHealth({
    rcGatePayload,
    now
  });

  const report = renderV3ReleaseHealthSummaryReport({
    rcResultPath,
    summary
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');

  await ensureDirectoryForFile(outputJsonPath);
  await writeFile(
    outputJsonPath,
    `${JSON.stringify(
      {
        generatedAt: now.toISOString(),
        rcResultPath,
        summary
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
  process.stderr.write(`[v3-release-health-summary] ${message}\n`);
  process.exit(1);
});
