#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildTimeoutReminderComment,
  evaluateP1EscalationTimeoutGate,
  renderP1EscalationTimeoutGateReport
} from './v2-p1-escalation-timeout-gate-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v2-p1-escalation-timeout-gate.json';
const DEFAULT_REPORT_PATH = 'reports/v2-p1-escalation-timeout-gate.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v2-p1-escalation-timeout-gate.json';

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

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const asBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  return fallback;
};

const toNonNegativeInteger = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
};

const normalizeIssueState = (value) => {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === 'open' || normalized === 'closed' || normalized === 'all') {
    return normalized;
  }
  return 'open';
};

const isHttpUrl = (value) => /^https?:\/\//i.test(toTrimmedString(value));

const buildRuntimeContext = ({ args, repository }) => {
  const serverUrl = toTrimmedString(args['github-server-url'] || process.env.GITHUB_SERVER_URL || 'https://github.com');
  const workflowRunId = toTrimmedString(args['run-id'] || process.env.GITHUB_RUN_ID);
  const workflowRunAttempt = toTrimmedString(args['run-attempt'] || process.env.GITHUB_RUN_ATTEMPT);
  const providedRunUrl = toTrimmedString(args['workflow-run-url']);
  const computedRunUrl =
    serverUrl && repository && workflowRunId ? `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${workflowRunId}` : '';
  const workflowRunUrl = isHttpUrl(providedRunUrl) ? providedRunUrl : computedRunUrl;
  const providedArtifactsUrl = toTrimmedString(args['workflow-artifacts-url']);
  const computedArtifactsUrl = workflowRunUrl ? `${workflowRunUrl}#artifacts` : '';
  const workflowArtifactsUrl = isHttpUrl(providedArtifactsUrl) ? providedArtifactsUrl : computedArtifactsUrl;

  return {
    serverUrl,
    workflowRunId,
    workflowRunAttempt,
    workflowRunUrl,
    workflowArtifactsUrl
  };
};

const fetchIssues = async ({ repository, token, apiBase, labels, state }) => {
  const endpoint = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues`;
  const results = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const query = new URLSearchParams({
      state: normalizeIssueState(state),
      per_page: String(perPage),
      page: String(page)
    });
    if (labels) {
      query.set('labels', labels);
    }

    const url = `${endpoint}?${query.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to list issues (${response.status}): ${body}`);
    }

    const pageData = await response.json();
    if (!Array.isArray(pageData)) {
      throw new Error('Failed to list issues: response is not an array');
    }
    results.push(...pageData);

    if (pageData.length < perPage) {
      break;
    }
    page += 1;
  }

  return results;
};

const fetchIssueComments = async ({ repository, issueNumber, token, apiBase }) => {
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues/${issueNumber}/comments?per_page=100`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list issue comments #${issueNumber} (${response.status}): ${body}`);
  }

  return response.json();
};

const createIssueComment = async ({ repository, issueNumber, token, apiBase, body }) => {
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues/${issueNumber}/comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Failed to create timeout reminder comment #${issueNumber} (${response.status}): ${responseBody}`);
  }

  return response.json();
};

