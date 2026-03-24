#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  evaluateTimeoutStabilityObservationGate,
  renderTimeoutStabilityObservationGateReport
} from './v2-p1-timeout-stability-observation-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v2-p1-timeout-stability-observation-gate.json';
const DEFAULT_SUMMARY_JSON_PATH = 'reports/v2-release-health-summary.json';
const DEFAULT_TIMEOUT_GATE_JSON_PATH = 'reports/v2-p1-escalation-timeout-gate.json';
const DEFAULT_REPORT_PATH = 'reports/v2-p1-timeout-stability-observation-gate.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v2-p1-timeout-stability-observation-gate.json';

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
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const summaryJsonPath = String(args['summary-json'] || DEFAULT_SUMMARY_JSON_PATH);
  const timeoutGateJsonPath = String(args['timeout-gate-json'] || DEFAULT_TIMEOUT_GATE_JSON_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);

  const config = await readJson(configPath);
  const summary = await readJson(summaryJsonPath);
  const timeoutGateResult = await readJson(timeoutGateJsonPath);

  const result = evaluateTimeoutStabilityObservationGate({
    summary,
    timeoutGateResult,
    config
  });
  const report = renderTimeoutStabilityObservationGateReport({
    generatedAt: now,
    configPath,
    summaryJsonPath,
    timeoutGateJsonPath,
    result
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');
  process.stdout.write(report);

  await ensureDirectoryForFile(outputJsonPath);
  await writeFile(
    outputJsonPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        configPath,
        summaryJsonPath,
        timeoutGateJsonPath,
        ...result
      },
      null,
      2
    ),
    'utf8'
  );

  if (!result.passed) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v2-p1-timeout-stability-observation-gate] ${message}\n`);
  process.exit(1);
});
