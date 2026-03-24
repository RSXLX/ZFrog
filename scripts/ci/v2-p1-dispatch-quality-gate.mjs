#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  evaluateDispatchQualityGate,
  renderDispatchQualityGateReport
} from './v2-p1-dispatch-quality-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v2-p1-dispatch-quality-gate.json';
const DEFAULT_DISPATCH_JSON_PATH = 'reports/v2-p1-escalation-dispatch.json';
const DEFAULT_REPORT_PATH = 'reports/v2-p1-dispatch-quality-gate.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v2-p1-dispatch-quality-gate.json';
const DEFAULT_IDEMPOTENCY_LOG_PATH = 'reports/v2-p1-escalation-dispatch-idempotency.jsonl';

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

const readJsonLines = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const records = [];
    let parseErrors = 0;
    for (const line of lines) {
      try {
        records.push(JSON.parse(line));
      } catch {
        parseErrors += 1;
      }
    }

    return {
      records,
      parseErrors,
      totalLines: lines.length,
      missing: false
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {
        records: [],
        parseErrors: 0,
        totalLines: 0,
        missing: true
      };
    }
    throw error;
  }
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
  const dispatchJsonPath = String(args['dispatch-json'] || DEFAULT_DISPATCH_JSON_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);

  const config = await readJson(configPath);
  const dispatchResult = await readJson(dispatchJsonPath);

  const idempotencyLogPath = String(
    args['idempotency-log'] ||
      dispatchResult?.idempotencyLogPath ||
      config?.idempotency?.logPath ||
      DEFAULT_IDEMPOTENCY_LOG_PATH
  );
  const idempotencyLog = await readJsonLines(idempotencyLogPath);

  const result = evaluateDispatchQualityGate({
    dispatchResult,
    config,
    idempotencyLog
  });
  const report = renderDispatchQualityGateReport({
    generatedAt: now,
    configPath,
    dispatchJsonPath,
    idempotencyLogPath,
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
        dispatchJsonPath,
        idempotencyLogPath,
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
  process.stderr.write(`[v2-p1-dispatch-quality-gate] ${message}\n`);
  process.exit(1);
});