const hasCommentMarker = (comments, marker) => {
  if (!Array.isArray(comments) || !marker) {
    return false;
  }
  return comments.some((comment) => toTrimmedString(comment?.body).includes(marker));
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);
  const summaryJsonPath = toTrimmedString(args['summary-json']);

  const config = await readJson(configPath);

  const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com').trim();
  const runtimeContext = buildRuntimeContext({
    args,
    repository
  });

  let issues = [];
  let issueSource = 'none';
  if (args['open-issues-fixture']) {
    const fixturePath = String(args['open-issues-fixture']);
    issues = await readJson(fixturePath);
    issueSource = `fixture:${fixturePath}`;
  } else {
    if (!repository || !token) {
      throw new Error('Missing repository or token. Pass --open-issues-fixture for offline checks.');
    }

    const issueConfig = config?.issue ?? {};
    const queryLabels = toStringArray(issueConfig.queryLabels);
    const requiredLabels = toStringArray(issueConfig.requiredLabels);
    const fallbackLabels = toStringArray(issueConfig.labels);
    const labels = (queryLabels.length > 0 ? queryLabels : requiredLabels.length > 0 ? requiredLabels : fallbackLabels).join(',');
    const issueState = normalizeIssueState(issueConfig.queryState);

    issues = await fetchIssues({
      repository,
      token,
      apiBase,
      labels,
      state: issueState
    });
    issueSource = `github:${repository}#state=${issueState}${labels ? `#labels=${labels}` : ''}`;
  }

  let summary = null;
  let summarySource = 'none';
  if (summaryJsonPath) {
    summary = await readJson(summaryJsonPath);
    summarySource = `file:${summaryJsonPath}`;
  }

  const baseResult = evaluateP1EscalationTimeoutGate({
    issues: Array.isArray(issues) ? issues : [],
    config,
    now,
    summary
  });

  const reminderEnabled = asBoolean(args['apply-reminder'], asBoolean(config?.reminder?.enabled, true));
  const reminderMaxPerRun = toNonNegativeInteger(config?.reminder?.maxPerRun, 10);
  const maxReminderFailures = toNonNegativeInteger(config?.reminder?.maxReminderFailures, 0);

  const reminder = {
    enabled: reminderEnabled,
    attempted: 0,
    posted: 0,
    skipped: 0,
    failed: 0,
    maxPerRun: reminderMaxPerRun,
    maxReminderFailures
  };

  const overdueCandidates = baseResult.overdueIssues.slice(0, reminderMaxPerRun);
  if (!reminderEnabled) {
    for (const issue of overdueCandidates) {
      issue.reminderDecision = 'skip-reminder-disabled';
      reminder.skipped += 1;
    }
  } else if (!repository || !token) {
    for (const issue of overdueCandidates) {
      issue.reminderDecision = 'skip-missing-github-context';
      reminder.skipped += 1;
    }
  } else {
    for (const issue of overdueCandidates) {
      if (!Number.isInteger(issue.issueNumber) || issue.issueNumber <= 0) {
        issue.reminderDecision = 'skip-missing-issue-number';
        reminder.skipped += 1;
        continue;
      }

      reminder.attempted += 1;
      const reminderComment = buildTimeoutReminderComment({
        issue,
        runtimeContext,
        now
      });

      try {
        const comments = await fetchIssueComments({
          repository,
          issueNumber: issue.issueNumber,
          token,
          apiBase
        });
        if (hasCommentMarker(comments, reminderComment.marker)) {
          issue.reminderDecision = 'skip-existing-reminder';
          reminder.skipped += 1;
          continue;
        }

        const comment = await createIssueComment({
          repository,
          issueNumber: issue.issueNumber,
          token,
          apiBase,
          body: reminderComment.body
        });
        issue.reminderDecision = 'reminder-posted';
        issue.reminderCommentUrl = comment.html_url || comment.url || '';
        reminder.posted += 1;
      } catch (error) {
        issue.reminderDecision = 'reminder-failed';
        issue.reminderError = error instanceof Error ? error.message : String(error);
        reminder.failed += 1;
      }
    }
  }

  const reminderCheck = {
    id: 'reminder-failure-budget',
    name: 'Reminder failure budget',
    expected: `<= ${maxReminderFailures}`,
    actual: String(reminder.failed),
    pass: reminder.failed <= maxReminderFailures
  };

  const result = {
    ...baseResult,
    checks: [...baseResult.checks, reminderCheck],
    passed: baseResult.passed && reminderCheck.pass,
    reminder
  };

  const report = renderP1EscalationTimeoutGateReport({
    generatedAt: now,
    configPath,
    issueSource,
    summarySource,
    runtimeContext,
    result,
    reminder
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
        issueSource,
        summarySource,
        repository,
        runtimeContext,
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
  process.stderr.write(`[v2-p1-escalation-timeout-gate] ${message}\n`);
  process.exit(1);
});
