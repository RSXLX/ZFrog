#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { computeFallbackStats, parseEntryLine, renderFallbackReport } from './legacy-fallback-report-lib.mjs';

const DEFAULT_LOG_PATH = 'reports/cutover/dev-entry.log';
const DEFAULT_REPORT_PATH = 'reports/cutover/legacy-fallback-report.md';
const DEFAULT_ARCHIVE_DIR = 'reports/cutover/archive';

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

const compactUtc = (value) => {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const logPath = String(args.log || DEFAULT_LOG_PATH);
  const reportPath = String(args.output || DEFAULT_REPORT_PATH);
  const archiveDir = String(args['archive-dir'] || DEFAULT_ARCHIVE_DIR);
  const windowDays = Number(args['window-days'] || 7);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new Error('--window-days must be a positive number');
  }

  const entries = await readLogEntries(logPath);
  const stats = computeFallbackStats({
    entries,
    now,
    windowDays
  });
  const report = renderFallbackReport({ stats, logPath });

  const archiveFilename = `legacy-fallback-${compactUtc(now)}.md`;
  const archivePath = path.join(archiveDir, archiveFilename);

  await ensureDirectoryForFile(reportPath);
  await mkdir(archiveDir, { recursive: true });

  await writeFile(reportPath, report, 'utf8');
  await writeFile(archivePath, report, 'utf8');

  process.stdout.write(report);
  process.stdout.write(`\n[legacy-fallback-report] archived -> ${archivePath}\n`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[legacy-fallback-report] ${message}\n`);
  process.exit(1);
});
