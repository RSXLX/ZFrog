#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { computeFallbackStats, parseEntryLine } from './legacy-fallback-report-lib.mjs';
import {
  evaluateFallbackGate,
  filterEntriesForGate,
  renderFallbackGateReport
} from './legacy-fallback-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v2-cutover-fallback-gate.json';
const DEFAULT_LOG_PATH = 'reports/cutover/dev-entry.log';
const DEFAULT_REPORT_PATH = 'reports/cutover/legacy-fallback-gate-report.md';

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

const readLogEntries = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8');
    return content
      .split('\n')
      .map((line) => parseEntryLine(line))
      .filter((entry) => entry !== null);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
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
  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const logPath = String(args.log || DEFAULT_LOG_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const config = await readJson(configPath);
  const windowDays = Number(args['window-days'] || config.windowDays || 7);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new Error('--window-days must be a positive number');
  }

  const rawEntries = await readLogEntries(logPath);
  const { entries, excludedDryRunCount } = filterEntriesForGate({
    entries: rawEntries,
    excludeDryRun: Boolean(config.excludeDryRun)
  });
  const stats = computeFallbackStats({
    entries,
    now,
    windowDays
  });

  const result = evaluateFallbackGate({
    stats,
    config,
    excludedDryRunCount
  });
  const report = renderFallbackGateReport({
    configPath,
    logPath,
    generatedAt: now,
    result,
    stats
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');
  process.stdout.write(report);

  if (!result.passed) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[legacy-fallback-gate] ${message}\n`);
  process.exit(1);
});
