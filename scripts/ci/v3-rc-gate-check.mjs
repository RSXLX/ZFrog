#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { evaluateV3RcGate, normalizeRuns, renderV3RcGateReport } from './v3-rc-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v3-rc-gate.json';
const DEFAULT_REPORT_PATH = 'reports/v3/v3-rc-gate-report.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v3/v3-rc-gate.json';

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

const fetchWorkflowRuns = async ({ config, repository, token, apiBase }) => {
  const nightly = config.nightly ?? {};
  const workflowFile = nightly.workflowFile;
  if (!workflowFile) {
    throw new Error('nightly.workflowFile is required in gate config');
  }

  const sampleSize = Number(nightly.sampleSize ?? 20);
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/actions/workflows/${encodeURIComponent(
    workflowFile
  )}/runs?status=completed&per_page=${sampleSize}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${body}`);
  }

  return response.json();
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);

  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const config = await readJson(configPath);

  let runPayload;
  let runSource;

  if (args['runs-fixture']) {
    const fixturePath = String(args['runs-fixture']);
    runPayload = await readJson(fixturePath);
    runSource = `fixture:${fixturePath}`;
  } else {
    const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
    const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
    const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com').trim();

    if (!repository) {
      throw new Error('Missing repository. Pass --repo owner/name or set GITHUB_REPOSITORY.');
    }

    if (!token) {
      throw new Error('Missing GITHUB_TOKEN/GH_TOKEN. Use --runs-fixture for offline validation.');
    }

    runPayload = await fetchWorkflowRuns({ config, repository, token, apiBase });
    runSource = `github:${repository}`;
  }

  const runs = normalizeRuns(runPayload);
  const result = evaluateV3RcGate({
    config,
    runs,
    now
  });

  const report = renderV3RcGateReport({
    configPath,
    runSource,
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
        runSource,
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
  process.stderr.write(`[v3-rc-gate] ${message}\n`);
  process.exit(1);
});
