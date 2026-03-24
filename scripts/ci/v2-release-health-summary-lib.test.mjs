import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEntryLine } from '../cutover/legacy-fallback-report-lib.mjs';
import {
  compareLegacyReasonWindows,
  evaluateDispatchQualityTrend,
  evaluateP1TimeoutStabilityTrend,
  evaluateP1TimeoutTrend,
  evaluateReleaseHealth,
  renderReleaseHealthReport
} from './v2-release-health-summary-lib.mjs';

const buildEntries = () => {
  return [
    parseEntryLine(
      '2026-03-22T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    ),
    parseEntryLine(
      '2026-03-21T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    ),
    parseEntryLine('2026-03-20T10:00:00Z|mode=legacy|source=arg|reason=manual-debug|args=|runner=dev'),
    parseEntryLine('2026-03-20T09:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev'),
    parseEntryLine(
      '2026-03-14T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    ),
    parseEntryLine('2026-03-13T10:00:00Z|mode=legacy|source=arg|reason=manual-debug|args=|runner=dev'),
    parseEntryLine('2026-03-13T09:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev')
  ].filter(Boolean);
};

const buildDispatchRuns = () => [
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-23T09:00:00Z',
    html_url: 'https://example.test/actions/runs/203'
  },
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-16T09:00:00Z',
    html_url: 'https://example.test/actions/runs/202'
  },
  {
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-09T09:00:00Z',
    html_url: 'https://example.test/actions/runs/201'
  }
];

const buildTimeoutRuns = () => [
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-23T07:00:00Z',
    html_url: 'https://example.test/actions/runs/403'
  },
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-16T07:00:00Z',
    html_url: 'https://example.test/actions/runs/402'
  },
  {
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-09T07:00:00Z',
    html_url: 'https://example.test/actions/runs/401'
  }
];

const buildTimeoutStabilityRuns = () => [
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-23T05:00:00Z',
    html_url: 'https://example.test/actions/runs/603'
  },
  {
    status: 'completed',
    conclusion: 'failure',
    event: 'schedule',
    updated_at: '2026-03-16T05:00:00Z',
    html_url: 'https://example.test/actions/runs/602'
  },
  {
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-09T05:00:00Z',
    html_url: 'https://example.test/actions/runs/601'
  }
];

test('compareLegacyReasonWindows computes current/previous counts and deltas', () => {
  const comparison = compareLegacyReasonWindows({
    entries: buildEntries(),
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 7
  });

  assert.equal(comparison.current.totalEntries, 4);
  assert.equal(comparison.current.legacyEntries, 3);
  assert.equal(comparison.previous.totalEntries, 3);
  assert.equal(comparison.previous.legacyEntries, 2);

  const startup = comparison.reasons.find((item) => item.reason === 'workspace-startup-failed');
  assert.ok(startup);
  assert.equal(startup.current, 2);
  assert.equal(startup.previous, 1);
  assert.equal(startup.delta, 1);
  assert.deepEqual(startup.history, [2, 1, 0]);
  assert.equal(startup.consecutiveIncrease, true);
  assert.equal(comparison.trendWindows, 2);
});

