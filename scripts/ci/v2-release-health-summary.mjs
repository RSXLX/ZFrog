#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { evaluateGate, normalizeRuns } from './v2-rc-gate-lib.mjs';
import { computeFallbackStats, parseEntryLine } from '../cutover/legacy-fallback-report-lib.mjs';
import { evaluateFallbackGate, filterEntriesForGate } from '../cutover/legacy-fallback-gate-lib.mjs';
import {
  compareLegacyReasonWindows,
  evaluateDispatchQualityTrend,
  evaluateP1TimeoutStabilityTrend,
  evaluateP1TimeoutTrend,
  evaluateReleaseHealth,
  renderReleaseHealthReport
} from './v2-release-health-summary-lib.mjs';

const DEFAULT_SUMMARY_CONFIG_PATH = '.github/release-gates/v2-release-health-summary.json';
const DEFAULT_RC_CONFIG_PATH = '.github/release-gates/v2-rc-gate.json';
const DEFAULT_FALLBACK_CONFIG_PATH = '.github/release-gates/v2-cutover-fallback-gate.json';
const DEFAULT_FALLBACK_LOG_PATH = 'reports/cutover/dev-entry.log';
const DEFAULT_REPORT_PATH = 'reports/v2-release-health-summary.md';
const DEFAULT_SUMMARY_JSON_PATH = 'reports/v2-release-health-summary.json';

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

