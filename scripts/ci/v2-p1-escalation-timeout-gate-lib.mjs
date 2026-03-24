import { extractReasonFromMarker } from './v2-p1-escalation-dispatch-lib.mjs';

const DEFAULT_TITLE_PREFIX = '[V2-W15-17][P1 Escalation]';
const REMINDER_MARKER_PREFIX = '<!-- v2-p1-timeout-reminder:';
const P1_TIMEOUT_TREND_REASON = 'p1-timeout-consecutive-failed-weeks';
const P1_TIMEOUT_STABILITY_TREND_REASON = 'p1-timeout-stability-consecutive-failed-weeks';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toNonNegativeInteger = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

const toPositiveNumber = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
};

const toNonNegativeNumber = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
};

const toBoolean = (value, fallback = false) => {
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

const toDate = (value) => {
  const text = toTrimmedString(value);
  if (!text) {
    return null;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const toIssueLabelSet = (labels) => {
  if (!Array.isArray(labels)) {
    return new Set();
  }

  const values = labels
    .map((label) => {
      if (typeof label === 'string') {
        return label.trim().toLowerCase();
      }
      if (isObject(label) && typeof label.name === 'string') {
        return label.name.trim().toLowerCase();
      }
      return '';
    })
    .filter(Boolean);

  return new Set(values);
};

const normalizeTitlePrefixes = (prefixes) => {
  const source = Array.isArray(prefixes) ? prefixes : [DEFAULT_TITLE_PREFIX];
  const unique = new Set();
  for (const value of source) {
    const prefix = toTrimmedString(value);
    if (!prefix) {
      continue;
    }
    unique.add(prefix);
  }
  if (unique.size === 0) {
    unique.add(DEFAULT_TITLE_PREFIX);
  }
  return Array.from(unique.values());
};

const deriveReasonFromTitle = (title, titlePrefixes) => {
  const normalizedTitle = toTrimmedString(title);
  if (!normalizedTitle) {
    return '';
  }

  for (const prefix of titlePrefixes) {
    const marker = `${prefix} `;
    if (normalizedTitle.startsWith(marker)) {
      return normalizedTitle.slice(marker.length).trim();
    }
  }

  return '';
};

const toHours = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }
  return Number((durationMs / (1000 * 60 * 60)).toFixed(2));
};

const toSignedHours = (durationMs) => {
  if (!Number.isFinite(durationMs)) {
    return null;
  }
  return Number((durationMs / (1000 * 60 * 60)).toFixed(2));
};

const toSlug = (value) =>
  toTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const getCandidateDescriptor = (reason) => {
  if (reason === P1_TIMEOUT_TREND_REASON) {
    return {
      checkIdPrefix: 'timeout-candidate',
      displayName: 'Timeout candidate'
    };
  }

  if (reason === P1_TIMEOUT_STABILITY_TREND_REASON) {
    return {
      checkIdPrefix: 'timeout-stability-candidate',
      displayName: 'Timeout stability candidate'
    };
  }

  const slug = toSlug(reason) || 'custom-candidate';
  return {
    checkIdPrefix: `${slug}-candidate`,
    displayName: `Candidate (${reason || 'unknown'})`
  };
};

const normalizeIssue = ({ rawIssue, now, titlePrefixes, requiredLabels }) => {
  if (!isObject(rawIssue) || rawIssue.pull_request) {
    return null;
  }

  const state = toTrimmedString(rawIssue.state).toLowerCase() || 'open';
  if (state !== 'open') {
    return null;
  }

  const title = toTrimmedString(rawIssue.title);
  const body = toTrimmedString(rawIssue.body);
  const issueNumber = Number(rawIssue.number);
  const url = toTrimmedString(rawIssue.html_url) || toTrimmedString(rawIssue.url);
  const createdAt = toDate(rawIssue.created_at);
  const updatedAt = toDate(rawIssue.updated_at) ?? createdAt;
  const labelSet = toIssueLabelSet(rawIssue.labels);

  const reasonFromMarker = extractReasonFromMarker(body);
  const reasonFromTitle = deriveReasonFromTitle(title, titlePrefixes);
  const reason = reasonFromMarker || reasonFromTitle || '';

  const matchesTitlePrefix = titlePrefixes.some((prefix) => title.startsWith(`${prefix} `));
  if (!reason && !matchesTitlePrefix) {
    return null;
  }

  const missingRequiredLabels = requiredLabels.filter((label) => !labelSet.has(label));
  const matchesRequiredLabels = missingRequiredLabels.length === 0;

  const openHours = createdAt ? toHours(now.getTime() - createdAt.getTime()) : null;
  const idleHours = updatedAt ? toHours(now.getTime() - updatedAt.getTime()) : null;

  return {
    issueNumber: Number.isInteger(issueNumber) && issueNumber > 0 ? issueNumber : null,
    title,
    reason: reason || 'unknown-reason',
    reasonFrom: reasonFromMarker ? 'marker' : reasonFromTitle ? 'title' : 'unknown',
    url,
    createdAtIso: createdAt ? createdAt.toISOString() : null,
    updatedAtIso: updatedAt ? updatedAt.toISOString() : null,
    openHours,
    idleHours,
    labels: Array.from(labelSet.values()),
    matchesRequiredLabels,
    missingRequiredLabels
  };
};

const normalizeCandidateCloseoutConfig = (candidateCloseoutConfig) => {
  const source = isObject(candidateCloseoutConfig) ? candidateCloseoutConfig : {};
  const ratchetingSource = isObject(source.recoveryThresholdRatcheting) ? source.recoveryThresholdRatcheting : {};
  const summarySource = isObject(source.summary) ? source.summary : {};
  return {
    enabled: toBoolean(source.enabled, false),
    reason: toTrimmedString(source.reason) || P1_TIMEOUT_TREND_REASON,
    minOpenIssuesWhenTrendDetected: toNonNegativeInteger(source.minOpenIssuesWhenTrendDetected, 1),
    minOpenIssuesBeforeRecoveryCloseout: toNonNegativeInteger(source.minOpenIssuesBeforeRecoveryCloseout, 1),
    recoveryConsecutivePassedWeeks: toNonNegativeInteger(source.recoveryConsecutivePassedWeeks, 2),
    maxOpenIssuesAfterRecovery: toNonNegativeInteger(source.maxOpenIssuesAfterRecovery, 0),
    recoveryThresholdRatcheting: {
      enabled: toBoolean(ratchetingSource.enabled, false),
      minConsecutivePassedWeeksToRequireTarget: toNonNegativeInteger(
        ratchetingSource.minConsecutivePassedWeeksToRequireTarget,
        2
      ),
      targetRecoveryConsecutivePassedWeeks: toNonNegativeInteger(
        ratchetingSource.targetRecoveryConsecutivePassedWeeks,
        3
      )
    },
    summary: {
      trendDetectedKey: toTrimmedString(summarySource.trendDetectedKey),
      consecutiveFailedWeeksKey: toTrimmedString(summarySource.consecutiveFailedWeeksKey),
      consecutivePassedWeeksKey: toTrimmedString(summarySource.consecutivePassedWeeksKey),
      latestRunFailedKey: toTrimmedString(summarySource.latestRunFailedKey)
    }
  };
};

const normalizeCandidateCloseoutList = (issueConfig) => {
  const sourceList = Array.isArray(issueConfig?.candidateCloseouts)
    ? issueConfig.candidateCloseouts
    : issueConfig?.candidateCloseout
      ? [issueConfig.candidateCloseout]
      : [];

  const normalized = sourceList.map((item) => normalizeCandidateCloseoutConfig(item));
  if (normalized.length === 0) {
    return [normalizeCandidateCloseoutConfig({ enabled: false })];
  }

  const deduped = [];
  const seenReasons = new Set();
  for (const item of normalized) {
    const reason = toTrimmedString(item.reason) || P1_TIMEOUT_TREND_REASON;
    if (seenReasons.has(reason)) {
      continue;
    }
    seenReasons.add(reason);
    deduped.push({
      ...item,
      reason
    });
  }

  return deduped;
};

const normalizeSummary = (summary) => {
  if (!isObject(summary)) {
    return {
      present: false,
      raw: {},
      generatedAtIso: null,
      generatedAtMs: null,
      timeoutConsecutiveFailureDetected: false,
      timeoutConsecutivePassedWeeks: 0,
      timeoutConsecutiveFailedWeeks: 0,
      timeoutLatestRunFailed: false,
      timeoutStabilityConsecutiveFailureDetected: false,
      timeoutStabilityConsecutivePassedWeeks: 0,
      timeoutStabilityConsecutiveFailedWeeks: 0,
      timeoutStabilityLatestRunFailed: false,
      verdict: 'n/a'
    };
  }

  const generatedAt = toDate(summary.generatedAt) ?? toDate(summary.generated_at);

  return {
    present: true,
    raw: summary,
    generatedAtIso: generatedAt ? generatedAt.toISOString() : null,
    generatedAtMs: generatedAt ? generatedAt.getTime() : null,
    timeoutConsecutiveFailureDetected: toBoolean(summary.timeoutConsecutiveFailureDetected, false),
    timeoutConsecutivePassedWeeks: toNonNegativeInteger(summary.timeoutConsecutivePassedWeeks, 0),
    timeoutConsecutiveFailedWeeks: toNonNegativeInteger(summary.timeoutConsecutiveFailedWeeks, 0),
    timeoutLatestRunFailed: toBoolean(summary.timeoutLatestRunFailed, false),
    timeoutStabilityConsecutiveFailureDetected: toBoolean(summary.timeoutStabilityConsecutiveFailureDetected, false),
    timeoutStabilityConsecutivePassedWeeks: toNonNegativeInteger(summary.timeoutStabilityConsecutivePassedWeeks, 0),
    timeoutStabilityConsecutiveFailedWeeks: toNonNegativeInteger(summary.timeoutStabilityConsecutiveFailedWeeks, 0),
    timeoutStabilityLatestRunFailed: toBoolean(summary.timeoutStabilityLatestRunFailed, false),
    verdict: toTrimmedString(summary.verdict) || 'n/a'
  };
};

const getDefaultSummaryKeysByReason = (reason) => {
  if (reason === P1_TIMEOUT_STABILITY_TREND_REASON) {
    return {
      trendDetectedKey: 'timeoutStabilityConsecutiveFailureDetected',
      consecutiveFailedWeeksKey: 'timeoutStabilityConsecutiveFailedWeeks',
      consecutivePassedWeeksKey: 'timeoutStabilityConsecutivePassedWeeks',
      latestRunFailedKey: 'timeoutStabilityLatestRunFailed'
    };
  }

  return {
    trendDetectedKey: 'timeoutConsecutiveFailureDetected',
    consecutiveFailedWeeksKey: 'timeoutConsecutiveFailedWeeks',
    consecutivePassedWeeksKey: 'timeoutConsecutivePassedWeeks',
    latestRunFailedKey: 'timeoutLatestRunFailed'
  };
};

const readSummaryBoolean = ({ summarySnapshot, key, fallback }) => {
  const rawValue = summarySnapshot?.raw?.[key];
  if (typeof rawValue === 'undefined') {
    return fallback;
  }
  return toBoolean(rawValue, fallback);
};

const readSummaryInteger = ({ summarySnapshot, key, fallback }) => {
  const rawValue = summarySnapshot?.raw?.[key];
  if (typeof rawValue === 'undefined') {
    return fallback;
  }
  return toNonNegativeInteger(rawValue, fallback);
};

const resolveCandidateTrendSnapshot = ({ candidateConfig, summarySnapshot }) => {
  const defaultKeys = getDefaultSummaryKeysByReason(candidateConfig.reason);
  const summaryKeys = {
    trendDetectedKey: candidateConfig.summary.trendDetectedKey || defaultKeys.trendDetectedKey,
    consecutiveFailedWeeksKey: candidateConfig.summary.consecutiveFailedWeeksKey || defaultKeys.consecutiveFailedWeeksKey,
    consecutivePassedWeeksKey: candidateConfig.summary.consecutivePassedWeeksKey || defaultKeys.consecutivePassedWeeksKey,
    latestRunFailedKey: candidateConfig.summary.latestRunFailedKey || defaultKeys.latestRunFailedKey
  };

  const trendDetected = readSummaryBoolean({
    summarySnapshot,
    key: summaryKeys.trendDetectedKey,
    fallback: false
  });
  const consecutiveFailedWeeks = readSummaryInteger({
    summarySnapshot,
    key: summaryKeys.consecutiveFailedWeeksKey,
    fallback: 0
  });
  const consecutivePassedWeeks = readSummaryInteger({
    summarySnapshot,
    key: summaryKeys.consecutivePassedWeeksKey,
    fallback: 0
  });
  const latestRunFailed = readSummaryBoolean({
    summarySnapshot,
    key: summaryKeys.latestRunFailedKey,
    fallback: false
  });

  return {
    summaryKeys,
    trendDetected,
    consecutiveFailedWeeks,
    consecutivePassedWeeks,
    latestRunFailed
  };
};

export const evaluateP1EscalationTimeoutGate = ({ issues, config, now, summary }) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new Error('Invalid now timestamp');
  }

  const gateConfig = isObject(config) ? config : {};
  const issueConfig = isObject(gateConfig.issue) ? gateConfig.issue : {};

  const titlePrefixes = normalizeTitlePrefixes(issueConfig.titlePrefixes);
  const requiredLabels = Array.isArray(issueConfig.requiredLabels)
    ? issueConfig.requiredLabels.map((label) => toTrimmedString(label).toLowerCase()).filter(Boolean)
    : [];

  const maxOpenHours = toPositiveNumber(issueConfig.maxOpenHours, 72);
  const maxIdleHours = toPositiveNumber(issueConfig.maxIdleHours, 48);
  const maxOverdueIssues = toNonNegativeInteger(issueConfig.maxOverdueIssues, 0);
  const maxLabelDriftIssues = toNonNegativeInteger(issueConfig.maxLabelDriftIssues, 0);
  const candidateCloseoutConfigs = normalizeCandidateCloseoutList(issueConfig);
  const summarySnapshot = normalizeSummary(summary);
  const summaryConfig = isObject(gateConfig.summary) ? gateConfig.summary : {};
  const summaryRequireGeneratedAt = toBoolean(summaryConfig.requireGeneratedAt, true);
  const summaryMaxAgeHours = toPositiveNumber(summaryConfig.maxAgeHours, 36);
  const summaryMaxFutureSkewMinutes = toNonNegativeNumber(summaryConfig.maxFutureSkewMinutes, 5);
  const summaryAgeHours =
    summarySnapshot.present && Number.isFinite(summarySnapshot.generatedAtMs)
      ? toSignedHours(nowDate.getTime() - summarySnapshot.generatedAtMs)
      : null;
  const summaryFutureSkewMinutes =
    summarySnapshot.present && Number.isFinite(summarySnapshot.generatedAtMs)
      ? Number(((summarySnapshot.generatedAtMs - nowDate.getTime()) / (1000 * 60)).toFixed(2))
      : null;
  const hasEnabledCandidateCloseout = candidateCloseoutConfigs.some((candidateCloseoutConfig) => candidateCloseoutConfig.enabled);

  const sourceIssues = Array.isArray(issues) ? issues : [];
  const normalizedIssues = sourceIssues
    .map((rawIssue) =>
      normalizeIssue({
        rawIssue,
        now: nowDate,
        titlePrefixes,
        requiredLabels
      })
    )
    .filter(Boolean);

  const evaluatedIssues = normalizedIssues
    .map((issue) => {
      const overdueReasons = [];
      if (Number.isFinite(issue.openHours) && issue.openHours > maxOpenHours) {
        overdueReasons.push('open-timeout');
      }
      if (Number.isFinite(issue.idleHours) && issue.idleHours > maxIdleHours) {
        overdueReasons.push('idle-timeout');
      }

      return {
        ...issue,
        overdueReasons,
        overdue: overdueReasons.length > 0
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) {
        return a.overdue ? -1 : 1;
      }
      const aHours = Number.isFinite(a.openHours) ? a.openHours : -1;
      const bHours = Number.isFinite(b.openHours) ? b.openHours : -1;
      return bHours - aHours;
    });

  const overdueIssues = evaluatedIssues.filter((issue) => issue.overdue);
  const candidateIssuesByReason = Object.fromEntries(
    candidateCloseoutConfigs.map((candidateConfig) => [
      candidateConfig.reason,
      evaluatedIssues.filter((issue) => issue.reason === candidateConfig.reason)
    ])
  );
  const timeoutCandidateIssues = candidateIssuesByReason[P1_TIMEOUT_TREND_REASON] || [];
  const timeoutStabilityCandidateIssues = candidateIssuesByReason[P1_TIMEOUT_STABILITY_TREND_REASON] || [];
  const labelDriftIssues = evaluatedIssues.filter((issue) => !issue.matchesRequiredLabels);

  const metrics = {
    issueCandidates: evaluatedIssues.length,
    overdueIssues: overdueIssues.length,
    labelDriftIssues: labelDriftIssues.length,
    overdueByOpenTimeout: overdueIssues.filter((issue) => issue.overdueReasons.includes('open-timeout')).length,
    overdueByIdleTimeout: overdueIssues.filter((issue) => issue.overdueReasons.includes('idle-timeout')).length,
    reasonsFromMarker: evaluatedIssues.filter((issue) => issue.reasonFrom === 'marker').length,
    reasonsFromTitle: evaluatedIssues.filter((issue) => issue.reasonFrom === 'title').length,
    timeoutCandidateOpenIssues: timeoutCandidateIssues.length,
    timeoutStabilityCandidateOpenIssues: timeoutStabilityCandidateIssues.length,
    summaryPresent: summarySnapshot.present ? 1 : 0,
    summaryGeneratedAtPresent: summarySnapshot.generatedAtIso ? 1 : 0,
    summaryAgeHours,
    summaryFutureSkewMinutes,
    candidateOpenIssuesByReason: Object.fromEntries(
      candidateCloseoutConfigs.map((candidateConfig) => [
        candidateConfig.reason,
        (candidateIssuesByReason[candidateConfig.reason] || []).length
      ])
    )
  };

  const checks = [
    {
      id: 'required-label-compliance',
      name: 'Required label compliance',
      expected: `<= ${maxLabelDriftIssues}`,
      actual: String(metrics.labelDriftIssues),
      pass: metrics.labelDriftIssues <= maxLabelDriftIssues
    },
    {
      id: 'overdue-issue-budget',
      name: 'Overdue issue budget',
      expected: `<= ${maxOverdueIssues}`,
      actual: String(metrics.overdueIssues),
      pass: metrics.overdueIssues <= maxOverdueIssues
    }
  ];

  if (hasEnabledCandidateCloseout && summarySnapshot.present && summaryRequireGeneratedAt) {
    checks.push({
      id: 'closeout-summary-generated-at',
      name: 'Closeout summary generatedAt presence',
      expected: 'present',
      actual: summarySnapshot.generatedAtIso || 'missing',
      pass: Boolean(summarySnapshot.generatedAtIso)
    });
  }

  if (hasEnabledCandidateCloseout && summarySnapshot.present && summarySnapshot.generatedAtIso) {
    checks.push({
      id: 'closeout-summary-not-future',
      name: 'Closeout summary future skew window',
      expected: `<= ${summaryMaxFutureSkewMinutes}m ahead`,
      actual: Number.isFinite(summaryFutureSkewMinutes) ? `${summaryFutureSkewMinutes}m` : 'n/a',
      pass: Number.isFinite(summaryFutureSkewMinutes) && summaryFutureSkewMinutes <= summaryMaxFutureSkewMinutes
    });

    checks.push({
      id: 'closeout-summary-recency',
      name: 'Closeout summary recency window',
      expected: `<= ${summaryMaxAgeHours}h`,
      actual: Number.isFinite(summaryAgeHours) ? `${summaryAgeHours}h` : 'n/a',
      pass:
        Number.isFinite(summaryAgeHours) &&
        summaryAgeHours <= summaryMaxAgeHours &&
        summaryAgeHours >= -summaryMaxFutureSkewMinutes / 60
    });
  }

  const candidateCloseouts = [];
  for (const candidateCloseoutConfig of candidateCloseoutConfigs) {
    const candidateIssues = candidateIssuesByReason[candidateCloseoutConfig.reason] || [];
    const descriptor = getCandidateDescriptor(candidateCloseoutConfig.reason);
    const candidateTrend = resolveCandidateTrendSnapshot({
      candidateConfig: candidateCloseoutConfig,
      summarySnapshot
    });
    let candidateCloseout = {
      ...candidateCloseoutConfig,
      ...descriptor,
      summaryPresent: summarySnapshot.present,
      summaryGeneratedAtIso: summarySnapshot.generatedAtIso,
      summaryAgeHours,
      summaryMaxAgeHours,
      summaryFutureSkewMinutes,
      summaryMaxFutureSkewMinutes,
      trendDetected: candidateTrend.trendDetected,
      consecutiveFailedWeeks: candidateTrend.consecutiveFailedWeeks,
      consecutivePassedWeeks: candidateTrend.consecutivePassedWeeks,
      latestRunFailed: candidateTrend.latestRunFailed,
      summaryVerdict: summarySnapshot.verdict,
      candidateOpenIssues: candidateIssues.length,
      summaryKeys: candidateTrend.summaryKeys,
      recoverySatisfied: false,
      shouldHaveOpenIssue: false,
      shouldHoldOpenBeforeRecovery: false,
      shouldBeClosed: false,
      recoveryThresholdRatchetingEnabled: candidateCloseoutConfig.recoveryThresholdRatcheting.enabled,
      ratchetMinConsecutivePassedWeeksToRequireTarget:
        candidateCloseoutConfig.recoveryThresholdRatcheting.minConsecutivePassedWeeksToRequireTarget,
      ratchetTargetRecoveryConsecutivePassedWeeks:
        candidateCloseoutConfig.recoveryThresholdRatcheting.targetRecoveryConsecutivePassedWeeks,
      shouldEnforceRatchetedRecoveryThreshold: false,
      recoveryThresholdRatcheted: true
    };

    if (candidateCloseoutConfig.reason === P1_TIMEOUT_TREND_REASON) {
      candidateCloseout = {
        ...candidateCloseout,
        timeoutConsecutiveFailureDetected: candidateTrend.trendDetected,
        timeoutConsecutiveFailedWeeks: candidateTrend.consecutiveFailedWeeks,
        timeoutConsecutivePassedWeeks: candidateTrend.consecutivePassedWeeks,
        timeoutLatestRunFailed: candidateTrend.latestRunFailed,
        timeoutCandidateOpenIssues: candidateIssues.length
      };
    }
    if (candidateCloseoutConfig.reason === P1_TIMEOUT_STABILITY_TREND_REASON) {
      candidateCloseout = {
        ...candidateCloseout,
        timeoutStabilityConsecutiveFailureDetected: candidateTrend.trendDetected,
        timeoutStabilityConsecutiveFailedWeeks: candidateTrend.consecutiveFailedWeeks,
        timeoutStabilityConsecutivePassedWeeks: candidateTrend.consecutivePassedWeeks,
        timeoutStabilityLatestRunFailed: candidateTrend.latestRunFailed,
        timeoutStabilityCandidateOpenIssues: candidateIssues.length
      };
    }

    if (candidateCloseoutConfig.enabled) {
      if (!summarySnapshot.present) {
        checks.push({
          id: `${descriptor.checkIdPrefix}-summary-required`,
          name: `${descriptor.displayName} closeout summary input`,
          expected: 'summary-json provided',
          actual: 'missing',
          pass: false
        });
      } else {
        const shouldHaveOpenIssue = candidateTrend.trendDetected;
        const shouldHoldOpenBeforeRecovery =
          !candidateTrend.trendDetected &&
          candidateTrend.consecutivePassedWeeks < candidateCloseoutConfig.recoveryConsecutivePassedWeeks;
        const recoverySatisfied =
          !candidateTrend.trendDetected &&
          candidateTrend.consecutivePassedWeeks >= candidateCloseoutConfig.recoveryConsecutivePassedWeeks;
        const shouldBeClosed = recoverySatisfied;
        const shouldEnforceRatchetedRecoveryThreshold =
          candidateCloseoutConfig.recoveryThresholdRatcheting.enabled &&
          !candidateTrend.trendDetected &&
          candidateTrend.consecutivePassedWeeks >=
            candidateCloseoutConfig.recoveryThresholdRatcheting.minConsecutivePassedWeeksToRequireTarget;
        const recoveryThresholdRatcheted =
          candidateCloseoutConfig.recoveryConsecutivePassedWeeks >=
          candidateCloseoutConfig.recoveryThresholdRatcheting.targetRecoveryConsecutivePassedWeeks;

        candidateCloseout = {
          ...candidateCloseout,
          recoverySatisfied,
          shouldHaveOpenIssue,
          shouldHoldOpenBeforeRecovery,
          shouldBeClosed,
          shouldEnforceRatchetedRecoveryThreshold,
          recoveryThresholdRatcheted
        };

        if (candidateCloseoutConfig.recoveryThresholdRatcheting.enabled) {
          checks.push({
            id: `${descriptor.checkIdPrefix}-recovery-threshold-ratchet`,
            name: `${descriptor.displayName} recovery threshold ratchet`,
            expected: shouldEnforceRatchetedRecoveryThreshold
              ? `>= ${candidateCloseoutConfig.recoveryThresholdRatcheting.targetRecoveryConsecutivePassedWeeks}`
              : `n/a (consecutive passed weeks < ${candidateCloseoutConfig.recoveryThresholdRatcheting.minConsecutivePassedWeeksToRequireTarget} or trend active)`,
            actual: String(candidateCloseoutConfig.recoveryConsecutivePassedWeeks),
            pass: !shouldEnforceRatchetedRecoveryThreshold || recoveryThresholdRatcheted
          });
        }

        checks.push({
          id: `${descriptor.checkIdPrefix}-open-issue-presence`,
          name: `${descriptor.displayName} issue presence`,
          expected: shouldHaveOpenIssue
            ? `>= ${candidateCloseoutConfig.minOpenIssuesWhenTrendDetected}`
            : 'n/a (trend not detected)',
          actual: String(candidateIssues.length),
          pass: !shouldHaveOpenIssue || candidateIssues.length >= candidateCloseoutConfig.minOpenIssuesWhenTrendDetected
        });

        checks.push({
          id: `${descriptor.checkIdPrefix}-observation-hold-before-recovery`,
          name: `${descriptor.displayName} observation hold before recovery closeout`,
          expected: shouldHoldOpenBeforeRecovery
            ? `>= ${candidateCloseoutConfig.minOpenIssuesBeforeRecoveryCloseout}`
            : 'n/a (recovery reached or trend active)',
          actual: String(candidateIssues.length),
          pass:
            !shouldHoldOpenBeforeRecovery ||
            candidateIssues.length >= candidateCloseoutConfig.minOpenIssuesBeforeRecoveryCloseout
        });

        checks.push({
          id: `${descriptor.checkIdPrefix}-closeout-after-recovery`,
          name: `${descriptor.displayName} closeout after recovery`,
          expected: shouldBeClosed
            ? `<= ${candidateCloseoutConfig.maxOpenIssuesAfterRecovery}`
            : 'n/a (recovery not reached)',
          actual: String(candidateIssues.length),
          pass: !shouldBeClosed || candidateIssues.length <= candidateCloseoutConfig.maxOpenIssuesAfterRecovery
        });
      }
    }

    candidateCloseouts.push(candidateCloseout);
  }

  const candidateCloseout =
    candidateCloseouts.find((item) => item.reason === P1_TIMEOUT_TREND_REASON) ||
    candidateCloseouts[0] || {
      enabled: false,
      reason: P1_TIMEOUT_TREND_REASON,
      checkIdPrefix: 'timeout-candidate',
      displayName: 'Timeout candidate',
      summaryPresent: summarySnapshot.present,
      summaryGeneratedAtIso: summarySnapshot.generatedAtIso,
      summaryAgeHours,
      summaryMaxAgeHours,
      summaryFutureSkewMinutes,
      summaryMaxFutureSkewMinutes,
      summaryVerdict: summarySnapshot.verdict,
      candidateOpenIssues: 0
    };
  const timeoutStabilityCandidateCloseout =
    candidateCloseouts.find((item) => item.reason === P1_TIMEOUT_STABILITY_TREND_REASON) || {
      enabled: false,
      reason: P1_TIMEOUT_STABILITY_TREND_REASON,
      checkIdPrefix: 'timeout-stability-candidate',
      displayName: 'Timeout stability candidate',
      summaryPresent: summarySnapshot.present,
      summaryGeneratedAtIso: summarySnapshot.generatedAtIso,
      summaryAgeHours,
      summaryMaxAgeHours,
      summaryFutureSkewMinutes,
      summaryMaxFutureSkewMinutes,
      summaryVerdict: summarySnapshot.verdict,
      candidateOpenIssues: 0
    };

  return {
    passed: checks.every((check) => check.pass),
    checks,
    metrics,
    issues: evaluatedIssues,
    overdueIssues,
    labelDriftIssues,
    timeoutCandidateIssues,
    timeoutStabilityCandidateIssues,
    candidateCloseouts,
    candidateCloseout,
    timeoutStabilityCandidateCloseout,
    meta: {
      gateId: toTrimmedString(gateConfig.gateId) || 'v2-p1-escalation-timeout-gate',
      titlePrefixes,
      requiredLabels,
      maxLabelDriftIssues,
      maxOpenHours,
      maxIdleHours,
      maxOverdueIssues,
      summaryRequireGeneratedAt,
      summaryMaxAgeHours,
      summaryMaxFutureSkewMinutes,
      summaryGeneratedAtIso: summarySnapshot.generatedAtIso,
      summaryAgeHours,
      summaryFutureSkewMinutes
    }
  };
};