test('evaluateReleaseHealth tracks attention reasons and optional strict mode', () => {
  const reasonComparison = {
    reasons: [
      {
        reason: 'workspace-startup-failed',
        current: 2,
        previous: 1,
        delta: 1,
        history: [2, 1, 0],
        consecutiveIncrease: true
      },
      { reason: 'manual-debug', current: 0, previous: 1, delta: -1, history: [0, 1, 1], consecutiveIncrease: false }
    ]
  };

  const dispatchQualityResult = evaluateDispatchQualityTrend({
    runs: buildDispatchRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 2,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });
  const timeoutResult = evaluateP1TimeoutTrend({
    runs: buildTimeoutRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 2,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });

  const relaxed = evaluateReleaseHealth({
    rcResult: { passed: true, checks: [] },
    fallbackResult: { passed: true, checks: [] },
    dispatchQualityResult: {
      ...dispatchQualityResult,
      passed: true
    },
    timeoutResult: {
      ...timeoutResult,
      passed: true,
      consecutiveFailureDetected: false,
      consecutiveFailedWeeks: 0,
      latestRunFailed: false
    },
    reasonComparison,
    reasonBudgets: {
      'workspace-startup-failed': 1
    },
    trackReasonIncrease: true,
    failOnReasonIncrease: false
  });

  assert.equal(relaxed.passed, true);
  assert.equal(relaxed.attentionReasons.length, 1);
  assert.deepEqual(relaxed.attentionReasons[0].signals, [
    'budget-exceeded',
    'week-over-week-up',
    'consecutive-weekly-up'
  ]);
  assert.equal(relaxed.p1CandidateReasons.length, 1);

  const strict = evaluateReleaseHealth({
    rcResult: { passed: true, checks: [] },
    fallbackResult: { passed: true, checks: [] },
    dispatchQualityResult,
    timeoutResult: {
      ...timeoutResult,
      passed: true,
      consecutiveFailureDetected: false,
      consecutiveFailedWeeks: 0,
      latestRunFailed: false
    },
    reasonComparison,
    reasonBudgets: {
      'workspace-startup-failed': 1
    },
    trackReasonIncrease: true,
    failOnReasonIncrease: false,
    trackConsecutiveReasonIncrease: true,
    consecutiveIncreaseWindows: 2,
    failOnConsecutiveReasonIncrease: true
  });

  assert.equal(strict.passed, false);
});

test('evaluateReleaseHealth emits timeout trend candidate when consecutive failures are detected', () => {
  const timeoutResult = evaluateP1TimeoutTrend({
    runs: buildTimeoutRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 2,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });

  const health = evaluateReleaseHealth({
    rcResult: { passed: true, checks: [] },
    fallbackResult: { passed: true, checks: [] },
    dispatchQualityResult: { passed: true, checks: [] },
    timeoutResult,
    reasonComparison: { reasons: [] },
    reasonBudgets: {}
  });

  assert.equal(health.passed, false);
  assert.equal(health.timeoutConsecutiveFailureDetected, true);
  assert.equal(health.timeoutConsecutivePassedWeeks, 0);
  assert.ok(health.p1CandidateReasons.some((item) => item.reason === 'p1-timeout-consecutive-failed-weeks'));
});

test('evaluateReleaseHealth emits timeout stability trend candidate when consecutive failures are detected', () => {
  const timeoutStabilityResult = evaluateP1TimeoutStabilityTrend({
    runs: buildTimeoutStabilityRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 2,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });

  const health = evaluateReleaseHealth({
    rcResult: { passed: true, checks: [] },
    fallbackResult: { passed: true, checks: [] },
    dispatchQualityResult: { passed: true, checks: [] },
    timeoutResult: { passed: true, checks: [] },
    timeoutStabilityResult,
    reasonComparison: { reasons: [] },
    reasonBudgets: {}
  });

  assert.equal(health.passed, false);
  assert.equal(health.timeoutStabilityConsecutiveFailureDetected, true);
  assert.equal(health.timeoutStabilityConsecutivePassedWeeks, 0);
  assert.ok(
    health.p1CandidateReasons.some((item) => item.reason === 'p1-timeout-stability-consecutive-failed-weeks')
  );
});

test('evaluateDispatchQualityTrend detects consecutive failed weeks and applies policy', () => {
  const tracked = evaluateDispatchQualityTrend({
    runs: buildDispatchRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 2,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });

  assert.equal(tracked.latestRunFailed, true);
  assert.equal(tracked.consecutiveFailedWeeks, 2);
  assert.equal(tracked.consecutivePassedWeeks, 0);
  assert.equal(tracked.consecutiveFailureDetected, true);
  assert.equal(tracked.passed, false);

  const relaxed = evaluateDispatchQualityTrend({
    runs: buildDispatchRuns(),
    events: ['schedule'],
    trackConsecutiveFailureWeeks: true,
    consecutiveFailureWeeks: 3,
    failOnConsecutiveFailureWeeks: true,
    failOnLatestFailure: false
  });

  assert.equal(relaxed.consecutiveFailureDetected, false);
  assert.equal(relaxed.passed, true);
});

