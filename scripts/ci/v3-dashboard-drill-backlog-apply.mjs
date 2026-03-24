#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { applyV3DashboardBacklogSnippetToDoc } from './v3-dashboard-drill-backlog-apply-lib.mjs';

const DEFAULT_TASK_ID = 'V3-RC-02';
const DEFAULT_BACKLOG_DOC = './docs/02_开发计划/ZFrog_V3_Issue_Backlog_可开工版.md';

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

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const snippetPath = String(args['snippet-md'] || '').trim();
  if (!snippetPath) {
    throw new Error('Missing --snippet-md <path>');
  }

  const backlogDocPath = String(args['backlog-doc'] || DEFAULT_BACKLOG_DOC).trim();
  const outputPath = String(args['out-doc'] || backlogDocPath).trim();

  const [snippet, backlogDoc] = await Promise.all([
    readFile(snippetPath, 'utf8'),
    readFile(backlogDocPath, 'utf8')
  ]);

  const { meta, updatedContent } = applyV3DashboardBacklogSnippetToDoc({
    backlogDoc,
    snippet,
    taskId: String(args['task-id'] || DEFAULT_TASK_ID),
    expectedRunId: args['expected-run-id']
  });

  await ensureDirectoryForFile(outputPath);
  await writeFile(outputPath, updatedContent, 'utf8');

  process.stdout.write(
    [
      `Applied backlog snippet for task ${meta.taskId}`,
      `runId=${meta.runId}`,
      `conclusion=${meta.conclusion}`,
      `output=${outputPath}`
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v3-dashboard-drill-backlog-apply] ${message}\n`);
  process.exit(1);
});