export const buildTimeoutReminderMarker = ({ issueNumber, workflowRunId }) => {
  const encodedIssue = encodeURIComponent(String(issueNumber || 'unknown'));
  const encodedRun = encodeURIComponent(toTrimmedString(workflowRunId) || 'manual');
  return `${REMINDER_MARKER_PREFIX}${encodedIssue}:${encodedRun} -->`;
};

export const buildTimeoutReminderComment = ({ issue, runtimeContext, now }) => {
  const marker = buildTimeoutReminderMarker({
    issueNumber: issue.issueNumber,
    workflowRunId: runtimeContext?.workflowRunId
  });

  const lines = [];
  lines.push(marker);
  lines.push('## V2 P1 Escalation Timeout Reminder');
  lines.push('');
  lines.push(`- Reason: \`${issue.reason}\``);
  lines.push(`- Open hours: ${Number.isFinite(issue.openHours) ? issue.openHours : 'n/a'}`);
  lines.push(`- Idle hours: ${Number.isFinite(issue.idleHours) ? issue.idleHours : 'n/a'}`);
  lines.push(`- Timeout reasons: ${issue.overdueReasons.join(', ') || 'n/a'}`);
  lines.push(`- Reminder timestamp: ${now.toISOString()} (UTC)`);
  lines.push(`- Dispatch workflow run: ${toTrimmedString(runtimeContext?.workflowRunUrl) || 'n/a'}`);
  lines.push(`- Dispatch workflow artifacts: ${toTrimmedString(runtimeContext?.workflowArtifactsUrl) || 'n/a'}`);
  lines.push('');
  lines.push('Please update owner, mitigation status, and ETA in this issue.');
  lines.push('');

  return {
    marker,
    body: lines.join('\n')
  };
};

