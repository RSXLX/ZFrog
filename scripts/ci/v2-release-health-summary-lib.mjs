const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const P1_TIMEOUT_TREND_REASON = 'p1-timeout-consecutive-failed-weeks';
const P1_TIMEOUT_STABILITY_TREND_REASON = 'p1-timeout-stability-consecutive-failed-weeks';

const toPositiveNumber = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
};

const toNonNegativeInteger = (value, fallback = null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const toPositiveInteger = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const formatDelta = (value) => {
  if (value > 0) {
    return `+${value}`;
  }
  return String(value);
};

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

const toDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRunUpdatedAt = (run) => {
  if (!isObject(run)) {
    return null;
  }

  return toDate(run.updated_at) ?? toDate(run.run_started_at) ?? toDate(run.created_at);
};

const normalizeEventFilters = (events) => {
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .map((event) => (typeof event === 'string' ? event.trim() : ''))
    .filter((event) => event.length > 0);
};

const isFailedConclusion = (conclusion) => {
  const normalized = typeof conclusion === 'string' ? conclusion.trim().toLowerCase() : '';
  if (!normalized) {
    return false;
  }
  return normalized !== 'success';
};

const evaluateWorkflowConsecutiveFailureTrend = ({
  runs,
  events = ['schedule'],
  trackConsecutiveFailureWeeks = true,
  consecutiveFailureWeeks = 2,
  failOnConsecutiveFailureWeeks = true,
  failOnLatestFailure = true,
  latestRunCheckId = 'latest-run',
  latestRunCheckName = 'Latest run',
  latestRunExpected = 'latest run conclusion = success',
  consecutiveCheckId = 'consecutive-failed-weeks',
  consecutiveCheckName = 'Consecutive failed weeks'
}) => {
  const sourceRuns = Array.isArray(runs) ? runs : [];
  const eventFilters = normalizeEventFilters(events);
  const completedRuns = sourceRuns
    .filter((run) => run?.status === 'completed')
    .filter((run) => (eventFilters.length === 0 ? true : eventFilters.includes(String(run?.event || '').trim())))
    .map((run) => {
      const updatedAt = getRunUpdatedAt(run);
      return {
        event: typeof run?.event === 'string' ? run.event : 'unknown',
        conclusion: typeof run?.conclusion === 'string' ? run.conclusion : 'unknown',
        updatedAt,
        updatedAtIso: updatedAt ? updatedAt.toISOString() : null,
        url: typeof run?.html_url === 'string' ? run.html_url : ''
      };
    })
    .sort((a, b) => {
      if (a.updatedAt && b.updatedAt) {
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
      if (a.updatedAt) {
        return -1;
      }
      if (b.updatedAt) {
        return 1;
      }
      return 0;
    });

  const latestRun = completedRuns[0] ?? null;
  const latestRunFailed = latestRun ? isFailedConclusion(latestRun.conclusion) : false;
  const latestRunPassed = latestRun ? !latestRunFailed : true;

  let consecutiveFailedWeeks = 0;
  for (const run of completedRuns) {
    if (!isFailedConclusion(run.conclusion)) {
      break;
    }
    consecutiveFailedWeeks += 1;
  }

  let consecutivePassedWeeks = 0;
  for (const run of completedRuns) {
    if (isFailedConclusion(run.conclusion)) {
      break;
    }
    consecutivePassedWeeks += 1;
  }

  const threshold = toPositiveInteger(consecutiveFailureWeeks, 2);
  const consecutiveFailureDetected = trackConsecutiveFailureWeeks && consecutiveFailedWeeks >= threshold;

  const checks = [
    {
      id: latestRunCheckId,
      name: latestRunCheckName,
      expected: latestRunExpected,
      actual: latestRun ? `${latestRun.conclusion} (${latestRun.event})` : 'not found',
      pass: latestRun ? latestRunPassed : true,
      skipped: !latestRun
    },
    {
      id: consecutiveCheckId,
      name: consecutiveCheckName,
      expected: `< ${threshold}`,
      actual: String(consecutiveFailedWeeks),
      pass: !consecutiveFailureDetected
    }
  ];

  return {
    passed:
      !(failOnLatestFailure && latestRunFailed) &&
      !(failOnConsecutiveFailureWeeks && consecutiveFailureDetected),
    checks,
    latestRun,
    latestRunPassed,
    latestRunFailed,
    consecutiveFailedWeeks,
    consecutivePassedWeeks,
    consecutiveFailureDetected,
    consideredRuns: completedRuns.slice(0, 6),
    policy: {
      events: eventFilters,
      trackConsecutiveFailureWeeks,
      consecutiveFailureWeeks: threshold,
      failOnConsecutiveFailureWeeks,
      failOnLatestFailure
    }
  };
};

const mapToSortedArray = (counterMap) => {
  return Array.from(counterMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

const computeLegacySnapshot = ({ entries, windowStart, windowEnd, includeEnd = true }) => {
  const inWindow = entries.filter((entry) => {
    if (!(entry?.timestamp instanceof Date) || Number.isNaN(entry.timestamp.getTime())) {
      return false;
    }

    if (entry.timestamp < windowStart) {
      return false;
    }

    if (includeEnd) {
      return entry.timestamp <= windowEnd;
    }

    return entry.timestamp < windowEnd;
  });

  const legacyEntries = inWindow.filter((entry) => entry.mode === 'legacy');

  const byReason = new Map();
  for (const entry of legacyEntries) {
    const reason = typeof entry.reason === 'string' && entry.reason.trim() ? entry.reason.trim() : 'unspecified';
    byReason.set(reason, (byReason.get(reason) || 0) + 1);
  }

  return {
    totalEntries: inWindow.length,
    legacyEntries: legacyEntries.length,
    legacyRate: inWindow.length > 0 ? legacyEntries.length / inWindow.length : 0,
    reasons: mapToSortedArray(byReason)
  };
};

const reasonsToMap = (reasons) => {
  const map = new Map();
  for (const reason of reasons ?? []) {
    if (!reason || typeof reason.key !== 'string') {
      continue;
    }
    map.set(reason.key, Number(reason.count || 0));
  }
  return map;
};

export const compareLegacyReasonWindows = ({ entries, now, windowDays, trendWindows = 2 }) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new Error('Invalid now timestamp');
  }

  const days = toPositiveNumber(windowDays, 7);
  const durationMs = days * 24 * 60 * 60 * 1000;
  const trendWindowCount = toPositiveInteger(trendWindows, 2);
  const sourceEntries = Array.isArray(entries) ? entries : [];

  const windowSeries = [];
  for (let index = 0; index <= trendWindowCount; index += 1) {
    const windowEnd = new Date(nowDate.getTime() - index * durationMs);
    const windowStart = new Date(windowEnd.getTime() - durationMs);
    windowSeries.push({
      index,
      windowStart,
      windowEnd,
      includeEnd: index === 0,
      snapshot: computeLegacySnapshot({
        entries: sourceEntries,
        windowStart,
        windowEnd,
        includeEnd: index === 0
      })
    });
  }

  const [currentWindow, previousWindow] = windowSeries;
  const current = currentWindow.snapshot;
  const previous = previousWindow.snapshot;
  const currentWindowStart = currentWindow.windowStart;
  const previousWindowStart = previousWindow.windowStart;

  const reasonMaps = windowSeries.map(({ snapshot }) => reasonsToMap(snapshot.reasons));
  const reasonKeys = new Set(reasonMaps.flatMap((map) => Array.from(map.keys())));

  const reasons = Array.from(reasonKeys)
    .map((reason) => {
      const history = reasonMaps.map((map) => map.get(reason) || 0);
      const currentCount = history[0] || 0;
      const previousCount = history[1] || 0;

      let consecutiveIncrease = true;
      for (let index = 0; index < trendWindowCount; index += 1) {
        const newer = history[index] || 0;
        const older = history[index + 1] || 0;
        if (newer <= older) {
          consecutiveIncrease = false;
          break;
        }
      }

      return {
        reason,
        current: currentCount,
        previous: previousCount,
        delta: currentCount - previousCount,
        history,
        consecutiveIncrease
      };
    })
    .sort((a, b) => {
      if (b.current !== a.current) {
        return b.current - a.current;
      }
      if (b.delta !== a.delta) {
        return b.delta - a.delta;
      }
      return a.reason.localeCompare(b.reason);
    });

  return {
    windowDays: days,
    trendWindows: trendWindowCount,
    currentWindowStart,
    previousWindowStart,
    now: nowDate,
    current,
    previous,
    reasons,
    baseline: windowSeries[2]?.snapshot ?? null,
    windowSeries: windowSeries.map((window) => ({
      index: window.index,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      includeEnd: window.includeEnd,
      totalEntries: window.snapshot.totalEntries,
      legacyEntries: window.snapshot.legacyEntries,
      legacyRate: window.snapshot.legacyRate
    }))
  };
};

export const evaluateDispatchQualityTrend = ({
  runs,
  events = ['schedule'],
  trackConsecutiveFailureWeeks = true,
  consecutiveFailureWeeks = 2,
  failOnConsecutiveFailureWeeks = true,
  failOnLatestFailure = true
}) => {
  return evaluateWorkflowConsecutiveFailureTrend({
    runs,
    events,
    trackConsecutiveFailureWeeks,
    consecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks,
    failOnLatestFailure,
    latestRunCheckId: 'dispatch-quality-latest-run',
    latestRunCheckName: 'Dispatch quality latest run',
    latestRunExpected: 'latest run conclusion = success',
    consecutiveCheckId: 'dispatch-quality-consecutive-failed-weeks',
    consecutiveCheckName: 'Dispatch quality consecutive failed weeks'
  });
};

export const evaluateP1TimeoutTrend = ({
  runs,
  events = ['schedule'],
  trackConsecutiveFailureWeeks = true,
  consecutiveFailureWeeks = 2,
  failOnConsecutiveFailureWeeks = true,
  failOnLatestFailure = false
}) => {
  return evaluateWorkflowConsecutiveFailureTrend({
    runs,
    events,
    trackConsecutiveFailureWeeks,
    consecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks,
    failOnLatestFailure,
    latestRunCheckId: 'p1-timeout-latest-run',
    latestRunCheckName: 'P1 timeout gate latest run',
    latestRunExpected: 'latest run conclusion = success',
    consecutiveCheckId: 'p1-timeout-consecutive-failed-weeks',
    consecutiveCheckName: 'P1 timeout gate consecutive failed weeks'
  });
};

export const evaluateP1TimeoutStabilityTrend = ({
  runs,
  events = ['schedule'],
  trackConsecutiveFailureWeeks = true,
  consecutiveFailureWeeks = 2,
  failOnConsecutiveFailureWeeks = true,
  failOnLatestFailure = false
}) => {
  return evaluateWorkflowConsecutiveFailureTrend({
    runs,
    events,
    trackConsecutiveFailureWeeks,
    consecutiveFailureWeeks,
    failOnConsecutiveFailureWeeks,
    failOnLatestFailure,
    latestRunCheckId: 'p1-timeout-stability-latest-run',
    latestRunCheckName: 'P1 timeout stability gate latest run',
    latestRunExpected: 'latest run conclusion = success',
    consecutiveCheckId: 'p1-timeout-stability-consecutive-failed-weeks',
    consecutiveCheckName: 'P1 timeout stability gate consecutive failed weeks'
  });
};

export const evaluateReleaseHealth = ({
  rcResult,
  fallbackResult,
  dispatchQualityResult,
  timeoutResult,
  timeoutStabilityResult,
  reasonComparison,
  reasonBudgets,
  trackReasonIncrease = true,
  failOnReasonIncrease = false,
  trackConsecutiveReasonIncrease = true,
  consecutiveIncreaseWindows = 2,
  failOnConsecutiveReasonIncrease = false
}) => {
  const rcPassed = Boolean(rcResult?.passed);
  const fallbackPassed = Boolean(fallbackResult?.passed);
  const dispatchQualityPassed = Boolean(dispatchQualityResult?.passed ?? true);
  const timeoutPassed = Boolean(timeoutResult?.passed ?? true);
  const timeoutStabilityPassed = Boolean(timeoutStabilityResult?.passed ?? true);
  const normalizedConsecutiveIncreaseWindows = toPositiveInteger(consecutiveIncreaseWindows, 2);

  const budgets = isObject(reasonBudgets) ? reasonBudgets : {};
  const reasons = Array.isArray(reasonComparison?.reasons) ? reasonComparison.reasons : [];

  const attentionReasons = [];
  for (const item of reasons) {
    const budget = toNonNegativeInteger(budgets[item.reason], null);
    const exceedsBudget = budget !== null && item.current > budget;
    const increased = item.delta > 0;

    const signals = [];
    if (exceedsBudget) {
      signals.push('budget-exceeded');
    }
    if (trackReasonIncrease && increased) {
      signals.push('week-over-week-up');
    }
    if (trackConsecutiveReasonIncrease && item.consecutiveIncrease) {
      signals.push('consecutive-weekly-up');
    }

    if (signals.length > 0) {
      attentionReasons.push({
        reason: item.reason,
        current: item.current,
        previous: item.previous,
        delta: item.delta,
        budget,
        history: Array.isArray(item.history) ? item.history : [],
        signals
      });
    }
  }

  const reasonIncreaseDetected = attentionReasons.some((item) => item.signals.includes('week-over-week-up'));
  const consecutiveReasonIncreaseDetected = attentionReasons.some((item) =>
    item.signals.includes('consecutive-weekly-up')
  );
  const timeoutConsecutiveFailedWeeks = Number(timeoutResult?.consecutiveFailedWeeks ?? 0);
  const timeoutConsecutiveFailureThreshold = toPositiveInteger(timeoutResult?.policy?.consecutiveFailureWeeks, 2);
  const timeoutConsecutiveFailureDetected = Boolean(timeoutResult?.consecutiveFailureDetected ?? false);
  const timeoutLatestRunFailed = Boolean(timeoutResult?.latestRunFailed ?? false);
  const timeoutLatestRun = isObject(timeoutResult?.latestRun) ? timeoutResult.latestRun : null;
  const timeoutLatestConclusion = typeof timeoutLatestRun?.conclusion === 'string' ? timeoutLatestRun.conclusion : 'unknown';
  const timeoutStabilityConsecutiveFailedWeeks = Number(timeoutStabilityResult?.consecutiveFailedWeeks ?? 0);
  const timeoutStabilityConsecutiveFailureThreshold = toPositiveInteger(
    timeoutStabilityResult?.policy?.consecutiveFailureWeeks,
    2
  );
  const timeoutStabilityConsecutiveFailureDetected = Boolean(timeoutStabilityResult?.consecutiveFailureDetected ?? false);
  const timeoutStabilityLatestRunFailed = Boolean(timeoutStabilityResult?.latestRunFailed ?? false);
  const timeoutStabilityLatestRun = isObject(timeoutStabilityResult?.latestRun) ? timeoutStabilityResult.latestRun : null;
  const timeoutStabilityLatestConclusion =
    typeof timeoutStabilityLatestRun?.conclusion === 'string' ? timeoutStabilityLatestRun.conclusion : 'unknown';

  const p1CandidateReasons = attentionReasons
    .filter((item) => item.signals.includes('consecutive-weekly-up'))
    .map((item) => ({ ...item }));

  if (timeoutConsecutiveFailureDetected) {
    const previousFailedWeeks = Math.max(0, timeoutConsecutiveFailedWeeks - 1);
    p1CandidateReasons.push({
      reason: P1_TIMEOUT_TREND_REASON,
      current: timeoutConsecutiveFailedWeeks,
      previous: previousFailedWeeks,
      delta: timeoutConsecutiveFailedWeeks - previousFailedWeeks,
      budget: timeoutConsecutiveFailureThreshold - 1,
      history: [timeoutConsecutiveFailedWeeks, previousFailedWeeks],
      signals: [
        'timeout-gate-consecutive-failed-weeks',
        timeoutLatestRunFailed ? 'timeout-gate-latest-run-failed' : 'timeout-gate-latest-run-ok',
        `timeout-gate-latest:${timeoutLatestConclusion}`,
        `timeout-gate-threshold:${timeoutConsecutiveFailureThreshold}`
      ]
    });
  }

  if (timeoutStabilityConsecutiveFailureDetected) {
    const previousFailedWeeks = Math.max(0, timeoutStabilityConsecutiveFailedWeeks - 1);
    p1CandidateReasons.push({
      reason: P1_TIMEOUT_STABILITY_TREND_REASON,
      current: timeoutStabilityConsecutiveFailedWeeks,
      previous: previousFailedWeeks,
      delta: timeoutStabilityConsecutiveFailedWeeks - previousFailedWeeks,
      budget: timeoutStabilityConsecutiveFailureThreshold - 1,
      history: [timeoutStabilityConsecutiveFailedWeeks, previousFailedWeeks],
      signals: [
        'timeout-stability-gate-consecutive-failed-weeks',
        timeoutStabilityLatestRunFailed
          ? 'timeout-stability-gate-latest-run-failed'
          : 'timeout-stability-gate-latest-run-ok',
        `timeout-stability-gate-latest:${timeoutStabilityLatestConclusion}`,
        `timeout-stability-gate-threshold:${timeoutStabilityConsecutiveFailureThreshold}`
      ]
    });
  }

  return {
    passed:
      rcPassed &&
      fallbackPassed &&
      dispatchQualityPassed &&
      timeoutPassed &&
      timeoutStabilityPassed &&
      !(failOnReasonIncrease && reasonIncreaseDetected) &&
      !(failOnConsecutiveReasonIncrease && consecutiveReasonIncreaseDetected),
    rcPassed,
    fallbackPassed,
    dispatchQualityPassed,
    timeoutPassed,
    timeoutStabilityPassed,
    dispatchQualityLatestRunFailed: Boolean(dispatchQualityResult?.latestRunFailed ?? false),
    dispatchQualityConsecutiveFailureDetected: Boolean(dispatchQualityResult?.consecutiveFailureDetected ?? false),
    dispatchQualityConsecutiveFailedWeeks: Number(dispatchQualityResult?.consecutiveFailedWeeks ?? 0),
    dispatchQualityConsecutivePassedWeeks: Number(dispatchQualityResult?.consecutivePassedWeeks ?? 0),
    timeoutLatestRunFailed,
    timeoutConsecutiveFailureDetected,
    timeoutConsecutiveFailedWeeks,
    timeoutConsecutivePassedWeeks: Number(timeoutResult?.consecutivePassedWeeks ?? 0),
    timeoutStabilityLatestRunFailed,
    timeoutStabilityConsecutiveFailureDetected,
    timeoutStabilityConsecutiveFailedWeeks,
    timeoutStabilityConsecutivePassedWeeks: Number(timeoutStabilityResult?.consecutivePassedWeeks ?? 0),
    reasonIncreaseDetected,
    consecutiveReasonIncreaseDetected,
    attentionReasons,
    p1CandidateReasons,
    policy: {
      trackReasonIncrease,
      failOnReasonIncrease,
      trackConsecutiveReasonIncrease,
      consecutiveIncreaseWindows: normalizedConsecutiveIncreaseWindows,
      failOnConsecutiveReasonIncrease,
      dispatchQuality: dispatchQualityResult?.policy ?? {
        events: [],
        trackConsecutiveFailureWeeks: false,
        consecutiveFailureWeeks: 2,
        failOnConsecutiveFailureWeeks: false,
        failOnLatestFailure: false
      },
      timeout: timeoutResult?.policy ?? {
        events: [],
        trackConsecutiveFailureWeeks: false,
        consecutiveFailureWeeks: 2,
        failOnConsecutiveFailureWeeks: false,
        failOnLatestFailure: false
      },
      timeoutStability: timeoutStabilityResult?.policy ?? {
        events: [],
        trackConsecutiveFailureWeeks: false,
        consecutiveFailureWeeks: 2,
        failOnConsecutiveFailureWeeks: false,
        failOnLatestFailure: false
      }
    }
  };
};

const failedCheckNames = (result) => {
  if (!Array.isArray(result?.checks)) {
    return [];
  }
  return result.checks.filter((check) => !check.pass).map((check) => check.name);
};

export const renderReleaseHealthReport = ({
  generatedAt,
  summaryConfigPath,
  rcConfigPath,
  fallbackConfigPath,
  dispatchQualityConfig,
  timeoutConfig,
  timeoutStabilityConfig,
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
}) => {
  const lines = [];
  lines.push('# V2 Release Health Summary');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Summary config: \`${summaryConfigPath}\``);
  lines.push(`- RC config: \`${rcConfigPath}\``);
  lines.push(`- Fallback config: \`${fallbackConfigPath}\``);
  lines.push(`- Dispatch quality config: \`${dispatchQualityConfig || 'n/a'}\``);
  lines.push(`- Timeout gate config: \`${timeoutConfig || 'n/a'}\``);
  lines.push(`- Timeout stability gate config: \`${timeoutStabilityConfig || 'n/a'}\``);
  lines.push(`- Fallback log source: \`${fallbackLogPath}\``);
  lines.push(`- RC run source: \`${rcRunSource}\``);
  lines.push(`- Dispatch quality run source: \`${dispatchQualityRunSource || 'n/a'}\``);
  lines.push(`- Timeout gate run source: \`${timeoutRunSource || 'n/a'}\``);
  lines.push(`- Timeout stability run source: \`${timeoutStabilityRunSource || 'n/a'}\``);
  lines.push(`- Verdict: **${health.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');

  const rcFailed = failedCheckNames(rcResult);
  const fallbackFailed = failedCheckNames(fallbackResult);
  const dispatchQualityFailed = failedCheckNames(dispatchQualityResult);
  const timeoutFailed = failedCheckNames(timeoutResult);
  const timeoutStabilityFailed = failedCheckNames(timeoutStabilityResult);

  lines.push('## Gate verdicts');
  lines.push('');
  lines.push('| Gate | Verdict | Failed checks |');
  lines.push('| --- | --- | --- |');
  lines.push(`| RC release gate | ${health.rcPassed ? 'PASS' : 'FAIL'} | ${rcFailed.join('; ') || '-'} |`);
  lines.push(`| Cutover fallback gate | ${health.fallbackPassed ? 'PASS' : 'FAIL'} | ${fallbackFailed.join('; ') || '-'} |`);
  lines.push(
    `| Dispatch quality gate | ${health.dispatchQualityPassed ? 'PASS' : 'FAIL'} | ${dispatchQualityFailed.join('; ') || '-'} |`
  );
  lines.push(`| P1 timeout gate | ${health.timeoutPassed ? 'PASS' : 'FAIL'} | ${timeoutFailed.join('; ') || '-'} |`);
  lines.push(
    `| P1 timeout stability gate | ${health.timeoutStabilityPassed ? 'PASS' : 'FAIL'} | ${
      timeoutStabilityFailed.join('; ') || '-'
    } |`
  );
  lines.push('');

  lines.push('## Dispatch quality weekly trend');
  lines.push('');
  const latestDispatchRun = dispatchQualityResult?.latestRun;
  if (!latestDispatchRun) {
    lines.push('- No completed dispatch-quality run found in selected events.');
  } else {
    lines.push(
      `- Latest run: ${latestDispatchRun.updatedAtIso || 'unknown'} | conclusion=${latestDispatchRun.conclusion} | event=${latestDispatchRun.event}`
    );
    if (latestDispatchRun.url) {
      lines.push(`- Latest run URL: ${latestDispatchRun.url}`);
    }
  }
  lines.push(
    `- Consecutive failed weeks: ${health.dispatchQualityConsecutiveFailedWeeks} (threshold: ${
      health.policy.dispatchQuality?.consecutiveFailureWeeks ?? 2
    })`
  );
  lines.push(`- Consecutive passed weeks: ${health.dispatchQualityConsecutivePassedWeeks}`);
  lines.push(
    `- Consecutive failure trend detected: ${health.dispatchQualityConsecutiveFailureDetected ? 'yes' : 'no'}`
  );
  lines.push('');

  lines.push('## P1 timeout weekly trend');
  lines.push('');
  const latestTimeoutRun = timeoutResult?.latestRun;
  if (!latestTimeoutRun) {
    lines.push('- No completed timeout-gate run found in selected events.');
  } else {
    lines.push(
      `- Latest run: ${latestTimeoutRun.updatedAtIso || 'unknown'} | conclusion=${latestTimeoutRun.conclusion} | event=${latestTimeoutRun.event}`
    );
    if (latestTimeoutRun.url) {
      lines.push(`- Latest run URL: ${latestTimeoutRun.url}`);
    }
  }
  lines.push(
    `- Consecutive failed weeks: ${health.timeoutConsecutiveFailedWeeks} (threshold: ${
      health.policy.timeout?.consecutiveFailureWeeks ?? 2
    })`
  );
  lines.push(`- Consecutive passed weeks: ${health.timeoutConsecutivePassedWeeks}`);
  lines.push(`- Consecutive failure trend detected: ${health.timeoutConsecutiveFailureDetected ? 'yes' : 'no'}`);
  lines.push('');

  lines.push('## P1 timeout stability weekly trend');
  lines.push('');
  const latestTimeoutStabilityRun = timeoutStabilityResult?.latestRun;
  if (!latestTimeoutStabilityRun) {
    lines.push('- No completed timeout-stability-gate run found in selected events.');
  } else {
    lines.push(
      `- Latest run: ${latestTimeoutStabilityRun.updatedAtIso || 'unknown'} | conclusion=${latestTimeoutStabilityRun.conclusion} | event=${latestTimeoutStabilityRun.event}`
    );
    if (latestTimeoutStabilityRun.url) {
      lines.push(`- Latest run URL: ${latestTimeoutStabilityRun.url}`);
    }
  }
  lines.push(
    `- Consecutive failed weeks: ${health.timeoutStabilityConsecutiveFailedWeeks} (threshold: ${
      health.policy.timeoutStability?.consecutiveFailureWeeks ?? 2
    })`
  );
  lines.push(`- Consecutive passed weeks: ${health.timeoutStabilityConsecutivePassedWeeks}`);
  lines.push(
    `- Consecutive failure trend detected: ${health.timeoutStabilityConsecutiveFailureDetected ? 'yes' : 'no'}`
  );
  lines.push('');

  lines.push('## Week-over-week fallback trend');
  lines.push('');
  lines.push(
    `- Current window: ${reasonComparison.currentWindowStart.toISOString()} ~ ${reasonComparison.now.toISOString()} (${reasonComparison.windowDays} days)`
  );
  lines.push(
    `- Previous window: ${reasonComparison.previousWindowStart.toISOString()} ~ ${reasonComparison.currentWindowStart.toISOString()} (${reasonComparison.windowDays} days)`
  );
  lines.push('');
  lines.push('| Metric | Current | Previous | Delta |');
  lines.push('| --- | --- | --- | --- |');
  lines.push(
    `| Total launches | ${reasonComparison.current.totalEntries} | ${reasonComparison.previous.totalEntries} | ${formatDelta(
      reasonComparison.current.totalEntries - reasonComparison.previous.totalEntries
    )} |`
  );
  lines.push(
    `| Legacy launches | ${reasonComparison.current.legacyEntries} | ${reasonComparison.previous.legacyEntries} | ${formatDelta(
      reasonComparison.current.legacyEntries - reasonComparison.previous.legacyEntries
    )} |`
  );
  lines.push(
    `| Legacy rate | ${formatPercent(reasonComparison.current.legacyRate)} | ${formatPercent(
      reasonComparison.previous.legacyRate
    )} | ${formatDelta(
      Number((reasonComparison.current.legacyRate - reasonComparison.previous.legacyRate).toFixed(4))
    )} |`
  );
  lines.push('');

  lines.push('## Reason trend details');
  lines.push('');
  if (!Array.isArray(reasonComparison.reasons) || reasonComparison.reasons.length === 0) {
    lines.push('- none');
  } else {
    const attentionMap = new Map((health.attentionReasons || []).map((item) => [item.reason, item]));
    lines.push('| Reason | Current | Previous | Delta | Trend (new->old) | Budget | Status |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const reason of reasonComparison.reasons) {
      const attention = attentionMap.get(reason.reason);
      const budget = attention && Number.isFinite(attention.budget) ? attention.budget : '-';
      const status = attention ? attention.signals.join('+') : 'stable';
      const history = Array.isArray(reason.history) && reason.history.length > 0 ? reason.history : [reason.current];
      lines.push(
        `| ${reason.reason} | ${reason.current} | ${reason.previous} | ${formatDelta(reason.delta)} | ${history.join(
          ' -> '
        )} | ${budget} | ${status} |`
      );
    }
  }
  lines.push('');

  lines.push('## Need-to-handle reasons');
  lines.push('');
  if (!Array.isArray(health.attentionReasons) || health.attentionReasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of health.attentionReasons) {
      const budgetText = Number.isFinite(reason.budget) ? `, budget<=${reason.budget}` : '';
      lines.push(
        `- ${reason.reason}: current=${reason.current}, previous=${reason.previous}, delta=${formatDelta(
          reason.delta
        )}${budgetText}, flags=${reason.signals.join(',')}`
      );
    }
  }
  lines.push('');

  lines.push('## P1 escalation candidates (two-week rise)');
  lines.push('');
  if (!Array.isArray(health.p1CandidateReasons) || health.p1CandidateReasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of health.p1CandidateReasons) {
      const history = Array.isArray(reason.history) && reason.history.length > 0 ? reason.history.join(' -> ') : '-';
      lines.push(
        `- ${reason.reason}: history=${history}, current=${reason.current}, previous=${reason.previous}, delta=${formatDelta(
          reason.delta
        )}`
      );
    }
  }
  lines.push('');

  lines.push('## Policy');
  lines.push('');
  lines.push(`- Track week-over-week increase: ${health.policy.trackReasonIncrease ? 'enabled' : 'disabled'}`);
  lines.push(
    `- Fail on reason increase: ${health.policy.failOnReasonIncrease ? 'enabled' : 'disabled'} (current: ${
      health.reasonIncreaseDetected ? 'detected increase' : 'no increase detected'
    })`
  );
  lines.push(
    `- Track consecutive increase: ${health.policy.trackConsecutiveReasonIncrease ? 'enabled' : 'disabled'} (windows: ${
      health.policy.consecutiveIncreaseWindows
    })`
  );
  lines.push(
    `- Fail on consecutive increase: ${
      health.policy.failOnConsecutiveReasonIncrease ? 'enabled' : 'disabled'
    } (current: ${health.consecutiveReasonIncreaseDetected ? 'detected increase' : 'no increase detected'})`
  );
  lines.push(
    `- Dispatch latest failure gate: ${
      health.policy.dispatchQuality?.failOnLatestFailure ? 'enabled' : 'disabled'
    } (current: ${health.dispatchQualityLatestRunFailed ? 'latest failed' : 'latest passed/unknown'})`
  );
  lines.push(
    `- Dispatch consecutive failure trend gate: ${
      health.policy.dispatchQuality?.failOnConsecutiveFailureWeeks ? 'enabled' : 'disabled'
    } (current: ${
      health.dispatchQualityConsecutiveFailureDetected ? 'detected consecutive failures' : 'no consecutive failures'
    })`
  );
  lines.push(
    `- Timeout latest failure gate: ${health.policy.timeout?.failOnLatestFailure ? 'enabled' : 'disabled'} (current: ${
      health.timeoutLatestRunFailed ? 'latest failed' : 'latest passed/unknown'
    })`
  );
  lines.push(
    `- Timeout consecutive failure trend gate: ${
      health.policy.timeout?.failOnConsecutiveFailureWeeks ? 'enabled' : 'disabled'
    } (current: ${health.timeoutConsecutiveFailureDetected ? 'detected consecutive failures' : 'no consecutive failures'})`
  );
  lines.push(
    `- Timeout stability latest failure gate: ${
      health.policy.timeoutStability?.failOnLatestFailure ? 'enabled' : 'disabled'
    } (current: ${health.timeoutStabilityLatestRunFailed ? 'latest failed' : 'latest passed/unknown'})`
  );
  lines.push(
    `- Timeout stability consecutive failure trend gate: ${
      health.policy.timeoutStability?.failOnConsecutiveFailureWeeks ? 'enabled' : 'disabled'
    } (current: ${
      health.timeoutStabilityConsecutiveFailureDetected ? 'detected consecutive failures' : 'no consecutive failures'
    })`
  );
  lines.push('');

  if (rcResult?.meta?.latestSuccessUrl) {
    lines.push(`- Latest successful nightly run: ${rcResult.meta.latestSuccessUrl}`);
  }

  return `${lines.join('\n')}\n`;
};
