#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { evaluateV3BetaReleaseGate, renderV3BetaReleaseGateReport } from './v3-beta-release-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v3-beta-release-gate.json';
const DEFAULT_REPORT_PATH = 'reports/v3/v3-beta-release-gate-report.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v3/v3-beta-release-gate.json';

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[index + 1];
    let value;
    if (!nextToken || nextToken.startsWith('--')) {
      value = true;
    } else {
      value = nextToken;
      index += 1;
    }

    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const previousValue = args[key];
      if (Array.isArray(previousValue)) {
        previousValue.push(value);
      } else {
        args[key] = [previousValue, value];
      }
    } else {
      args[key] = value;
    }
  }

  return args;
};

const toArray = (value) => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

const loadReportsFromDirectory = async (reportsDirectoryPath) => {
  const entries = await readdir(reportsDirectoryPath, { withFileTypes: true });
  const reports = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(reportsDirectoryPath, entry.name);
    const parsed = await readJson(filePath);

    if (!parsed.layer) {
      parsed.layer = entry.name.replace(/\.json$/i, '');
    }

    if (!parsed.source) {
      parsed.source = filePath;
    }

    reports.push(parsed);
  }

  return reports;
};

const loadReportsFromLayerArgs = async (layerReportArgs) => {
  const reports = [];

  for (const definition of toArray(layerReportArgs)) {
    const rawDefinition = String(definition || '').trim();
    if (!rawDefinition) {
      continue;
    }

    const separatorIndex = rawDefinition.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex >= rawDefinition.length - 1) {
      throw new Error(`Invalid --layer-report "${rawDefinition}". Use --layer-report <layer>=<filePath>.`);
    }

    const layer = rawDefinition.slice(0, separatorIndex).trim();
    const filePath = rawDefinition.slice(separatorIndex + 1).trim();
    if (!layer || !filePath) {
      throw new Error(`Invalid --layer-report "${rawDefinition}". Use --layer-report <layer>=<filePath>.`);
    }

    const parsed = await readJson(filePath);
    parsed.layer = parsed.layer || layer;
    parsed.source = parsed.source || filePath;
    reports.push(parsed);
  }

  return reports;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);
  const dryRun = Boolean(args['dry-run']);

  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error(`Invalid --now timestamp: ${String(args.now)}`);
  }

  const config = await readJson(configPath);

  const reports = [];
  const reportSources = [];

  for (const reportsDirectoryPath of toArray(args['reports-dir'])) {
    const normalizedPath = String(reportsDirectoryPath);
    if (!normalizedPath) {
      continue;
    }
    const directoryReports = await loadReportsFromDirectory(normalizedPath);
    reports.push(...directoryReports);
    reportSources.push(`reports-dir:${normalizedPath}`);
  }

  const layerReports = await loadReportsFromLayerArgs(args['layer-report']);
  if (layerReports.length) {
    reports.push(...layerReports);
    reportSources.push(`layer-report:${layerReports.length}`);
  }

  if (!reports.length) {
    throw new Error('No layer reports were provided. Use --reports-dir or --layer-report.');
  }

  const result = evaluateV3BetaReleaseGate({
    config,
    reports,
    now,
    dryRun
  });

  const reportSource = reportSources.length ? reportSources.join(', ') : 'unknown';
  const report = renderV3BetaReleaseGateReport({
    configPath,
    reportSource,
    generatedAt: now,
    result
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');

  await ensureDirectoryForFile(outputJsonPath);
  await writeFile(
    outputJsonPath,
    `${JSON.stringify(
      {
        generatedAt: now.toISOString(),
        configPath,
        reportSource,
        result
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  process.stdout.write(report);

  if (!result.passed) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-beta-release-gate] ${message}\n`);
  process.exit(1);
});