const renderCheckStatus = (check) => (check.pass ? 'PASS' : 'FAIL');

const renderCandidateCloseoutSection = (lines, candidateCloseout) => {
  const displayName = toTrimmedString(candidateCloseout?.displayName) || 'Candidate';
  if (!candidateCloseout?.enabled) {
    lines.push('- Closeout check disabled.');
    lines.push('');
    return;
  }

  if (!candidateCloseout?.summaryPresent) {
    lines.push('- Closeout check enabled but summary-json input is missing.');
    lines.push('');
    return;
  }

  lines.push(`- Candidate reason: \`${candidateCloseout.reason}\``);
  lines.push(`- Summary verdict: ${candidateCloseout.summaryVerdict}`);
  lines.push(`- Summary generated at: ${candidateCloseout.summaryGeneratedAtIso || 'n/a'}`);
  lines.push(
    `- Summary age: ${Number.isFinite(candidateCloseout.summaryAgeHours) ? `${candidateCloseout.summaryAgeHours}h` : 'n/a'} (max: ${candidateCloseout.summaryMaxAgeHours}h)`
  );
  lines.push(
    `- Summary future skew: ${
      Number.isFinite(candidateCloseout.summaryFutureSkewMinutes) ? `${candidateCloseout.summaryFutureSkewMinutes}m` : 'n/a'
    } (max ahead: ${candidateCloseout.summaryMaxFutureSkewMinutes}m)`
  );
  lines.push(
    `- ${displayName} trend detected: ${candidateCloseout.trendDetected ? 'yes' : 'no'} (failed weeks: ${
      candidateCloseout.consecutiveFailedWeeks
    })`
  );
  lines.push(
    `- ${displayName} consecutive passed weeks: ${candidateCloseout.consecutivePassedWeeks} (recovery threshold: ${candidateCloseout.recoveryConsecutivePassedWeeks})`
  );
  lines.push(`- Recovery satisfied: ${candidateCloseout.recoverySatisfied ? 'yes' : 'no'}`);
  lines.push(`- Candidate open issues: ${candidateCloseout.candidateOpenIssues}`);
  lines.push(`- Should have open issue: ${candidateCloseout.shouldHaveOpenIssue ? 'yes' : 'no'}`);
  lines.push(
    `- Should hold open before recovery closeout: ${candidateCloseout.shouldHoldOpenBeforeRecovery ? 'yes' : 'no'} (min open: ${candidateCloseout.minOpenIssuesBeforeRecoveryCloseout})`
  );
  lines.push(`- Should be closed: ${candidateCloseout.shouldBeClosed ? 'yes' : 'no'}`);
  lines.push(
    `- Recovery threshold ratcheting enabled: ${candidateCloseout.recoveryThresholdRatchetingEnabled ? 'yes' : 'no'}`
  );
  if (candidateCloseout.recoveryThresholdRatchetingEnabled) {
    lines.push(
      `- Recovery threshold ratchet enforce condition met: ${
        candidateCloseout.shouldEnforceRatchetedRecoveryThreshold ? 'yes' : 'no'
      } (min consecutive passed weeks: ${candidateCloseout.ratchetMinConsecutivePassedWeeksToRequireTarget})`
    );
    lines.push(
      `- Recovery threshold target/current: ${candidateCloseout.ratchetTargetRecoveryConsecutivePassedWeeks} / ${candidateCloseout.recoveryConsecutivePassedWeeks}`
    );
    lines.push(`- Recovery threshold ratcheted: ${candidateCloseout.recoveryThresholdRatcheted ? 'yes' : 'no'}`);
  }
  lines.push('');
};