const fetchWorkflowRuns = async ({ workflowFile, sampleSize, repository, token, apiBase, label }) => {
  if (!workflowFile) {
    throw new Error(`${label || 'workflow'}.workflowFile is required`);
  }

  const normalizedSampleSize = Number(sampleSize ?? 12);
  const url = `${apiBase.replace(/\/$/, '')}/repos/${repository}/actions/workflows/${encodeURIComponent(
    workflowFile
  )}/runs?status=completed&per_page=${normalizedSampleSize}`;

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

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  const summaryConfigPath = String(args['summary-config'] || DEFAULT_SUMMARY_CONFIG_PATH);
  const rcConfigPath = String(args['rc-config'] || DEFAULT_RC_CONFIG_PATH);
  const fallbackConfigPath = String(args['fallback-config'] || DEFAULT_FALLBACK_CONFIG_PATH);
  const fallbackLogPath = String(args['fallback-log'] || DEFAULT_FALLBACK_LOG_PATH);
  const reportPath = String(args.report || DEFAULT_REPORT_PATH);
  const summaryJsonPath = String(args['summary-json'] || DEFAULT_SUMMARY_JSON_PATH);

  const now = args.now ? new Date(String(args.now)) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid --now timestamp');
  }

  const summaryConfig = await readJson(summaryConfigPath);
  const rcConfig = await readJson(rcConfigPath);
  const fallbackConfig = await readJson(fallbackConfigPath);
  const dispatchQualityConfig = summaryConfig.dispatchQuality ?? {};
  const timeoutConfig = summaryConfig.timeoutGate ?? {};
  const timeoutStabilityConfig = summaryConfig.timeoutStabilityGate ?? {};

  const windowDays = Number(args['window-days'] || summaryConfig.windowDays || fallbackConfig.windowDays || 7);
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    throw new Error('--window-days must be a positive number');
  }

  const trackReasonIncrease = asBoolean(
    args['track-reason-increase'],
    asBoolean(summaryConfig.attention?.trackReasonIncrease, true)
  );
  const failOnReasonIncrease = asBoolean(
    args['fail-on-reason-increase'],
    asBoolean(summaryConfig.attention?.failOnReasonIncrease, false)
  );
  const trackConsecutiveReasonIncrease = asBoolean(
    args['track-consecutive-reason-increase'],
    asBoolean(summaryConfig.attention?.trackConsecutiveReasonIncrease, true)
  );
  const failOnConsecutiveReasonIncrease = asBoolean(
    args['fail-on-consecutive-reason-increase'],
    asBoolean(summaryConfig.attention?.failOnConsecutiveReasonIncrease, false)
  );
  const dispatchQualityTrackConsecutiveFailureWeeks = asBoolean(
    args['dispatch-quality-track-consecutive-failure-weeks'],
    asBoolean(dispatchQualityConfig.trackConsecutiveFailureWeeks, true)
  );
  const dispatchQualityFailOnConsecutiveFailureWeeks = asBoolean(
    args['dispatch-quality-fail-on-consecutive-failure-weeks'],
    asBoolean(dispatchQualityConfig.failOnConsecutiveFailureWeeks, true)
  );
  const dispatchQualityFailOnLatestFailure = asBoolean(
    args['dispatch-quality-fail-on-latest-failure'],
    asBoolean(dispatchQualityConfig.failOnLatestFailure, true)
  );
  const timeoutTrackConsecutiveFailureWeeks = asBoolean(
    args['timeout-track-consecutive-failure-weeks'],
    asBoolean(timeoutConfig.trackConsecutiveFailureWeeks, true)
  );
  const timeoutFailOnConsecutiveFailureWeeks = asBoolean(
    args['timeout-fail-on-consecutive-failure-weeks'],
    asBoolean(timeoutConfig.failOnConsecutiveFailureWeeks, true)
  );
  const timeoutFailOnLatestFailure = asBoolean(
    args['timeout-fail-on-latest-failure'],
    asBoolean(timeoutConfig.failOnLatestFailure, false)
  );
  const timeoutStabilityTrackConsecutiveFailureWeeks = asBoolean(
    args['timeout-stability-track-consecutive-failure-weeks'],
    asBoolean(timeoutStabilityConfig.trackConsecutiveFailureWeeks, true)
  );
  const timeoutStabilityFailOnConsecutiveFailureWeeks = asBoolean(
    args['timeout-stability-fail-on-consecutive-failure-weeks'],
    asBoolean(timeoutStabilityConfig.failOnConsecutiveFailureWeeks, true)
  );
  const timeoutStabilityFailOnLatestFailure = asBoolean(
    args['timeout-stability-fail-on-latest-failure'],
    asBoolean(timeoutStabilityConfig.failOnLatestFailure, false)
  );

  const consecutiveIncreaseWindows = Number(
    args['consecutive-increase-windows'] || summaryConfig.attention?.consecutiveIncreaseWindows || 2
  );
  if (!Number.isFinite(consecutiveIncreaseWindows) || consecutiveIncreaseWindows <= 0) {
    throw new Error('--consecutive-increase-windows must be a positive number');
  }
  const dispatchQualityConsecutiveFailureWeeks = Number(
    args['dispatch-quality-consecutive-failure-weeks'] || dispatchQualityConfig.consecutiveFailureWeeks || 2
  );
  if (!Number.isFinite(dispatchQualityConsecutiveFailureWeeks) || dispatchQualityConsecutiveFailureWeeks <= 0) {
    throw new Error('--dispatch-quality-consecutive-failure-weeks must be a positive number');
  }
  const timeoutConsecutiveFailureWeeks = Number(
    args['timeout-consecutive-failure-weeks'] || timeoutConfig.consecutiveFailureWeeks || 2
  );
  if (!Number.isFinite(timeoutConsecutiveFailureWeeks) || timeoutConsecutiveFailureWeeks <= 0) {
    throw new Error('--timeout-consecutive-failure-weeks must be a positive number');
  }
  const timeoutStabilityConsecutiveFailureWeeks = Number(
    args['timeout-stability-consecutive-failure-weeks'] || timeoutStabilityConfig.consecutiveFailureWeeks || 2
  );
  if (!Number.isFinite(timeoutStabilityConsecutiveFailureWeeks) || timeoutStabilityConsecutiveFailureWeeks <= 0) {
    throw new Error('--timeout-stability-consecutive-failure-weeks must be a positive number');
  }

  let runPayload;
  let rcRunSource;
  if (args['rc-runs-fixture']) {
    const fixturePath = String(args['rc-runs-fixture']);
    runPayload = await readJson(fixturePath);
    rcRunSource = `fixture:${fixturePath}`;
  } else {
    const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
    const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
    const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com');

    if (!repository) {
      throw new Error('Missing repository. Pass --repo owner/name or set GITHUB_REPOSITORY.');
    }
    if (!token) {
      throw new Error('Missing GITHUB_TOKEN/GH_TOKEN. Use --rc-runs-fixture for offline validation.');
    }

    runPayload = await fetchWorkflowRuns({
      workflowFile: rcConfig?.nightly?.workflowFile,
      sampleSize: rcConfig?.nightly?.sampleSize ?? 12,
      repository,
      token,
      apiBase,
      label: 'rc-config.nightly'
    });
    rcRunSource = `github:${repository}`;
  }

  const rcRuns = normalizeRuns(runPayload);
  const rcResult = evaluateGate({
    config: rcConfig,
    runs: rcRuns,
    now
  });

  const rawEntries = await readLogEntries(fallbackLogPath);
  const { entries, excludedDryRunCount } = filterEntriesForGate({
    entries: rawEntries,
    excludeDryRun: Boolean(fallbackConfig.excludeDryRun)
  });

  const fallbackStats = computeFallbackStats({
    entries,
    now,
    windowDays
  });

  const fallbackResult = evaluateFallbackGate({
    stats: fallbackStats,
    config: fallbackConfig,
    excludedDryRunCount
  });

  let dispatchQualityRunPayload;
  let dispatchQualityRunSource = 'none';
  if (args['dispatch-quality-runs-fixture']) {
    const fixturePath = String(args['dispatch-quality-runs-fixture']);
    dispatchQualityRunPayload = await readJson(fixturePath);
    dispatchQualityRunSource = `fixture:${fixturePath}`;
  } else {
    const dispatchQualityWorkflowFile = String(dispatchQualityConfig.workflowFile || '').trim();
    if (dispatchQualityWorkflowFile) {
      const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
      const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com');
      if (!repository || !token) {
        dispatchQualityRunPayload = [];
        dispatchQualityRunSource = 'none:missing-github-context';
      } else {
        dispatchQualityRunPayload = await fetchWorkflowRuns({
          workflowFile: dispatchQualityWorkflowFile,
          sampleSize: dispatchQualityConfig.sampleSize ?? 12,
          repository,
          token,
          apiBase,
          label: 'summary-config.dispatchQuality'
        });
        dispatchQualityRunSource = `github:${repository}`;
      }
    }
  }
  const dispatchQualityRuns = normalizeRuns(dispatchQualityRunPayload);
  const dispatchQualityResult = evaluateDispatchQualityTrend({
    runs: dispatchQualityRuns,
    events: Array.isArray(dispatchQualityConfig.events) ? dispatchQualityConfig.events : ['schedule'],
    trackConsecutiveFailureWeeks: dispatchQualityTrackConsecutiveFailureWeeks,
    consecutiveFailureWeeks: dispatchQualityConsecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks: dispatchQualityFailOnConsecutiveFailureWeeks,
    failOnLatestFailure: dispatchQualityFailOnLatestFailure
  });

  let timeoutRunPayload;
  let timeoutRunSource = 'none';
  if (args['timeout-runs-fixture']) {
    const fixturePath = String(args['timeout-runs-fixture']);
    timeoutRunPayload = await readJson(fixturePath);
    timeoutRunSource = `fixture:${fixturePath}`;
  } else {
    const timeoutWorkflowFile = String(timeoutConfig.workflowFile || '').trim();
    if (timeoutWorkflowFile) {
      const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
      const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com');
      if (!repository || !token) {
        timeoutRunPayload = [];
        timeoutRunSource = 'none:missing-github-context';
      } else {
        timeoutRunPayload = await fetchWorkflowRuns({
          workflowFile: timeoutWorkflowFile,
          sampleSize: timeoutConfig.sampleSize ?? 12,
          repository,
          token,
          apiBase,
          label: 'summary-config.timeoutGate'
        });
        timeoutRunSource = `github:${repository}`;
      }
    }
  }
  const timeoutRuns = normalizeRuns(timeoutRunPayload);
  const timeoutResult = evaluateP1TimeoutTrend({
    runs: timeoutRuns,
    events: Array.isArray(timeoutConfig.events) ? timeoutConfig.events : ['schedule'],
    trackConsecutiveFailureWeeks: timeoutTrackConsecutiveFailureWeeks,
    consecutiveFailureWeeks: timeoutConsecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks: timeoutFailOnConsecutiveFailureWeeks,
    failOnLatestFailure: timeoutFailOnLatestFailure
  });

  let timeoutStabilityRunPayload;
  let timeoutStabilityRunSource = 'none';
  if (args['timeout-stability-runs-fixture']) {
    const fixturePath = String(args['timeout-stability-runs-fixture']);
    timeoutStabilityRunPayload = await readJson(fixturePath);
    timeoutStabilityRunSource = `fixture:${fixturePath}`;
  } else {
    const timeoutStabilityWorkflowFile = String(timeoutStabilityConfig.workflowFile || '').trim();
    if (timeoutStabilityWorkflowFile) {
      const repository = String(args.repo || process.env.GITHUB_REPOSITORY || '').trim();
      const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
      const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com');
      if (!repository || !token) {
        timeoutStabilityRunPayload = [];
        timeoutStabilityRunSource = 'none:missing-github-context';
      } else {
        timeoutStabilityRunPayload = await fetchWorkflowRuns({
          workflowFile: timeoutStabilityWorkflowFile,
          sampleSize: timeoutStabilityConfig.sampleSize ?? 12,
          repository,
          token,
          apiBase,
          label: 'summary-config.timeoutStabilityGate'
        });
        timeoutStabilityRunSource = `github:${repository}`;
      }
    }
  }
  const timeoutStabilityRuns = normalizeRuns(timeoutStabilityRunPayload);
  const timeoutStabilityResult = evaluateP1TimeoutStabilityTrend({
    runs: timeoutStabilityRuns,
    events: Array.isArray(timeoutStabilityConfig.events) ? timeoutStabilityConfig.events : ['schedule'],
    trackConsecutiveFailureWeeks: timeoutStabilityTrackConsecutiveFailureWeeks,
    consecutiveFailureWeeks: timeoutStabilityConsecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks: timeoutStabilityFailOnConsecutiveFailureWeeks,
    failOnLatestFailure: timeoutStabilityFailOnLatestFailure
  });

  const reasonComparison = compareLegacyReasonWindows({
    entries,
    now,
    windowDays,
    trendWindows: consecutiveIncreaseWindows
  });

  const health = evaluateReleaseHealth({
    rcResult,
    fallbackResult,
    dispatchQualityResult,
    timeoutResult,
    timeoutStabilityResult,
    reasonComparison,
    reasonBudgets: fallbackConfig.reasonBudgets,
    trackReasonIncrease,
    failOnReasonIncrease,
    trackConsecutiveReasonIncrease,
    consecutiveIncreaseWindows,
    failOnConsecutiveReasonIncrease
  });

  const report = renderReleaseHealthReport({
    generatedAt: now,
    summaryConfigPath,
    rcConfigPath,
    fallbackConfigPath,
    dispatchQualityConfig: String(dispatchQualityConfig.workflowFile || '').trim(),
    timeoutConfig: String(timeoutConfig.workflowFile || '').trim(),
    timeoutStabilityConfig: String(timeoutStabilityConfig.workflowFile || '').trim(),
    fallbackLogPath,
    rcRunSource,
    dispatchQualityRunSource,
    timeoutRunSource,
    timeoutStabilityRunSource,
    rcResult,
    fallbackResult,
    dispatchQualityResult,
    timeoutResult,
    timeoutStabilityResult,
    reasonComparison,
    health
  });

  await ensureDirectoryForFile(reportPath);
  await writeFile(reportPath, report, 'utf8');
  await ensureDirectoryForFile(summaryJsonPath);
  await writeFile(
    summaryJsonPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        verdict: health.passed ? 'PASS' : 'FAIL',
        rcRunSource,
        rcPassed: health.rcPassed,
        fallbackPassed: health.fallbackPassed,
        dispatchQualityRunSource,
        dispatchQualityPassed: health.dispatchQualityPassed,
        dispatchQualityLatestRunFailed: health.dispatchQualityLatestRunFailed,
        dispatchQualityConsecutiveFailureDetected: health.dispatchQualityConsecutiveFailureDetected,
        dispatchQualityConsecutiveFailedWeeks: health.dispatchQualityConsecutiveFailedWeeks,
        dispatchQualityConsecutivePassedWeeks: health.dispatchQualityConsecutivePassedWeeks,
        timeoutRunSource,
        timeoutPassed: health.timeoutPassed,
        timeoutLatestRunFailed: health.timeoutLatestRunFailed,
        timeoutConsecutiveFailureDetected: health.timeoutConsecutiveFailureDetected,
        timeoutConsecutiveFailedWeeks: health.timeoutConsecutiveFailedWeeks,
        timeoutConsecutivePassedWeeks: health.timeoutConsecutivePassedWeeks,
        timeoutStabilityRunSource,
        timeoutStabilityPassed: health.timeoutStabilityPassed,
        timeoutStabilityLatestRunFailed: health.timeoutStabilityLatestRunFailed,
        timeoutStabilityConsecutiveFailureDetected: health.timeoutStabilityConsecutiveFailureDetected,
        timeoutStabilityConsecutiveFailedWeeks: health.timeoutStabilityConsecutiveFailedWeeks,
        timeoutStabilityConsecutivePassedWeeks: health.timeoutStabilityConsecutivePassedWeeks,
        dispatchQualityLatestRun: dispatchQualityResult.latestRun
          ? {
              event: dispatchQualityResult.latestRun.event,
              conclusion: dispatchQualityResult.latestRun.conclusion,
              updatedAt: dispatchQualityResult.latestRun.updatedAtIso,
              url: dispatchQualityResult.latestRun.url
            }
          : null,
        timeoutLatestRun: timeoutResult.latestRun
          ? {
              event: timeoutResult.latestRun.event,
              conclusion: timeoutResult.latestRun.conclusion,
              updatedAt: timeoutResult.latestRun.updatedAtIso,
              url: timeoutResult.latestRun.url
            }
          : null,
        timeoutStabilityLatestRun: timeoutStabilityResult.latestRun
          ? {
              event: timeoutStabilityResult.latestRun.event,
              conclusion: timeoutStabilityResult.latestRun.conclusion,
              updatedAt: timeoutStabilityResult.latestRun.updatedAtIso,
              url: timeoutStabilityResult.latestRun.url
            }
          : null,
        reasonIncreaseDetected: health.reasonIncreaseDetected,
        consecutiveReasonIncreaseDetected: health.consecutiveReasonIncreaseDetected,
        attentionReasons: health.attentionReasons,
        p1CandidateReasons: health.p1CandidateReasons,
        policy: health.policy,
        windows: {
          windowDays: reasonComparison.windowDays,
          trendWindows: reasonComparison.trendWindows,
          now: reasonComparison.now.toISOString(),
          currentWindowStart: reasonComparison.currentWindowStart.toISOString(),
          previousWindowStart: reasonComparison.previousWindowStart.toISOString()
        }
      },
      null,
      2
    ),
    'utf8'
  );
  process.stdout.write(report);

  if (!health.passed) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[v2-release-health-summary] ${message}\n`);
  process.exit(1);
});
