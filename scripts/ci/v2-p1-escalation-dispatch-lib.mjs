const DEFAULT_TITLE_PREFIX = '[V2-W15-17][P1 Escalation]';
const DEFAULT_LABELS = ['p1', 'v2', 'release-health', 'need-triage'];
const DEFAULT_OWNER_ROUTE_LABEL_PREFIX = 'owner-route';
const DISPATCH_QUALITY_TREND_REASON = 'dispatch-quality-consecutive-failed-weeks';
const P1_TIMEOUT_TREND_REASON = 'p1-timeout-consecutive-failed-weeks';
const P1_TIMEOUT_STABILITY_TREND_REASON = 'p1-timeout-stability-consecutive-failed-weeks';
const REASON_MARKER_PREFIX = '<!-- v2-p1-reason:';
const REASON_MARKER_PATTERN = /<!--\s*v2-p1-reason:([^>\s]+)\s*-->/i;
const TEMPLATE_TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const OWNER_ROUTE_VALUE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_:-]*$/;
const OWNER_ROUTE_LABEL_PREFIX_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const ISSUE_FORM_FIELD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const TEMPLATE_TOKEN_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const DEFAULT_ISSUE_BODY_TEMPLATE = [
  '{{reasonMarker}}',
  '# V2 P1 Escalation Card',
  '',
  '## Trigger',
  '',
  '- Reason: `{{reason}}`',
  '- Current: {{current}}',
  '- Previous: {{previous}}',
  '- Delta: {{deltaSigned}}',
  '- History (new -> old): {{history}}',
  '- Signals: {{signals}}',
  '- Weekly summary verdict: {{summaryVerdict}}',
  '- Weekly summary generated at: {{summaryGeneratedAt}}',
  '- Window days: {{windowDays}}',
  '- Dispatch quality passed: {{dispatchQualityPassed}}',
  '- Dispatch quality latest run failed: {{dispatchQualityLatestRunFailed}}',
  '- Dispatch quality consecutive failure detected: {{dispatchQualityConsecutiveFailureDetected}}',
  '- Dispatch quality consecutive failed weeks: {{dispatchQualityConsecutiveFailedWeeks}} (threshold: {{dispatchQualityConsecutiveFailureThreshold}})',
  '- Dispatch quality latest run: {{dispatchQualityLatestRun}}',
  '- Dispatch quality latest run URL: {{dispatchQualityLatestRunUrl}}',
  '- Timeout gate passed: {{timeoutPassed}}',
  '- Timeout gate latest run failed: {{timeoutLatestRunFailed}}',
  '- Timeout gate consecutive failure detected: {{timeoutConsecutiveFailureDetected}}',
  '- Timeout gate consecutive failed weeks: {{timeoutConsecutiveFailedWeeks}} (threshold: {{timeoutConsecutiveFailureThreshold}})',
  '- Timeout gate latest run: {{timeoutLatestRun}}',
  '- Timeout gate latest run URL: {{timeoutLatestRunUrl}}',
  '- Timeout stability gate passed: {{timeoutStabilityPassed}}',
  '- Timeout stability gate latest run failed: {{timeoutStabilityLatestRunFailed}}',
  '- Timeout stability gate consecutive failure detected: {{timeoutStabilityConsecutiveFailureDetected}}',
  '- Timeout stability gate consecutive failed weeks: {{timeoutStabilityConsecutiveFailedWeeks}} (threshold: {{timeoutStabilityConsecutiveFailureThreshold}})',
  '- Timeout stability gate latest run: {{timeoutStabilityLatestRun}}',
  '- Timeout stability gate latest run URL: {{timeoutStabilityLatestRunUrl}}',
  '- Dispatch workflow run URL: {{dispatchWorkflowRunUrl}}',
  '- Dispatch workflow artifacts URL: {{dispatchWorkflowArtifactsUrl}}',
  '- Dispatch workflow run ID: {{dispatchWorkflowRunId}}',
  '- Dispatch workflow run attempt: {{dispatchWorkflowRunAttempt}}',
  '- Owner route: `{{ownerRoute}}`',
  '- Owner route source: `{{ownerRouteSource}}`',
  '',
  '## Expected actions',
  '',
  '1. Confirm root cause and impacted surface.',
  '2. Submit fix PR with tests and rollback note.',
  '3. Link verification evidence from nightly/regression reports.',
  '',
  '## Evidence',
  '',
  '- reports/v2-release-health-summary.md',
  '- reports/v2-release-health-summary.json',
  '- reports/v2-p1-dispatch-quality-gate.md',
  '- reports/v2-p1-dispatch-quality-gate.json',
  '- reports/v2-p1-escalation-timeout-gate.md',
  '- reports/v2-p1-escalation-timeout-gate.json',
  '- reports/v2-p1-timeout-stability-observation-gate.md',
  '- reports/v2-p1-timeout-stability-observation-gate.json',
  ''
].join('\n');

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const uniqueStrings = (values) => {
  const output = [];
  const seen = new Set();

  for (const value of values) {
    const text = toTrimmedString(value);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    output.push(text);
  }

  return output;
};