test('renderReleaseHealthReport includes verdict, trends, and need-to-handle section', () => {
  const comparison = compareLegacyReasonWindows({
    entries: buildEntries(),
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 7
  });

  const health = evaluateReleaseHealth({
    rcResult: {
      passed: true,
      checks: [{ name: 'Nightly stability', pass: true }],
      meta: {
        latestSuccessUrl: 'https://example.test/runs/42'
      }
    },
    fallbackResult: {
      passed: true,
      checks: [{ name: 'Legacy launch rate', pass: true }]
    },
    dispatchQualityResult: evaluateDispatchQualityTrend({
      runs: buildDispatchRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    timeoutResult: evaluateP1TimeoutTrend({
      runs: buildTimeoutRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    timeoutStabilityResult: evaluateP1TimeoutStabilityTrend({
      runs: buildTimeoutStabilityRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    reasonComparison: comparison,
    reasonBudgets: {
      'workspace-startup-failed': 1
    },
    trackReasonIncrease: true,
    failOnReasonIncrease: false
  });

  const report = renderReleaseHealthReport({
    generatedAt: new Date('2026-03-23T12:00:00Z'),
    summaryConfigPath: '.github/release-gates/v2-release-health-summary.json',
    rcConfigPath: '.github/release-gates/v2-rc-gate.json',
    fallbackConfigPath: '.github/release-gates/v2-cutover-fallback-gate.json',
    dispatchQualityConfig: '.github/release-gates/v2-release-health-summary.json#dispatchQuality',
    timeoutConfig: '.github/release-gates/v2-release-health-summary.json#timeoutGate',
    timeoutStabilityConfig: '.github/release-gates/v2-release-health-summary.json#timeoutStabilityGate',
    fallbackLogPath: 'reports/cutover/dev-entry.log',
    rcRunSource: 'fixture:test',
    dispatchQualityRunSource: 'fixture:dispatch',
    timeoutRunSource: 'fixture:timeout',
    timeoutStabilityRunSource: 'fixture:timeout-stability',
    rcResult: {
      passed: true,
      checks: [{ name: 'Nightly stability', pass: true }],
      meta: { latestSuccessUrl: 'https://example.test/runs/42' }
    },
    fallbackResult: {
      passed: true,
      checks: [{ name: 'Legacy launch rate', pass: true }]
    },
    dispatchQualityResult: evaluateDispatchQualityTrend({
      runs: buildDispatchRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    timeoutResult: evaluateP1TimeoutTrend({
      runs: buildTimeoutRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    timeoutStabilityResult: evaluateP1TimeoutStabilityTrend({
      runs: buildTimeoutStabilityRuns(),
      events: ['schedule'],
      trackConsecutiveFailureWeeks: true,
      consecutiveFailureWeeks: 2,
      failOnConsecutiveFailureWeeks: true,
      failOnLatestFailure: false
    }),
    reasonComparison: comparison,
    health
  });

  assert.match(report, /V2 Release Health Summary/);
  assert.match(report, /Verdict: \*\*FAIL\*\*/);
  assert.match(report, /Week-over-week fallback trend/);
  assert.match(report, /Dispatch quality weekly trend/);
  assert.match(report, /Dispatch quality gate/);
  assert.match(report, /P1 timeout weekly trend/);
  assert.match(report, /P1 timeout gate/);
  assert.match(report, /P1 timeout stability weekly trend/);
  assert.match(report, /P1 timeout stability gate/);
  assert.match(report, /Need-to-handle reasons/);
  assert.match(report, /P1 escalation candidates \(two-week rise\)/);
  assert.match(report, /p1-timeout-consecutive-failed-weeks/);
  assert.match(report, /p1-timeout-stability-consecutive-failed-weeks/);
  assert.match(report, /workspace-startup-failed/);
});
