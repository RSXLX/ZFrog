#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildDispatchIdempotencyKey,
  buildDispatchPlan,
  evaluateDispatchSummaryFreshness,
  isRetryableIssueCreateError,
  renderDispatchReport,
  runWithRetry,
  toRetryPolicy,
  validateDispatchSchema
} from './v2-p1-escalation-dispatch-lib.mjs';

const DEFAULT_CONFIG_PATH = '.github/release-gates/v2-p1-escalation-dispatch.json';
const DEFAULT_SUMMARY_PATH = 'reports/v2-release-health-summary.json';
const DEFAULT_REPORT_PATH = 'reports/v2-p1-escalation-dispatch.md';
const DEFAULT_OUTPUT_JSON_PATH = 'reports/v2-p1-escalation-dispatch.json';
const DEFAULT_IDEMPOTENCY_LOG_PATH = 'reports/v2-p1-escalation-dispatch-idempotency.jsonl';
const DISPATCH_LINK_COMMENT_MARKER_PREFIX = '<!-- v2-p1-dispatch-link:';

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

const readUtf8 = async (filePath) => readFile(filePath, 'utf8');

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

const resolvePathFromConfig = (configPath, targetPath) => {
  const candidate = toTrimmedString(targetPath);
  if (!candidate) {
    return '';
  }

  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  if (candidate.startsWith('./') || candidate.startsWith('../')) {
    const configDir = path.dirname(path.resolve(configPath));
    return path.resolve(configDir, candidate);
  }

  return path.resolve(process.cwd(), candidate);
};

const loadIssueTemplates = async ({ configPath, config }) => {
  const templateConfig = config?.issue?.template ?? {};
  const defaultPath = resolvePathFromConfig(configPath, templateConfig.defaultPath);
  const reasonPaths = templateConfig.reasonPaths && typeof templateConfig.reasonPaths === 'object' ? templateConfig.reasonPaths : {};

  const templates = {
    defaultTemplate: '',
    reasonTemplates: {}
  };

  if (defaultPath) {
    templates.defaultTemplate = await readUtf8(defaultPath);
  }

  for (const [reason, templatePath] of Object.entries(reasonPaths)) {
    const normalizedReason = toTrimmedString(reason);
    const resolvedPath = resolvePathFromConfig(configPath, templatePath);
    if (!normalizedReason || !resolvedPath) {
      continue;
    }
    templates.reasonTemplates[normalizedReason] = await readUtf8(resolvedPath);
  }

  return templates;
};

const readJsonLines = async (filePath) => {
  try {
    const content = await readUtf8(filePath);
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const appendJsonLines = async (filePath, records) => {
  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  await ensureDirectoryForFile(filePath);
  const payload = records.map((record) => JSON.stringify(record)).join('\n');
  await appendFile(filePath, `${payload}\n`, 'utf8');
};

const buildIdempotencyIndex = (records) => {
  const index = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }
    const key = toTrimmedString(record.key);
    if (!key) {
      continue;
    }
    index.set(key, record);
  }
  return index;
};

const fetchOpenIssues = async ({ repository, token, apiBase, labels }) => {
  const query = new URLSearchParams({
    state: 'open',
    per_page: '100'
  });
  if (labels) {
    query.set('labels', labels);
  }

  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list open issues (${response.status}): ${body}`);
  }

  return response.json();
};

const createIssue = async ({ repository, token, apiBase, payload }) => {
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Failed to create issue (${response.status}): ${body}`);
    error.status = response.status;
    error.responseBody = body;
    throw error;
  }

  return response.json();
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

const isHttpUrl = (value) => /^https?:\/\//i.test(toTrimmedString(value));