const toNonNegativeInteger = (value, fallback) => {
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

const toDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toHours = (durationMs) => {
  const numeric = Number(durationMs);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Number((numeric / (1000 * 60 * 60)).toFixed(3));
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

const toReasonItem = (item) => {
  const reason = toTrimmedString(item?.reason);
  if (!reason) {
    return null;
  }

  const history = Array.isArray(item?.history)
    ? item.history.map((value) => Number(value)).filter((value) => Number.isFinite(value))
    : [];

  const signals = uniqueStrings(Array.isArray(item?.signals) ? item.signals : []);

  return {
    reason,
    current: Number.isFinite(Number(item?.current)) ? Number(item.current) : 0,
    previous: Number.isFinite(Number(item?.previous)) ? Number(item.previous) : 0,
    delta: Number.isFinite(Number(item?.delta)) ? Number(item.delta) : 0,
    history,
    signals
  };
};

const dedupeReasonItems = (items) => {
  const result = [];
  const seen = new Set();

  for (const item of items) {
    if (!item || seen.has(item.reason)) {
      continue;
    }
    seen.add(item.reason);
    result.push(item);
  }

  return result;
};

const buildDispatchQualityTrendReasonItem = (summary) => {
  if (!isObject(summary) || summary.dispatchQualityConsecutiveFailureDetected !== true) {
    return null;
  }

  const consecutiveFailedWeeks = toNonNegativeInteger(summary.dispatchQualityConsecutiveFailedWeeks, 0);
  const previousWeeks = Math.max(0, consecutiveFailedWeeks - 1);
  const latestRun = isObject(summary.dispatchQualityLatestRun) ? summary.dispatchQualityLatestRun : {};
  const latestConclusion = toTrimmedString(latestRun.conclusion) || 'unknown';
  const threshold = toPositiveInteger(summary?.policy?.dispatchQuality?.consecutiveFailureWeeks, 2);

  return {
    reason: DISPATCH_QUALITY_TREND_REASON,
    current: consecutiveFailedWeeks,
    previous: previousWeeks,
    delta: consecutiveFailedWeeks - previousWeeks,
    history: [consecutiveFailedWeeks, previousWeeks],
    signals: uniqueStrings([
      'dispatch-quality-trend-failed',
      summary.dispatchQualityLatestRunFailed ? 'dispatch-quality-latest-run-failed' : '',
      `dispatch-quality-latest:${latestConclusion}`,
      `dispatch-quality-threshold:${threshold}`
    ])
  };
};

const buildTimeoutTrendReasonItem = (summary) => {
  if (!isObject(summary) || summary.timeoutConsecutiveFailureDetected !== true) {
    return null;
  }

  const consecutiveFailedWeeks = toNonNegativeInteger(summary.timeoutConsecutiveFailedWeeks, 0);
  const previousWeeks = Math.max(0, consecutiveFailedWeeks - 1);
  const latestRun = isObject(summary?.timeoutLatestRun) ? summary.timeoutLatestRun : {};
  const latestConclusion = toTrimmedString(latestRun.conclusion) || 'unknown';
  const threshold = toPositiveInteger(summary?.policy?.timeout?.consecutiveFailureWeeks, 2);

  return {
    reason: P1_TIMEOUT_TREND_REASON,
    current: consecutiveFailedWeeks,
    previous: previousWeeks,
    delta: consecutiveFailedWeeks - previousWeeks,
    history: [consecutiveFailedWeeks, previousWeeks],
    signals: uniqueStrings([
      'timeout-gate-trend-failed',
      summary.timeoutLatestRunFailed ? 'timeout-gate-latest-run-failed' : '',
      `timeout-gate-latest:${latestConclusion}`,
      `timeout-gate-threshold:${threshold}`
    ])
  };
};

const buildTimeoutStabilityTrendReasonItem = (summary) => {
  if (!isObject(summary) || summary.timeoutStabilityConsecutiveFailureDetected !== true) {
    return null;
  }

  const consecutiveFailedWeeks = toNonNegativeInteger(summary.timeoutStabilityConsecutiveFailedWeeks, 0);
  const previousWeeks = Math.max(0, consecutiveFailedWeeks - 1);
  const latestRun = isObject(summary?.timeoutStabilityLatestRun) ? summary.timeoutStabilityLatestRun : {};
  const latestConclusion = toTrimmedString(latestRun.conclusion) || 'unknown';
  const threshold = toPositiveInteger(summary?.policy?.timeoutStability?.consecutiveFailureWeeks, 2);

  return {
    reason: P1_TIMEOUT_STABILITY_TREND_REASON,
    current: consecutiveFailedWeeks,
    previous: previousWeeks,
    delta: consecutiveFailedWeeks - previousWeeks,
    history: [consecutiveFailedWeeks, previousWeeks],
    signals: uniqueStrings([
      'timeout-stability-gate-trend-failed',
      summary.timeoutStabilityLatestRunFailed ? 'timeout-stability-gate-latest-run-failed' : '',
      `timeout-stability-gate-latest:${latestConclusion}`,
      `timeout-stability-gate-threshold:${threshold}`
    ])
  };
};

const renderTemplate = (template, context) => {
  const source = toTrimmedString(template);
  if (!source) {
    return '';
  }

  return source.replace(TEMPLATE_TOKEN_PATTERN, (_, key) => {
    const value = context?.[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
};

const collectTemplateTokens = (template) => {
  const tokens = new Set();
  const source = toTrimmedString(template);
  if (!source) {
    return tokens;
  }

  TEMPLATE_TOKEN_PATTERN.lastIndex = 0;
  let match = TEMPLATE_TOKEN_PATTERN.exec(source);
  while (match) {
    if (match[1]) {
      tokens.add(match[1]);
    }
    match = TEMPLATE_TOKEN_PATTERN.exec(source);
  }
  TEMPLATE_TOKEN_PATTERN.lastIndex = 0;
  return tokens;
};

const collectAllTemplateTokens = (templates) => {
  const tokenSet = collectTemplateTokens(DEFAULT_ISSUE_BODY_TEMPLATE);
  const defaultTemplate = toTrimmedString(templates?.defaultTemplate);
  if (defaultTemplate) {
    for (const token of collectTemplateTokens(defaultTemplate)) {
      tokenSet.add(token);
    }
  }

  const reasonTemplates = isObject(templates?.reasonTemplates) ? templates.reasonTemplates : {};
  for (const templateText of Object.values(reasonTemplates)) {
    for (const token of collectTemplateTokens(templateText)) {
      tokenSet.add(token);
    }
  }

  return tokenSet;
};

const validateOwnerRouteValue = (route) => OWNER_ROUTE_VALUE_PATTERN.test(toTrimmedString(route));

const toRetryableStatusSet = (statuses) => {
  const source = Array.isArray(statuses) ? statuses : [429, 500, 502, 503, 504];
  const values = source
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 400 && value <= 599);
  if (values.length === 0) {
    return new Set([429, 500, 502, 503, 504]);
  }
  return new Set(values);
};

const ensureDelay = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.floor(numeric);
};

export const buildReasonMarker = (reason) => `${REASON_MARKER_PREFIX}${encodeURIComponent(reason)} -->`;

export const extractReasonFromMarker = (text) => {
  const content = toTrimmedString(text);
  if (!content) {
    return null;
  }

  const match = content.match(REASON_MARKER_PATTERN);
  if (!match) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(match[1]);
    return toTrimmedString(decoded) || null;
  } catch {
    return toTrimmedString(match[1]) || null;
  }
};

export const validateDispatchSchema = ({ config, templates }) => {
  const errors = [];
  const warnings = [];
  const issueConfig = isObject(config?.issue) ? config.issue : {};
  const summaryConfigRaw = config?.summary;
  const summaryConfig = isObject(summaryConfigRaw) ? summaryConfigRaw : null;

  if (issueConfig.failOnMissingOwnerRoute !== undefined && typeof issueConfig.failOnMissingOwnerRoute !== 'boolean') {
    errors.push('issue.failOnMissingOwnerRoute must be a boolean when provided.');
  }

  const ownerRouteLabelPrefix = toTrimmedString(issueConfig.ownerRouteLabelPrefix);
  if (issueConfig.ownerRouteLabelPrefix !== undefined) {
    if (!ownerRouteLabelPrefix) {
      errors.push('issue.ownerRouteLabelPrefix cannot be empty when provided.');
    } else if (!OWNER_ROUTE_LABEL_PREFIX_PATTERN.test(ownerRouteLabelPrefix)) {
      errors.push('issue.ownerRouteLabelPrefix must match /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.');
    }
  }

  const defaultOwnerRoute = toTrimmedString(issueConfig.defaultOwnerRoute);
  if (defaultOwnerRoute && !validateOwnerRouteValue(defaultOwnerRoute)) {
    errors.push('issue.defaultOwnerRoute contains invalid characters.');
  }

  if (issueConfig.reasonOwnerRoutes !== undefined && !isObject(issueConfig.reasonOwnerRoutes)) {
    errors.push('issue.reasonOwnerRoutes must be an object when provided.');
  }

  if (isObject(issueConfig.reasonOwnerRoutes)) {
    for (const [reason, route] of Object.entries(issueConfig.reasonOwnerRoutes)) {
      const normalizedReason = toTrimmedString(reason);
      const normalizedRoute = toTrimmedString(route);
      if (!normalizedReason) {
        errors.push('issue.reasonOwnerRoutes contains an empty reason key.');
        continue;
      }
      if (!normalizedRoute) {
        errors.push(`issue.reasonOwnerRoutes["${normalizedReason}"] cannot be empty.`);
        continue;
      }
      if (!validateOwnerRouteValue(normalizedRoute)) {
        errors.push(`issue.reasonOwnerRoutes["${normalizedReason}"] has invalid ownerRoute value.`);
      }
    }
  }

  if (issueConfig.ownerRoutePatterns !== undefined && !Array.isArray(issueConfig.ownerRoutePatterns)) {
    errors.push('issue.ownerRoutePatterns must be an array when provided.');
  }

  const ownerRoutePatterns = Array.isArray(issueConfig.ownerRoutePatterns) ? issueConfig.ownerRoutePatterns : [];
  for (const [index, routeRule] of ownerRoutePatterns.entries()) {
    const patternText = toTrimmedString(routeRule?.pattern);
    const ownerRoute = toTrimmedString(routeRule?.ownerRoute);
    if (!patternText) {
      errors.push(`issue.ownerRoutePatterns[${index}].pattern is required.`);
    } else {
      try {
        // Validate regex syntax early so dispatch doesn't fail mid-run.
        // eslint-disable-next-line no-new
        new RegExp(patternText);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`issue.ownerRoutePatterns[${index}].pattern is invalid regex: ${message}`);
      }
    }

    if (!ownerRoute) {
      errors.push(`issue.ownerRoutePatterns[${index}].ownerRoute is required.`);
    } else if (!validateOwnerRouteValue(ownerRoute)) {
      errors.push(`issue.ownerRoutePatterns[${index}].ownerRoute has invalid characters.`);
    }
  }

  const issueFormConfig = isObject(issueConfig.issueForm) ? issueConfig.issueForm : null;
  const requiredFieldIds = Array.isArray(issueFormConfig?.requiredFieldIds) ? issueFormConfig.requiredFieldIds : [];
  const fieldMap = isObject(issueFormConfig?.fieldMap) ? issueFormConfig.fieldMap : {};
  const enforceTemplateCoverage = toBoolean(issueFormConfig?.enforceTemplateCoverage, true);

  if (issueFormConfig) {
    if (requiredFieldIds.length === 0) {
      errors.push('issue.issueForm.requiredFieldIds must be a non-empty array.');
    }

    if (!isObject(issueFormConfig.fieldMap)) {
      errors.push('issue.issueForm.fieldMap must be an object.');
    }

    const templateTokens = collectAllTemplateTokens(templates);

    for (const fieldId of requiredFieldIds) {
      const normalizedFieldId = toTrimmedString(fieldId);
      if (!ISSUE_FORM_FIELD_ID_PATTERN.test(normalizedFieldId)) {
        errors.push(`issue.issueForm.requiredFieldIds contains invalid field id "${String(fieldId)}".`);
        continue;
      }

      const mappedToken = toTrimmedString(fieldMap[normalizedFieldId]);
      if (!mappedToken) {
        errors.push(`issue.issueForm.fieldMap missing mapping for "${normalizedFieldId}".`);
        continue;
      }

      if (!TEMPLATE_TOKEN_NAME_PATTERN.test(mappedToken)) {
        errors.push(`issue.issueForm.fieldMap["${normalizedFieldId}"] must map to a valid template token.`);
        continue;
      }

      if (enforceTemplateCoverage && !templateTokens.has(mappedToken)) {
        errors.push(`issue.issueForm field "${normalizedFieldId}" maps to token "${mappedToken}" not present in templates.`);
      }
    }

    for (const [fieldId, token] of Object.entries(fieldMap)) {
      const normalizedFieldId = toTrimmedString(fieldId);
      const normalizedToken = toTrimmedString(token);
      if (!ISSUE_FORM_FIELD_ID_PATTERN.test(normalizedFieldId)) {
        errors.push(`issue.issueForm.fieldMap contains invalid field id "${fieldId}".`);
      }
      if (!TEMPLATE_TOKEN_NAME_PATTERN.test(normalizedToken)) {
        errors.push(`issue.issueForm.fieldMap["${fieldId}"] has invalid token "${token}".`);
      }
    }
  } else {
    warnings.push('issue.issueForm schema is not configured; template token coverage check is skipped.');
  }

  if (summaryConfigRaw !== undefined && !summaryConfig) {
    errors.push('summary must be an object when provided.');
  }

  if (summaryConfig) {
    if (summaryConfig.requireGeneratedAt !== undefined && typeof summaryConfig.requireGeneratedAt !== 'boolean') {
      errors.push('summary.requireGeneratedAt must be a boolean when provided.');
    }

    if (summaryConfig.maxAgeHours !== undefined) {
      const maxAgeHours = Number(summaryConfig.maxAgeHours);
      if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
        errors.push('summary.maxAgeHours must be a positive number when provided.');
      }
    }

    if (summaryConfig.maxFutureSkewMinutes !== undefined) {
      const maxFutureSkewMinutes = Number(summaryConfig.maxFutureSkewMinutes);
      if (!Number.isFinite(maxFutureSkewMinutes) || maxFutureSkewMinutes < 0) {
        errors.push('summary.maxFutureSkewMinutes must be a non-negative number when provided.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const buildDispatchIdempotencyKey = ({ titlePrefix, reason }) => {
  const prefix = toTrimmedString(titlePrefix) || DEFAULT_TITLE_PREFIX;
  const reasonText = toTrimmedString(reason);
  return `${prefix}::${reasonText}`;
};

export const toRetryPolicy = (retryConfig = {}) => {
  const maxAttempts = Math.max(1, toNonNegativeInteger(retryConfig.maxAttempts, 3));
  const baseDelayMs = ensureDelay(retryConfig.baseDelayMs, 1000);
  const maxDelayMs = Math.max(baseDelayMs, ensureDelay(retryConfig.maxDelayMs, 8000));
  const retryStatusSet = toRetryableStatusSet(retryConfig.retryOnStatuses);
  return {
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    retryStatusSet
  };
};

export const isRetryableIssueCreateError = (error, retryStatusSet) => {
  const status = Number(error?.status);
  if (!Number.isInteger(status)) {
    return false;
  }
  const statusSet = retryStatusSet instanceof Set ? retryStatusSet : toRetryableStatusSet();
  return statusSet.has(status);
};

export const runWithRetry = async ({
  task,
  policy,
  shouldRetry,
  sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))
}) => {
  if (typeof task !== 'function') {
    throw new Error('runWithRetry requires a task function.');
  }

  const normalizedPolicy = toRetryPolicy(policy);
  const retryPredicate = typeof shouldRetry === 'function' ? shouldRetry : () => false;

  let attempt = 0;
  while (attempt < normalizedPolicy.maxAttempts) {
    attempt += 1;
    try {
      const value = await task(attempt);
      return {
        value,
        attempts: attempt
      };
    } catch (error) {
      const canRetry = attempt < normalizedPolicy.maxAttempts && retryPredicate(error, attempt, normalizedPolicy);
      if (!canRetry) {
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        wrappedError.attempts = attempt;
        throw wrappedError;
      }

      const computedDelay = Math.min(
        normalizedPolicy.maxDelayMs,
        normalizedPolicy.baseDelayMs * 2 ** Math.max(0, attempt - 1)
      );
      await sleep(computedDelay);
    }
  }

  throw new Error('runWithRetry reached an unexpected terminal state.');
};

export const evaluateDispatchSummaryFreshness = ({ summary, config, now }) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new Error('Invalid now timestamp');
  }

  const summaryConfig = isObject(config?.summary) ? config.summary : {};
  const requireGeneratedAt = toBoolean(summaryConfig.requireGeneratedAt, true);
  const maxAgeHours = toPositiveNumber(summaryConfig.maxAgeHours, 36);
  const maxFutureSkewMinutes = toNonNegativeNumber(summaryConfig.maxFutureSkewMinutes, 5);
  const present = isObject(summary);
  const generatedAtDate = present ? toDate(summary.generatedAt) ?? toDate(summary.generated_at) : null;
  const generatedAtIso = generatedAtDate ? generatedAtDate.toISOString() : null;
  const ageHours = generatedAtDate ? toHours(nowDate.getTime() - generatedAtDate.getTime()) : null;
  const futureSkewMinutes = generatedAtDate
    ? Number(((generatedAtDate.getTime() - nowDate.getTime()) / (1000 * 60)).toFixed(2))
    : null;

  const checks = [
    {
      id: 'dispatch-summary-present',
      name: 'Dispatch summary presence',
      expected: 'present',
      actual: present ? 'present' : 'missing',
      pass: present
    }
  ];

  if (present && requireGeneratedAt) {
    checks.push({
      id: 'dispatch-summary-generated-at',
      name: 'Dispatch summary generatedAt presence',
      expected: 'present',
      actual: generatedAtIso || 'missing',
      pass: Boolean(generatedAtIso)
    });
  }

  if (present && generatedAtIso) {
    checks.push({
      id: 'dispatch-summary-not-future',
      name: 'Dispatch summary future skew window',
      expected: `<= ${maxFutureSkewMinutes}m ahead`,
      actual: Number.isFinite(futureSkewMinutes) ? `${futureSkewMinutes}m` : 'n/a',
      pass: Number.isFinite(futureSkewMinutes) && futureSkewMinutes <= maxFutureSkewMinutes
    });

    checks.push({
      id: 'dispatch-summary-recency',
      name: 'Dispatch summary recency window',
      expected: `<= ${maxAgeHours}h`,
      actual: Number.isFinite(ageHours) ? `${ageHours}h` : 'n/a',
      pass:
        Number.isFinite(ageHours) &&
        ageHours <= maxAgeHours &&
        ageHours >= -maxFutureSkewMinutes / 60
    });
  }

  const passed = checks.every((check) => check.pass);
  return {
    passed,
    checks,
    present,
    requireGeneratedAt,
    maxAgeHours,
    maxFutureSkewMinutes,
    generatedAtIso,
    ageHours,
    futureSkewMinutes
  };
};