export const renderP1EscalationTimeoutGateReport = ({
  generatedAt,
  configPath,
  issueSource,
  summarySource,
  runtimeContext,
  result,
  reminder
}) => {
  const lines = [];
  lines.push('# V2 P1 Escalation Timeout Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Issue source: \`${issueSource}\``);
  lines.push(`- Summary source: \`${toTrimmedString(summarySource) || 'none'}\``);
  lines.push(`- Workflow run URL: ${toTrimmedString(runtimeContext?.workflowRunUrl) || 'n/a'}`);
  lines.push(`- Workflow artifacts URL: ${toTrimmedString(runtimeContext?.workflowArtifactsUrl) || 'n/a'}`);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push('');

  lines.push('## Timeout overview');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Issue candidates | ${result.metrics.issueCandidates} |`);
  lines.push(`| Overdue issues | ${result.metrics.overdueIssues} |`);
  lines.push(`| Label drift issues | ${result.metrics.labelDriftIssues} |`);
  lines.push(`| Overdue by open timeout | ${result.metrics.overdueByOpenTimeout} |`);
  lines.push(`| Overdue by idle timeout | ${result.metrics.overdueByIdleTimeout} |`);
  lines.push(`| Reason parsed from marker | ${result.metrics.reasonsFromMarker} |`);
  lines.push(`| Reason parsed from title | ${result.metrics.reasonsFromTitle} |`);
  lines.push(`| Summary present | ${result.metrics.summaryPresent} |`);
  lines.push(`| Summary generatedAt present | ${result.metrics.summaryGeneratedAtPresent} |`);
  lines.push(
    `| Summary age (hours) | ${Number.isFinite(result.metrics.summaryAgeHours) ? result.metrics.summaryAgeHours : 'n/a'} |`
  );
  lines.push(
    `| Summary future skew (minutes) | ${
      Number.isFinite(result.metrics.summaryFutureSkewMinutes) ? result.metrics.summaryFutureSkewMinutes : 'n/a'
    } |`
  );
  lines.push(`| Timeout candidate open issues | ${result.metrics.timeoutCandidateOpenIssues} |`);
  lines.push(`| Timeout stability candidate open issues | ${result.metrics.timeoutStabilityCandidateOpenIssues} |`);
  lines.push('');

  lines.push('## Gate checks');
  lines.push('');
  lines.push('| Check | Expected | Actual | Result |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of result.checks) {
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${renderCheckStatus(check)} |`);
  }
  lines.push('');

  lines.push('## Reminder execution');
  lines.push('');
  lines.push(`- Reminder enabled: ${reminder?.enabled ? 'yes' : 'no'}`);
  lines.push(`- Reminder attempted: ${Number(reminder?.attempted || 0)}`);
  lines.push(`- Reminder posted: ${Number(reminder?.posted || 0)}`);
  lines.push(`- Reminder skipped: ${Number(reminder?.skipped || 0)}`);
  lines.push(`- Reminder failed: ${Number(reminder?.failed || 0)}`);
  lines.push('');

  lines.push('## Required label drift issues');
  lines.push('');
  if (!Array.isArray(result.labelDriftIssues) || result.labelDriftIssues.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Issue | Reason | Missing required labels | Current labels |');
    lines.push('| --- | --- | --- | --- |');
    for (const issue of result.labelDriftIssues) {
      const issueLabel = issue.url ? `[#${issue.issueNumber || '?'}](${issue.url})` : `#${issue.issueNumber || '?'}`;
      lines.push(
        `| ${issueLabel} | ${issue.reason} | ${issue.missingRequiredLabels.join(', ') || '-'} | ${
          issue.labels.join(', ') || '-'
        } |`
      );
    }
  }
  lines.push('');

  lines.push('## Timeout candidate closeout');
  lines.push('');
  renderCandidateCloseoutSection(lines, result.candidateCloseout);

  lines.push('## Timeout stability candidate closeout');
  lines.push('');
  renderCandidateCloseoutSection(lines, result.timeoutStabilityCandidateCloseout);
  lines.push('');

  lines.push('## Overdue issues');
  lines.push('');
  if (!Array.isArray(result.overdueIssues) || result.overdueIssues.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Issue | Reason | Open hours | Idle hours | Timeout reasons | Reminder |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const issue of result.overdueIssues) {
      const issueLabel = issue.url ? `[#${issue.issueNumber || '?'}](${issue.url})` : `#${issue.issueNumber || '?'}`;
      const reminderDecision = toTrimmedString(issue.reminderDecision) || '-';
      lines.push(
        `| ${issueLabel} | ${issue.reason} | ${Number.isFinite(issue.openHours) ? issue.openHours : 'n/a'} | ${
          Number.isFinite(issue.idleHours) ? issue.idleHours : 'n/a'
        } | ${issue.overdueReasons.join(', ') || '-'} | ${reminderDecision} |`
      );
    }
  }
  lines.push('');

  lines.push('## Timeout candidate issues');
  lines.push('');
  if (!Array.isArray(result.timeoutCandidateIssues) || result.timeoutCandidateIssues.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Issue | Reason | Open hours | Idle hours |');
    lines.push('| --- | --- | --- | --- |');
    for (const issue of result.timeoutCandidateIssues) {
      const issueLabel = issue.url ? `[#${issue.issueNumber || '?'}](${issue.url})` : `#${issue.issueNumber || '?'}`;
      lines.push(
        `| ${issueLabel} | ${issue.reason} | ${Number.isFinite(issue.openHours) ? issue.openHours : 'n/a'} | ${
          Number.isFinite(issue.idleHours) ? issue.idleHours : 'n/a'
        } |`
      );
    }
  }
  lines.push('');

  lines.push('## Timeout stability candidate issues');
  lines.push('');
  if (!Array.isArray(result.timeoutStabilityCandidateIssues) || result.timeoutStabilityCandidateIssues.length === 0) {
    lines.push('- none');
  } else {
    lines.push('| Issue | Reason | Open hours | Idle hours |');
    lines.push('| --- | --- | --- | --- |');
    for (const issue of result.timeoutStabilityCandidateIssues) {
      const issueLabel = issue.url ? `[#${issue.issueNumber || '?'}](${issue.url})` : `#${issue.issueNumber || '?'}`;
      lines.push(
        `| ${issueLabel} | ${issue.reason} | ${Number.isFinite(issue.openHours) ? issue.openHours : 'n/a'} | ${
          Number.isFinite(issue.idleHours) ? issue.idleHours : 'n/a'
        } |`
      );
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
};
