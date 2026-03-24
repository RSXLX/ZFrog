#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { renderArchivedReport, resolveArchiveFilename } from './v2-rc-gate-archive-lib.mjs';

const DEFAULT_REPORT_PATH = 'reports/v2-rc-gate-report.md';
const DEFAULT_ARCHIVE_DIR = 'reports/history/v2-rc-gate';

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

const buildRunUrl = ({ serverUrl, repository, runId }) => {
  if (!serverUrl || !repository || !runId) {
    return 'n/a';
  }
  return `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${runId}`;
};

const ensureDirectory = async (directoryPath) => {
  await mkdir(directoryPath, { recursive: true });
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();

  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const archiveDir = String(args['out-dir'] || DEFAULT_ARCHIVE_DIR);

  const reportContent = await readFile(reportPath, 'utf8');

  const runId = String(args['run-id'] || process.env.GITHUB_RUN_ID || '').trim() || 'local';
  const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
  const serverUrl = String(process.env.GITHUB_SERVER_URL || 'https://github.com').trim();
  const runUrl = String(args['run-url'] || buildRunUrl({ serverUrl, repository, runId })).trim() || 'n/a';

  const metadata = {
    archivedAt: now.toISOString(),
    workflow: String(process.env.GITHUB_WORKFLOW || 'local').trim() || 'local',
    runId,
    runUrl,
    ref: String(process.env.GITHUB_REF || 'local').trim() || 'local',
    sha: String(process.env.GITHUB_SHA || 'local').trim() || 'local'
  };

  const archiveFilename = resolveArchiveFilename({ generatedAt: now, runId: metadata.runId });
  const archivePath = path.join(archiveDir, archiveFilename);
  const latestPath = path.join(archiveDir, 'latest.md');

  await ensureDirectory(archiveDir);

  const archivedReport = renderArchivedReport({
    report: reportContent,
    metadata
  });

  await writeFile(archivePath, archivedReport, 'utf8');
  await writeFile(latestPath, archivedReport, 'utf8');

  process.stdout.write(`[v2-rc-gate-archive] archived report -> ${archivePath}\n`);
  process.stdout.write(`[v2-rc-gate-archive] updated latest -> ${latestPath}\n`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v2-rc-gate-archive] ${message}\n`);
  process.exit(1);
});