const normalizeIssue = (issue) => {
  if (!issue || typeof issue !== 'object' || issue.pull_request) {
    return null;
  }

  const title = toTrimmedString(issue.title);
  const body = toTrimmedString(issue.body);
  const htmlUrl = toTrimmedString(issue.html_url) || toTrimmedString(issue.url);
  const number = Number(issue.number);

  return {
    number: Number.isFinite(number) ? number : null,
    title,
    body,
    htmlUrl
  };
};

const findExistingOpenIssues = ({ openIssues, titlePrefix }) => {
  const existingMap = new Map();

  for (const rawIssue of openIssues) {
    const issue = normalizeIssue(rawIssue);
    if (!issue) {
      continue;
    }

    let reason = extractReasonFromMarker(issue.body);
    if (!reason && issue.title && titlePrefix && issue.title.startsWith(`${titlePrefix} `)) {
      reason = toTrimmedString(issue.title.slice(`${titlePrefix} `.length));
    }

    if (!reason || existingMap.has(reason)) {
      continue;
    }

    existingMap.set(reason, {
      number: issue.number,
      url: issue.htmlUrl
    });
  }

  return existingMap;
};

const buildIssueTitle = ({ titlePrefix, reason }) => `${titlePrefix} ${reason}`;

const buildTemplateContext = ({ reasonItem, summary, ownerRoute, ownerRouteSource, runtimeContext }) => {
  const marker = buildReasonMarker(reasonItem.reason);
  const history = reasonItem.history.length > 0 ? reasonItem.history.join(' -> ') : 'n/a';
  const signals = reasonItem.signals.length > 0 ? reasonItem.signals.join(', ') : 'n/a';
  const generatedAt = toTrimmedString(summary?.generatedAt) || 'n/a';
  const verdict = toTrimmedString(summary?.verdict) || 'n/a';
  const windowDays = Number(summary?.windows?.windowDays);
  const dispatchQualityLatestRunRaw = isObject(summary?.dispatchQualityLatestRun) ? summary.dispatchQualityLatestRun : null;
  const dispatchQualityLatestRunEvent = toTrimmedString(dispatchQualityLatestRunRaw?.event) || 'n/a';
  const dispatchQualityLatestRunConclusion = toTrimmedString(dispatchQualityLatestRunRaw?.conclusion) || 'n/a';
  const dispatchQualityLatestRunUpdatedAt = toTrimmedString(dispatchQualityLatestRunRaw?.updatedAt) || 'n/a';
  const dispatchQualityLatestRunUrl = toTrimmedString(dispatchQualityLatestRunRaw?.url) || 'n/a';
  const dispatchQualityLatestRun = dispatchQualityLatestRunRaw
    ? `${dispatchQualityLatestRunConclusion} (${dispatchQualityLatestRunEvent}) at ${dispatchQualityLatestRunUpdatedAt}`
    : 'n/a';
  const dispatchQualityConsecutiveFailedWeeks = Number(summary?.dispatchQualityConsecutiveFailedWeeks);
  const dispatchQualityConsecutiveFailureThreshold = Number(summary?.policy?.dispatchQuality?.consecutiveFailureWeeks);
  const timeoutLatestRunRaw = isObject(summary?.timeoutLatestRun) ? summary.timeoutLatestRun : null;
  const timeoutLatestRunEvent = toTrimmedString(timeoutLatestRunRaw?.event) || 'n/a';
  const timeoutLatestRunConclusion = toTrimmedString(timeoutLatestRunRaw?.conclusion) || 'n/a';
  const timeoutLatestRunUpdatedAt = toTrimmedString(timeoutLatestRunRaw?.updatedAt) || 'n/a';
  const timeoutLatestRunUrl = toTrimmedString(timeoutLatestRunRaw?.url) || 'n/a';
  const timeoutLatestRun = timeoutLatestRunRaw
    ? `${timeoutLatestRunConclusion} (${timeoutLatestRunEvent}) at ${timeoutLatestRunUpdatedAt}`
    : 'n/a';
  const timeoutConsecutiveFailedWeeks = Number(summary?.timeoutConsecutiveFailedWeeks);
  const timeoutConsecutiveFailureThreshold = Number(summary?.policy?.timeout?.consecutiveFailureWeeks);
  const timeoutStabilityLatestRunRaw = isObject(summary?.timeoutStabilityLatestRun) ? summary.timeoutStabilityLatestRun : null;
  const timeoutStabilityLatestRunEvent = toTrimmedString(timeoutStabilityLatestRunRaw?.event) || 'n/a';
  const timeoutStabilityLatestRunConclusion = toTrimmedString(timeoutStabilityLatestRunRaw?.conclusion) || 'n/a';
  const timeoutStabilityLatestRunUpdatedAt = toTrimmedString(timeoutStabilityLatestRunRaw?.updatedAt) || 'n/a';
  const timeoutStabilityLatestRunUrl = toTrimmedString(timeoutStabilityLatestRunRaw?.url) || 'n/a';
  const timeoutStabilityLatestRun = timeoutStabilityLatestRunRaw
    ? `${timeoutStabilityLatestRunConclusion} (${timeoutStabilityLatestRunEvent}) at ${timeoutStabilityLatestRunUpdatedAt}`
    : 'n/a';
  const timeoutStabilityConsecutiveFailedWeeks = Number(summary?.timeoutStabilityConsecutiveFailedWeeks);
  const timeoutStabilityConsecutiveFailureThreshold = Number(summary?.policy?.timeoutStability?.consecutiveFailureWeeks);
  const dispatchWorkflowRunUrl = toTrimmedString(runtimeContext?.workflowRunUrl);
  const dispatchWorkflowArtifactsUrl = toTrimmedString(runtimeContext?.workflowArtifactsUrl);
  const dispatchWorkflowRunId = toTrimmedString(runtimeContext?.workflowRunId);
  const dispatchWorkflowRunAttempt = toTrimmedString(runtimeContext?.workflowRunAttempt);

  return {
    reasonMarker: marker,
    reason: reasonItem.reason,
    current: reasonItem.current,
    previous: reasonItem.previous,
    delta: reasonItem.delta,
    deltaSigned: reasonItem.delta >= 0 ? `+${reasonItem.delta}` : String(reasonItem.delta),
    history,
    signals,
    summaryVerdict: verdict,
    summaryGeneratedAt: generatedAt,
    windowDays: Number.isFinite(windowDays) && windowDays > 0 ? String(windowDays) : 'n/a',
    dispatchQualityPassed: toBoolean(summary?.dispatchQualityPassed, true) ? 'yes' : 'no',
    dispatchQualityLatestRunFailed: toBoolean(summary?.dispatchQualityLatestRunFailed, false) ? 'yes' : 'no',
    dispatchQualityConsecutiveFailureDetected: toBoolean(summary?.dispatchQualityConsecutiveFailureDetected, false)
      ? 'yes'
      : 'no',
    dispatchQualityConsecutiveFailedWeeks:
      Number.isFinite(dispatchQualityConsecutiveFailedWeeks) && dispatchQualityConsecutiveFailedWeeks >= 0
        ? String(dispatchQualityConsecutiveFailedWeeks)
        : '0',
    dispatchQualityConsecutiveFailureThreshold:
      Number.isFinite(dispatchQualityConsecutiveFailureThreshold) && dispatchQualityConsecutiveFailureThreshold > 0
        ? String(dispatchQualityConsecutiveFailureThreshold)
        : '2',
    dispatchQualityLatestRun,
    dispatchQualityLatestRunEvent,
    dispatchQualityLatestRunConclusion,
    dispatchQualityLatestRunUpdatedAt,
    dispatchQualityLatestRunUrl,
    timeoutPassed: toBoolean(summary?.timeoutPassed, true) ? 'yes' : 'no',
    timeoutLatestRunFailed: toBoolean(summary?.timeoutLatestRunFailed, false) ? 'yes' : 'no',
    timeoutConsecutiveFailureDetected: toBoolean(summary?.timeoutConsecutiveFailureDetected, false) ? 'yes' : 'no',
    timeoutConsecutiveFailedWeeks:
      Number.isFinite(timeoutConsecutiveFailedWeeks) && timeoutConsecutiveFailedWeeks >= 0
        ? String(timeoutConsecutiveFailedWeeks)
        : '0',
    timeoutConsecutiveFailureThreshold:
      Number.isFinite(timeoutConsecutiveFailureThreshold) && timeoutConsecutiveFailureThreshold > 0
        ? String(timeoutConsecutiveFailureThreshold)
        : '2',
    timeoutLatestRun,
    timeoutLatestRunEvent,
    timeoutLatestRunConclusion,
    timeoutLatestRunUpdatedAt,
    timeoutLatestRunUrl,
    timeoutStabilityPassed: toBoolean(summary?.timeoutStabilityPassed, true) ? 'yes' : 'no',
    timeoutStabilityLatestRunFailed: toBoolean(summary?.timeoutStabilityLatestRunFailed, false) ? 'yes' : 'no',
    timeoutStabilityConsecutiveFailureDetected: toBoolean(summary?.timeoutStabilityConsecutiveFailureDetected, false)
      ? 'yes'
      : 'no',
    timeoutStabilityConsecutiveFailedWeeks:
      Number.isFinite(timeoutStabilityConsecutiveFailedWeeks) && timeoutStabilityConsecutiveFailedWeeks >= 0
        ? String(timeoutStabilityConsecutiveFailedWeeks)
        : '0',
    timeoutStabilityConsecutiveFailureThreshold:
      Number.isFinite(timeoutStabilityConsecutiveFailureThreshold) && timeoutStabilityConsecutiveFailureThreshold > 0
        ? String(timeoutStabilityConsecutiveFailureThreshold)
        : '2',
    timeoutStabilityLatestRun,
    timeoutStabilityLatestRunEvent,
    timeoutStabilityLatestRunConclusion,
    timeoutStabilityLatestRunUpdatedAt,
    timeoutStabilityLatestRunUrl,
    dispatchWorkflowRunUrl: dispatchWorkflowRunUrl || 'n/a',
    dispatchWorkflowArtifactsUrl: dispatchWorkflowArtifactsUrl || 'n/a',
    dispatchWorkflowRunId: dispatchWorkflowRunId || 'n/a',
    dispatchWorkflowRunAttempt: dispatchWorkflowRunAttempt || 'n/a',
    ownerRoute: ownerRoute || 'unassigned',
    ownerRouteSource: ownerRouteSource || 'missing'
  };
};