const parseIssueNumberFromUrl = (issueUrl) => {
  const text = toTrimmedString(issueUrl);
  if (!text) {
    return null;
  }
  const match = text.match(/\/issues\/(\d+)(?:[/?#]|$)/i);
  if (!match) {
    return null;
  }
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const resolveIssueNumber = (action) => {
  const issueNumber = Number(action?.issueNumber);
  if (Number.isInteger(issueNumber) && issueNumber > 0) {
    return issueNumber;
  }
  return parseIssueNumberFromUrl(action?.issueUrl);
};

const toWorkflowRunId = (value) => {
  const text = toTrimmedString(value);
  if (!text) {
    return '';
  }
  return text;
};

const buildRuntimeContext = ({ args, repository }) => {
  const serverUrl = toTrimmedString(args['github-server-url'] || process.env.GITHUB_SERVER_URL || 'https://github.com');
  const workflowRunId = toWorkflowRunId(args['run-id'] || process.env.GITHUB_RUN_ID);
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

const fetchIssueComments = async ({ repository, issueNumber, token, apiBase }) => {
  const query = new URLSearchParams({
    per_page: '100'
  });
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/issues/${issueNumber}/comments?${query.toString()}`;
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
    throw new Error(`Failed to create issue comment #${issueNumber} (${response.status}): ${responseBody}`);
  }

  return response.json();
};

const buildDispatchLinkCommentMarker = ({ reason, workflowRunId, workflowRunAttempt }) => {
  const encodedReason = encodeURIComponent(toTrimmedString(reason) || 'unknown-reason');
  const encodedRunId = encodeURIComponent(toTrimmedString(workflowRunId) || 'manual');
  const encodedAttempt = encodeURIComponent(toTrimmedString(workflowRunAttempt) || '1');
  return `${DISPATCH_LINK_COMMENT_MARKER_PREFIX}${encodedReason}:${encodedRunId}:${encodedAttempt} -->`;
};

const hasCommentMarker = (comments, marker) => {
  if (!Array.isArray(comments) || !marker) {
    return false;
  }
  return comments.some((comment) => toTrimmedString(comment?.body).includes(marker));
};

const buildDispatchLinkComment = ({ action, runtimeContext, now }) => {
  const marker = buildDispatchLinkCommentMarker({
    reason: action.reason,
    workflowRunId: runtimeContext.workflowRunId,
    workflowRunAttempt: runtimeContext.workflowRunAttempt
  });

  const lines = [];
  lines.push(marker);
  lines.push('## V2 P1 Dispatch Trace');
  lines.push('');
  lines.push(`- Reason: \`${action.reason}\``);
  lines.push(`- Linked at: ${now.toISOString()} (UTC)`);
  lines.push(`- Dispatch decision: \`${action.decision}\``);
  lines.push(
    `- Dispatch workflow run: ${runtimeContext.workflowRunUrl ? runtimeContext.workflowRunUrl : 'n/a'}`
  );
  lines.push(
    `- Dispatch workflow artifacts: ${
      runtimeContext.workflowArtifactsUrl ? runtimeContext.workflowArtifactsUrl : 'n/a'
    }`
  );
  lines.push('');
  lines.push('Evidence files:');
  lines.push('- `reports/v2-p1-escalation-dispatch.md`');
  lines.push('- `reports/v2-p1-escalation-dispatch.json`');
  lines.push('- `reports/v2-p1-dispatch-quality-gate.md`');
  lines.push('- `reports/v2-p1-dispatch-quality-gate.json`');
  lines.push('');

  return {
    marker,
    body: lines.join('\n')
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const configPath = String(args.config || DEFAULT_CONFIG_PATH);
  const summaryPath = String(args['summary-json'] || DEFAULT_SUMMARY_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const outputJsonPath = String(args['out-json'] || DEFAULT_OUTPUT_JSON_PATH);
  const apply = asBoolean(args.apply, false);
  const dryRun = !apply;
  const mode = dryRun ? 'dry-run' : 'apply';

  const config = await readJson(configPath);
  const summary = await readJson(summaryPath);
  const summaryFreshness = evaluateDispatchSummaryFreshness({
    summary,
    config,
    now
  });
  const templates = await loadIssueTemplates({
    configPath,
    config
  });

  const schemaValidation = validateDispatchSchema({
    config,
    templates
  });
  if (schemaValidation.warnings.length > 0) {
    for (const warning of schemaValidation.warnings) {
      process.stderr.write(`[v2-p1-escalation-dispatch][warn] ${warning}\n`);
    }
  }
  if (!schemaValidation.valid) {
    throw new Error(
      `Dispatch schema validation failed:\n${schemaValidation.errors.map((item) => `- ${item}`).join('\n')}`
    );
  }
  if (!summaryFreshness.passed) {
    for (const failedCheck of summaryFreshness.checks.filter((check) => !check.pass)) {
      process.stderr.write(
        `[v2-p1-escalation-dispatch][warn] summary freshness check failed: ${failedCheck.id} (${failedCheck.actual})\n`
      );
    }
  }

  const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com').trim();
  const runtimeContext = buildRuntimeContext({
    args,
    repository
  });
  const retryPolicy = toRetryPolicy({
    ...(config?.applyRetry ?? {}),
    maxAttempts: args['retry-attempts'] ?? config?.applyRetry?.maxAttempts,
    baseDelayMs: args['retry-base-ms'] ?? config?.applyRetry?.baseDelayMs,
    maxDelayMs: args['retry-max-ms'] ?? config?.applyRetry?.maxDelayMs,
    retryOnStatuses: config?.applyRetry?.retryOnStatuses
  });
  const idempotencyLogPath = resolvePathFromConfig(
    configPath,
    args['idempotency-log'] || config?.idempotency?.logPath || DEFAULT_IDEMPOTENCY_LOG_PATH
  );
  const idempotencyRecords = await readJsonLines(idempotencyLogPath);
  const idempotencyIndex = buildIdempotencyIndex(idempotencyRecords);
  const idempotencyAppendQueue = [];

  let openIssues = [];
  let openIssueSource = 'none';
  if (args['open-issues-fixture']) {
    const fixturePath = String(args['open-issues-fixture']);
    openIssues = await readJson(fixturePath);
    openIssueSource = `fixture:${fixturePath}`;
  } else if (repository && token) {
    const labels = Array.isArray(config?.issue?.labels) ? config.issue.labels.join(',') : '';
    openIssues = await fetchOpenIssues({
      repository,
      token,
      apiBase,
      labels
    });
    openIssueSource = `github:${repository}`;
  }

  const plan = buildDispatchPlan({
    summary,
    config: {
      ...config,
      summaryFreshness
    },
    openIssues: Array.isArray(openIssues) ? openIssues : [],
    templates,
    runtimeContext
  });

  const actions = plan.actions.map((action) => ({ ...action }));

  if (apply && plan.counts.create > 0) {
    if (!repository) {
      throw new Error('Missing repository. Pass --repo owner/name or set GITHUB_REPOSITORY.');
    }
    if (!token) {
      throw new Error('Missing GITHUB_TOKEN/GH_TOKEN when --apply is enabled.');
    }

    for (const action of actions) {
      if (action.decision !== 'create') {
        continue;
      }

      const idempotencyKey = buildDispatchIdempotencyKey({
        titlePrefix: plan.titlePrefix,
        reason: action.reason
      });
      action.idempotencyKey = idempotencyKey;

      const idempotencyHit = idempotencyIndex.get(idempotencyKey);
      const idempotencyIssueUrl = toTrimmedString(idempotencyHit?.issueUrl);
      const idempotencyIssueNumber = Number(idempotencyHit?.issueNumber);
      if (
        idempotencyHit &&
        (idempotencyHit.decision === 'created' || idempotencyHit.decision === 'skip-idempotency-log') &&
        (idempotencyIssueUrl || Number.isFinite(idempotencyIssueNumber))
      ) {
        action.decision = 'skip-idempotency-log';
        action.issueNumber = Number.isFinite(idempotencyIssueNumber) ? idempotencyIssueNumber : null;
        action.issueUrl = idempotencyIssueUrl;
        action.idempotencyLogHit = true;
        continue;
      }

      try {
        const attemptResult = await runWithRetry({
          task: () =>
            createIssue({
              repository,
              token,
              apiBase,
              payload: action.payload
            }),
          policy: retryPolicy,
          shouldRetry: (error, attempt, policy) =>
            isRetryableIssueCreateError(error, policy.retryStatusSet) && attempt < policy.maxAttempts
        });
        const issue = attemptResult.value;

        action.decision = 'created';
        action.issueNumber = Number(issue.number) || null;
        action.issueUrl = issue.html_url || issue.url || '';
        action.attempts = attemptResult.attempts;

        const logRecord = {
          recordedAt: new Date().toISOString(),
          key: idempotencyKey,
          repository,
          reason: action.reason,
          decision: 'created',
          issueNumber: action.issueNumber,
          issueUrl: action.issueUrl,
          attempts: action.attempts
        };
        idempotencyAppendQueue.push(logRecord);
        idempotencyIndex.set(idempotencyKey, logRecord);
      } catch (error) {
        action.decision = 'failed';
        action.error = error instanceof Error ? error.message : String(error);
        action.attempts = Number(error?.attempts) || retryPolicy.maxAttempts;

        const logRecord = {
          recordedAt: new Date().toISOString(),
          key: idempotencyKey,
          repository,
          reason: action.reason,
          decision: 'failed',
          attempts: action.attempts,
          error: action.error
        };
        idempotencyAppendQueue.push(logRecord);
      }
    }
  } else {
    for (const action of actions) {
      if (action.decision === 'create') {
        action.decision = 'would-create';
      }
    }
  }

  if (apply) {
    await appendJsonLines(idempotencyLogPath, idempotencyAppendQueue);
  }

  const actionsForLinkComment = actions.filter((action) =>
    ['created', 'skip-existing', 'skip-idempotency-log'].includes(action.decision)
  );
  let linkCommentStats = {
    linked: 0,
    skipped: 0,
    failed: 0
  };

  if (!apply) {
    for (const action of actionsForLinkComment) {
      action.linkCommentDecision = 'skip-dry-run';
      linkCommentStats.skipped += 1;
    }
  } else if (!repository || !token) {
    for (const action of actionsForLinkComment) {
      action.linkCommentDecision = 'skip-missing-github-context';
      linkCommentStats.skipped += 1;
    }
  } else if (!runtimeContext.workflowRunUrl && !runtimeContext.workflowArtifactsUrl) {
    for (const action of actionsForLinkComment) {
      action.linkCommentDecision = 'skip-missing-workflow-links';
      linkCommentStats.skipped += 1;
    }
  } else {
    for (const action of actionsForLinkComment) {
      const issueNumber = resolveIssueNumber(action);
      if (!issueNumber) {
        action.linkCommentDecision = 'skip-missing-issue-number';
        linkCommentStats.skipped += 1;
        continue;
      }

      const comment = buildDispatchLinkComment({
        action,
        runtimeContext,
        now
      });

      try {
        const comments = await fetchIssueComments({
          repository,
          issueNumber,
          token,
          apiBase
        });
        if (hasCommentMarker(comments, comment.marker)) {
          action.linkCommentDecision = 'skip-existing-link-comment';
          linkCommentStats.skipped += 1;
          continue;
        }

        const createdComment = await createIssueComment({
          repository,
          issueNumber,
          token,
          apiBase,
          body: comment.body
        });
        action.linkCommentDecision = 'linked';
        action.linkCommentUrl = createdComment.html_url || createdComment.url || '';
        linkCommentStats.linked += 1;
      } catch (error) {
        action.linkCommentDecision = 'link-failed';
        action.linkCommentError = error instanceof Error ? error.message : String(error);
        linkCommentStats.failed += 1;
      }
    }
  }

  const result = {
    generatedAt: now.toISOString(),
    mode,
    configPath,
    summaryPath,
    repository,
    openIssueSource,
    retryPolicy: {
      maxAttempts: retryPolicy.maxAttempts,
      baseDelayMs: retryPolicy.baseDelayMs,
      maxDelayMs: retryPolicy.maxDelayMs,
      retryOnStatuses: Array.from(retryPolicy.retryStatusSet.values())
    },
    idempotencyLogPath,
    idempotencyLogRecords: idempotencyRecords.length + idempotencyAppendQueue.length,
    summaryVerdict: summary?.verdict || 'n/a',
    summaryFreshness,
    runtimeContext,
    schemaValidation,
    linkCommentStats,
    actions
  };

  const report = renderDispatchReport({
    generatedAt: now,
    configPath,
    summaryPath,
    repository,
    mode,
    summary,
    plan,
    results: result
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');

  await ensureDirectoryForFile(outputJsonPath);
  await writeFile(outputJsonPath, JSON.stringify(result, null, 2), 'utf8');

  process.stdout.write(report);

  const missingOwnerRouteCount = actions.filter((action) => action.decision === 'skip-owner-route-missing').length;
  const failedCount = actions.filter((action) => action.decision === 'failed').length;
  const failOnMissingOwnerRoute = config?.issue?.failOnMissingOwnerRoute === true;
  if (
    failedCount > 0 ||
    (failOnMissingOwnerRoute && missingOwnerRouteCount > 0) ||
    linkCommentStats.failed > 0 ||
    !summaryFreshness.passed
  ) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v2-p1-escalation-dispatch] ${message}\n`);
  process.exit(1);
});