const buildIssueBody = ({ reasonItem, summary, ownerRoute, ownerRouteSource, template, runtimeContext }) => {
  const context = buildTemplateContext({
    reasonItem,
    summary,
    ownerRoute,
    ownerRouteSource,
    runtimeContext
  });
  const rendered = renderTemplate(template || DEFAULT_ISSUE_BODY_TEMPLATE, context);
  if (!rendered) {
    return '';
  }
  return rendered.endsWith('\n') ? rendered : `${rendered}\n`;
};

const toOwnerRouteLabel = ({ ownerRoute, issueConfig }) => {
  const route = toTrimmedString(ownerRoute);
  if (!route) {
    return '';
  }

  const prefix = toTrimmedString(issueConfig?.ownerRouteLabelPrefix) || DEFAULT_OWNER_ROUTE_LABEL_PREFIX;
  if (!prefix) {
    return '';
  }

  const normalizedRoute = route
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalizedRoute) {
    return '';
  }

  return `${prefix}:${normalizedRoute}`;
};

const resolveOwnerRoute = ({ reason, issueConfig }) => {
  const exactRoute = toTrimmedString(issueConfig?.reasonOwnerRoutes?.[reason]);
  if (exactRoute) {
    return {
      ownerRoute: exactRoute,
      ownerRouteSource: 'reason-map'
    };
  }

  const patternRoutes = Array.isArray(issueConfig?.ownerRoutePatterns) ? issueConfig.ownerRoutePatterns : [];
  for (const routeRule of patternRoutes) {
    const patternText = toTrimmedString(routeRule?.pattern);
    const ownerRoute = toTrimmedString(routeRule?.ownerRoute);
    if (!patternText || !ownerRoute) {
      continue;
    }

    try {
      if (new RegExp(patternText).test(reason)) {
        return {
          ownerRoute,
          ownerRouteSource: `pattern:${patternText}`
        };
      }
    } catch {
      continue;
    }
  }

  const fallbackRoute = toTrimmedString(issueConfig?.defaultOwnerRoute);
  if (fallbackRoute) {
    return {
      ownerRoute: fallbackRoute,
      ownerRouteSource: 'default'
    };
  }

  return {
    ownerRoute: '',
    ownerRouteSource: 'missing'
  };
};

const buildIssueLabels = ({ reason, ownerRoute, issueConfig }) => {
  const baseLabels = Array.isArray(issueConfig?.labels) && issueConfig.labels.length > 0 ? issueConfig.labels : DEFAULT_LABELS;
  const reasonLabels = issueConfig?.reasonLabels?.[reason];
  const ownerRouteLabel = toOwnerRouteLabel({ ownerRoute, issueConfig });
  return uniqueStrings([...baseLabels, ...(Array.isArray(reasonLabels) ? reasonLabels : []), ownerRouteLabel]);
};

const buildIssueAssignees = ({ reason, issueConfig }) => {
  const defaultAssignees = Array.isArray(issueConfig?.defaultAssignees) ? issueConfig.defaultAssignees : [];
  const reasonAssignees = issueConfig?.reasonAssignees?.[reason];
  return uniqueStrings([...defaultAssignees, ...(Array.isArray(reasonAssignees) ? reasonAssignees : [])]);
};

const countByDecision = (actions) => {
  const counter = {
    total: actions.length,
    skippedExisting: 0,
    skippedIdempotencyLog: 0,
    skippedQuota: 0,
    skippedOwnerRouteMissing: 0,
    skippedSummaryFreshness: 0,
    create: 0,
    wouldCreate: 0,
    created: 0,
    failed: 0
  };

  for (const action of actions) {
    if (action.decision === 'skip-existing') {
      counter.skippedExisting += 1;
    } else if (action.decision === 'skip-idempotency-log') {
      counter.skippedIdempotencyLog += 1;
    } else if (action.decision === 'skip-quota') {
      counter.skippedQuota += 1;
    } else if (action.decision === 'skip-owner-route-missing') {
      counter.skippedOwnerRouteMissing += 1;
    } else if (action.decision === 'skip-summary-freshness') {
      counter.skippedSummaryFreshness += 1;
    } else if (action.decision === 'create') {
      counter.create += 1;
    } else if (action.decision === 'would-create') {
      counter.wouldCreate += 1;
    } else if (action.decision === 'created') {
      counter.created += 1;
    } else if (action.decision === 'failed') {
      counter.failed += 1;
    }
  }

  return counter;
};

const resolveTemplateForReason = ({ reason, templates }) => {
  const reasonTemplate = toTrimmedString(templates?.reasonTemplates?.[reason]);
  if (reasonTemplate) {
    return reasonTemplate;
  }

  const defaultTemplate = toTrimmedString(templates?.defaultTemplate);
  if (defaultTemplate) {
    return defaultTemplate;
  }

  return DEFAULT_ISSUE_BODY_TEMPLATE;
};

export const buildDispatchPlan = ({ summary, config, openIssues, templates, runtimeContext }) => {
  const summaryCandidates = Array.isArray(summary?.p1CandidateReasons) ? summary.p1CandidateReasons : [];
  const dispatchQualityTrendCandidate = buildDispatchQualityTrendReasonItem(summary);
  const timeoutTrendCandidate = buildTimeoutTrendReasonItem(summary);
  const timeoutStabilityTrendCandidate = buildTimeoutStabilityTrendReasonItem(summary);
  const sourceCandidates = [
    ...summaryCandidates,
    ...(dispatchQualityTrendCandidate ? [dispatchQualityTrendCandidate] : []),
    ...(timeoutTrendCandidate ? [timeoutTrendCandidate] : []),
    ...(timeoutStabilityTrendCandidate ? [timeoutStabilityTrendCandidate] : [])
  ];
  const normalizedCandidates = dedupeReasonItems(sourceCandidates.map((item) => toReasonItem(item)).filter(Boolean));

  const issueConfig = config?.issue ?? {};
  const failOnMissingOwnerRoute = toBoolean(issueConfig?.failOnMissingOwnerRoute, false);
  const titlePrefix = toTrimmedString(issueConfig.titlePrefix) || DEFAULT_TITLE_PREFIX;
  const existingOpenIssueMap = findExistingOpenIssues({
    openIssues: Array.isArray(openIssues) ? openIssues : [],
    titlePrefix
  });
  const maxCreatePerRun = toNonNegativeInteger(issueConfig.maxCreatePerRun, normalizedCandidates.length);
  const summaryFreshnessBlocked = isObject(config?.summaryFreshness)
    ? config.summaryFreshness.passed === false
    : false;
  const summaryFreshnessFailedChecks =
    isObject(config?.summaryFreshness) && Array.isArray(config.summaryFreshness.checks)
      ? config.summaryFreshness.checks.filter((check) => check.pass === false).map((check) => check.id)
      : [];

  let remainingQuota = maxCreatePerRun;
  const actions = [];

  for (const reasonItem of normalizedCandidates) {
    const ownerRouting = resolveOwnerRoute({
      reason: reasonItem.reason,
      issueConfig
    });

    const existingIssue = existingOpenIssueMap.get(reasonItem.reason);
    if (existingIssue) {
      actions.push({
        ...reasonItem,
        ownerRoute: ownerRouting.ownerRoute,
        ownerRouteSource: ownerRouting.ownerRouteSource,
        decision: 'skip-existing',
        issueNumber: existingIssue.number,
        issueUrl: existingIssue.url
      });
      continue;
    }

    if (summaryFreshnessBlocked) {
      actions.push({
        ...reasonItem,
        ownerRoute: ownerRouting.ownerRoute,
        ownerRouteSource: ownerRouting.ownerRouteSource,
        decision: 'skip-summary-freshness',
        summaryFreshnessFailedChecks
      });
      continue;
    }

    if (remainingQuota <= 0) {
      actions.push({
        ...reasonItem,
        ownerRoute: ownerRouting.ownerRoute,
        ownerRouteSource: ownerRouting.ownerRouteSource,
        decision: 'skip-quota'
      });
      continue;
    }

    if (!ownerRouting.ownerRoute && failOnMissingOwnerRoute) {
      actions.push({
        ...reasonItem,
        ownerRoute: '',
        ownerRouteSource: ownerRouting.ownerRouteSource,
        decision: 'skip-owner-route-missing'
      });
      continue;
    }

    const issueTemplate = resolveTemplateForReason({
      reason: reasonItem.reason,
      templates
    });
    const payload = {
      title: buildIssueTitle({ titlePrefix, reason: reasonItem.reason }),
      body: buildIssueBody({
        reasonItem,
        summary,
        ownerRoute: ownerRouting.ownerRoute,
        ownerRouteSource: ownerRouting.ownerRouteSource,
        template: issueTemplate,
        runtimeContext
      }),
      labels: buildIssueLabels({
        reason: reasonItem.reason,
        ownerRoute: ownerRouting.ownerRoute,
        issueConfig
      }),
      assignees: buildIssueAssignees({ reason: reasonItem.reason, issueConfig })
    };

    remainingQuota -= 1;
    actions.push({
      ...reasonItem,
      ownerRoute: ownerRouting.ownerRoute,
      ownerRouteSource: ownerRouting.ownerRouteSource,
      decision: 'create',
      payload
    });
  }

  return {
    titlePrefix,
    maxCreatePerRun,
    actions,
    counts: countByDecision(actions)
  };
};

export const renderDispatchReport = ({
  generatedAt,
  configPath,
  summaryPath,
  repository,
  mode,
  summary,
  plan,
  results
}) => {
  const lines = [];
  lines.push('# V2 P1 Escalation Dispatch');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Mode: ${mode}`);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Summary source: \`${summaryPath}\``);
  lines.push(`- Repository: \`${repository || 'n/a'}\``);
  lines.push(`- Summary verdict: **${toTrimmedString(summary?.verdict) || 'n/a'}**`);
  lines.push(
    `- Summary freshness gate: **${
      results?.summaryFreshness?.passed === false ? 'FAIL' : results?.summaryFreshness?.passed === true ? 'PASS' : 'n/a'
    }**`
  );
  lines.push(
    `- Summary generatedAt: ${toTrimmedString(results?.summaryFreshness?.generatedAtIso) || toTrimmedString(summary?.generatedAt) || 'n/a'}`
  );
  lines.push(
    `- Summary age hours: ${
      Number.isFinite(Number(results?.summaryFreshness?.ageHours)) ? Number(results.summaryFreshness.ageHours) : 'n/a'
    }`
  );
  lines.push(`- Dispatch workflow run URL: ${toTrimmedString(results?.runtimeContext?.workflowRunUrl) || 'n/a'}`);
  lines.push(
    `- Dispatch workflow artifacts URL: ${toTrimmedString(results?.runtimeContext?.workflowArtifactsUrl) || 'n/a'}`
  );
  lines.push('');

  const finalCounts = countByDecision(Array.isArray(results?.actions) ? results.actions : plan.actions);
  lines.push('## Dispatch overview');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| P1 candidates | ${plan.counts.total} |`);
  lines.push(`| Existing open issue | ${finalCounts.skippedExisting} |`);
  lines.push(`| Idempotency log skipped | ${finalCounts.skippedIdempotencyLog} |`);
  lines.push(`| Quota skipped | ${finalCounts.skippedQuota} |`);
  lines.push(`| Missing owner route skipped | ${finalCounts.skippedOwnerRouteMissing} |`);
  lines.push(`| Summary freshness skipped | ${finalCounts.skippedSummaryFreshness} |`);
  lines.push(`| Planned create | ${plan.counts.create} |`);
  lines.push(`| Created | ${finalCounts.created} |`);
  lines.push(`| Dry-run create | ${finalCounts.wouldCreate} |`);
  lines.push(`| Failed create | ${finalCounts.failed} |`);
  lines.push(`| Link comment posted | ${Number(results?.linkCommentStats?.linked || 0)} |`);
  lines.push(`| Link comment skipped | ${Number(results?.linkCommentStats?.skipped || 0)} |`);
  lines.push(`| Link comment failed | ${Number(results?.linkCommentStats?.failed || 0)} |`);
  lines.push('');

  if (Array.isArray(results?.summaryFreshness?.checks) && results.summaryFreshness.checks.length > 0) {
    lines.push('## Summary freshness checks');
    lines.push('');
    lines.push('| Check | Expected | Actual | Pass |');
    lines.push('| --- | --- | --- | --- |');
    for (const check of results.summaryFreshness.checks) {
      lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${check.pass ? 'yes' : 'no'} |`);
    }
    lines.push('');
  }

  lines.push('## Actions');
  lines.push('');
  if (plan.actions.length === 0) {
    lines.push('- none');
    lines.push('');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Reason | Owner Route | Current | Previous | Delta | History | Signals | Decision | Issue | Link Comment |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');

  const finalActions = Array.isArray(results?.actions) ? results.actions : plan.actions;
  for (const action of finalActions) {
    const history = Array.isArray(action.history) && action.history.length > 0 ? action.history.join(' -> ') : 'n/a';
    const signals = Array.isArray(action.signals) && action.signals.length > 0 ? action.signals.join(',') : 'n/a';
    const issueText = action.issueUrl
      ? `[#${action.issueNumber || '?'}](${action.issueUrl})`
      : action.error
        ? `error: ${action.error}`
        : '-';
    const linkCommentText = action.linkCommentUrl
      ? `[linked](${action.linkCommentUrl})`
      : action.linkCommentDecision || '-';
    lines.push(
      `| ${action.reason} | ${action.ownerRoute || 'n/a'} | ${action.current} | ${action.previous} | ${action.delta} | ${history} | ${signals} | ${action.decision} | ${issueText} | ${linkCommentText} |`
    );
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
};
