import { createHash } from 'node:crypto';
import { parseWorkflowRunUrlEvidence } from './v3-dashboard-drill-report-lib.mjs';

const DEFAULT_WORKFLOW_NAME = 'v3-beta-regression-matrix';
const DEFAULT_WORKFLOW_FILE = '.github/workflows/v3-beta-regression-matrix.yml';
const DEFAULT_MAX_AGE_HOURS = 72;
const DEFAULT_FUTURE_SKEW_MINUTES = 5;
const DEFAULT_REPORTS_DIR = 'reports/v3';
const REQUIRED_ARTIFACT_DIGEST_KEYS = [
  'drillReportMd',
  'drillJson',
  'backlogSnippetMd',
  'backlogAppliedMd'
];

const toTrimmedString = (value) => String(value ?? '').trim();

const toValidDate = (value, fieldName) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName} timestamp`);
  }
  return date;
};

const toFiniteNumber = (value, fieldName) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid ${fieldName} value`);
  }
  return numeric;
};

const toPositiveIntegerToken = (value, fieldName) => {
  const normalized = toTrimmedString(value);
  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return normalized;
};

const toSha256Hex = (content) =>
  createHash('sha256').update(String(content ?? ''), 'utf8').digest('hex');

const normalizeServerUrlEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized || normalized === 'unknown') {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('Run manifest serverUrl must be a valid URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Run manifest serverUrl must use https');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Run manifest serverUrl must not include credentials');
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error('Run manifest serverUrl must not include query/hash');
  }

  if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
    throw new Error('Run manifest serverUrl must not include path');
  }

  const normalizedUrl = parsedUrl.origin;
  return {
    url: normalizedUrl,
    host: parsedUrl.host
  };
};

export const normalizeV3DashboardDrillPathToken = (value) =>
  toTrimmedString(value)
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/\.\//g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');

export const resolveV3DashboardDrillReportsDir = (value) => {
  const normalized = normalizeV3DashboardDrillPathToken(value);
  return normalized || DEFAULT_REPORTS_DIR;
};

export const resolveV3DashboardDrillExpectedArtifactPaths = ({
  reportsDir = DEFAULT_REPORTS_DIR,
  runId
}) => {
  const normalizedRunId = toTrimmedString(runId);
  if (!normalizedRunId) {
    throw new Error('Missing runId for expected artifact path resolution');
  }

  const resolvedReportsDir = resolveV3DashboardDrillReportsDir(reportsDir);
  return {
    reportMdPath: `${resolvedReportsDir}/v3-dashboard-freeze-rollback-drill-${normalizedRunId}.md`,
    drillJsonPath: `${resolvedReportsDir}/v3-dashboard-freeze-rollback-drill-${normalizedRunId}.json`,
    snippetMdPath: `${resolvedReportsDir}/v3-dashboard-freeze-rollback-drill-${normalizedRunId}-backlog.md`,
    backlogAppliedPath: `${resolvedReportsDir}/v3-dashboard-freeze-rollback-drill-${normalizedRunId}-backlog-applied.md`,
    runManifestPath: `${resolvedReportsDir}/v3-dashboard-freeze-rollback-drill-${normalizedRunId}-run-manifest.json`
  };
};

export const isV3DashboardDrillArtifactPathMatch = ({
  actualPath,
  expectedPath
}) =>
  normalizeV3DashboardDrillPathToken(actualPath) ===
  normalizeV3DashboardDrillPathToken(expectedPath);

const normalizeArtifactDigestEntry = ({ key, entry }) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Run manifest artifact digest must be an object: ${key}`);
  }

  const normalizedPath = toTrimmedString(entry.path);
  if (!normalizedPath) {
    throw new Error(`Run manifest artifact digest missing path: ${key}`);
  }

  const normalizedSha = toTrimmedString(entry.sha256).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedSha)) {
    throw new Error(`Run manifest artifact digest missing sha256: ${key}`);
  }

  const bytes = toFiniteNumber(entry.bytes, `artifact digest bytes: ${key}`);
  if (!Number.isInteger(bytes) || bytes < 0) {
    throw new Error(`Run manifest artifact digest bytes must be non-negative integer: ${key}`);
  }

  return {
    path: normalizedPath,
    sha256: normalizedSha,
    bytes
  };
};

const normalizeArtifactDigests = (artifactDigests) => {
  if (artifactDigests === undefined) {
    return null;
  }

  if (!artifactDigests || typeof artifactDigests !== 'object' || Array.isArray(artifactDigests)) {
    throw new Error('Run manifest artifactDigests must be a JSON object');
  }

  const normalized = {};
  for (const key of REQUIRED_ARTIFACT_DIGEST_KEYS) {
    if (artifactDigests[key] === undefined) {
      continue;
    }

    normalized[key] = normalizeArtifactDigestEntry({
      key,
      entry: artifactDigests[key]
    });
  }

  return normalized;
};

export const buildV3DashboardDrillArtifactDigest = ({ path, content }) => {
  const normalizedPath = toTrimmedString(path);
  if (!normalizedPath) {
    throw new Error('Artifact digest path is required');
  }

  const normalizedContent = String(content ?? '');
  return {
    path: normalizedPath,
    sha256: toSha256Hex(normalizedContent),
    bytes: Buffer.byteLength(normalizedContent, 'utf8')
  };
};

const normalizeManifest = ({
  runId,
  runUrl,
  serverUrl,
  serverHost,
  runUrlHost,
  workflowName,
  workflowFile,
  eventName,
  repository,
  ref,
  sha,
  runAttempt,
  generatedAt,
  artifactDigests
}) => {
  const normalizedRunId = toTrimmedString(runId);
  if (!normalizedRunId) {
    throw new Error('Run manifest missing runId');
  }

  const normalizedRunUrl = toTrimmedString(runUrl);
  if (!normalizedRunUrl) {
    throw new Error('Run manifest missing runUrl');
  }

  const parsedServerUrl = normalizeServerUrlEvidence(serverUrl);
  const parsedRunUrl = parseWorkflowRunUrlEvidence(normalizedRunUrl);
  const resolvedRunUrlHost = parsedRunUrl?.host || 'unknown';
  const resolvedServerHost = parsedServerUrl?.host || 'unknown';

  if (parsedServerUrl && parsedRunUrl && parsedRunUrl.host !== parsedServerUrl.host) {
    throw new Error(
      `Run manifest runUrl host must match serverUrl host: ${parsedServerUrl.host}`
    );
  }

  const normalizedDeclaredServerHost = toTrimmedString(serverHost);
  if (
    normalizedDeclaredServerHost &&
    normalizedDeclaredServerHost !== 'unknown' &&
    normalizedDeclaredServerHost !== resolvedServerHost
  ) {
    throw new Error('Run manifest serverHost does not match serverUrl');
  }

  const normalizedDeclaredRunUrlHost = toTrimmedString(runUrlHost);
  if (
    normalizedDeclaredRunUrlHost &&
    normalizedDeclaredRunUrlHost !== 'unknown' &&
    normalizedDeclaredRunUrlHost !== resolvedRunUrlHost
  ) {
    throw new Error('Run manifest runUrlHost does not match runUrl');
  }

  const normalizedWorkflowName =
    toTrimmedString(workflowName) || DEFAULT_WORKFLOW_NAME;
  const normalizedWorkflowFile =
    toTrimmedString(workflowFile) || DEFAULT_WORKFLOW_FILE;

  if (!normalizedWorkflowName || !normalizedWorkflowFile) {
    throw new Error('Run manifest missing workflow identity');
  }

  const generatedAtDate = toValidDate(
    toTrimmedString(generatedAt) || new Date().toISOString(),
    'run manifest generatedAt'
  );

  return {
    runId: normalizedRunId,
    runUrl: normalizedRunUrl,
    serverUrl: parsedServerUrl?.url || 'unknown',
    serverHost: resolvedServerHost,
    runUrlHost: resolvedRunUrlHost,
    workflowName: normalizedWorkflowName,
    workflowFile: normalizedWorkflowFile,
    eventName: toTrimmedString(eventName) || 'unknown',
    repository: toTrimmedString(repository) || 'unknown',
    ref: toTrimmedString(ref) || 'unknown',
    sha: toTrimmedString(sha) || 'unknown',
    runAttempt: toPositiveIntegerToken(runAttempt || '1', 'Run manifest runAttempt'),
    generatedAt: generatedAtDate.toISOString(),
    generatedAtDate,
    artifactDigests: normalizeArtifactDigests(artifactDigests)
  };
};

export const buildV3DashboardDrillRunManifest = ({
  runId,
  runUrl,
  serverUrl,
  workflowName = DEFAULT_WORKFLOW_NAME,
  workflowFile = DEFAULT_WORKFLOW_FILE,
  eventName,
  repository,
  ref,
  sha,
  runAttempt,
  generatedAt,
  artifactDigests
}) => {
  const manifest = normalizeManifest({
    runId,
    runUrl,
    serverUrl,
    workflowName,
    workflowFile,
    eventName,
    repository,
    ref,
    sha,
    runAttempt,
    generatedAt,
    artifactDigests
  });

  return {
    runId: manifest.runId,
    runUrl: manifest.runUrl,
    serverUrl: manifest.serverUrl,
    serverHost: manifest.serverHost,
    runUrlHost: manifest.runUrlHost,
    workflowName: manifest.workflowName,
    workflowFile: manifest.workflowFile,
    eventName: manifest.eventName,
    repository: manifest.repository,
    ref: manifest.ref,
    sha: manifest.sha,
    runAttempt: manifest.runAttempt,
    generatedAt: manifest.generatedAt,
    artifactDigests: manifest.artifactDigests || undefined
  };
};

export const parseV3DashboardDrillRunManifest = ({ manifest }) => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Run manifest must be a JSON object');
  }

  return normalizeManifest({
    runId: manifest.runId,
    runUrl: manifest.runUrl,
    serverUrl: manifest.serverUrl,
    serverHost: manifest.serverHost,
    runUrlHost: manifest.runUrlHost,
    workflowName: manifest.workflowName,
    workflowFile: manifest.workflowFile,
    eventName: manifest.eventName,
    repository: manifest.repository,
    ref: manifest.ref,
    sha: manifest.sha,
    runAttempt: manifest.runAttempt,
    generatedAt: manifest.generatedAt,
    artifactDigests: manifest.artifactDigests
  });
};

export const evaluateV3DashboardDrillRunManifestFreshness = ({
  manifest,
  now = new Date(),
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  futureSkewMinutes = DEFAULT_FUTURE_SKEW_MINUTES
}) => {
  const parsed = parseV3DashboardDrillRunManifest({ manifest });
  const nowDate = toValidDate(now, 'now');
  const normalizedMaxAgeHours = toFiniteNumber(maxAgeHours, 'maxAgeHours');
  const normalizedFutureSkewMinutes = toFiniteNumber(
    futureSkewMinutes,
    'futureSkewMinutes'
  );

  if (normalizedMaxAgeHours <= 0) {
    throw new Error('maxAgeHours must be greater than 0');
  }

  if (normalizedFutureSkewMinutes < 0) {
    throw new Error('futureSkewMinutes must be greater than or equal to 0');
  }

  const ageMs = nowDate.getTime() - parsed.generatedAtDate.getTime();
  const maxAgeMs = normalizedMaxAgeHours * 60 * 60 * 1000;
  const maxFutureSkewMs = normalizedFutureSkewMinutes * 60 * 1000;

  const withinFutureSkew = ageMs >= -maxFutureSkewMs;
  const withinMaxAge = ageMs <= maxAgeMs;

  return {
    runId: parsed.runId,
    runUrl: parsed.runUrl,
    serverUrl: parsed.serverUrl,
    serverHost: parsed.serverHost,
    runUrlHost: parsed.runUrlHost,
    workflowName: parsed.workflowName,
    workflowFile: parsed.workflowFile,
    eventName: parsed.eventName,
    repository: parsed.repository,
    ref: parsed.ref,
    sha: parsed.sha,
    runAttempt: parsed.runAttempt,
    generatedAt: parsed.generatedAt,
    generatedAtDate: parsed.generatedAtDate,
    artifactDigests: parsed.artifactDigests,
    now: nowDate.toISOString(),
    ageMs,
    ageHours: ageMs / (60 * 60 * 1000),
    maxAgeHours: normalizedMaxAgeHours,
    futureSkewMinutes: normalizedFutureSkewMinutes,
    freshnessPass: withinFutureSkew && withinMaxAge,
    withinFutureSkew,
    withinMaxAge
  };
};

export const V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS = {
  workflowName: DEFAULT_WORKFLOW_NAME,
  workflowFile: DEFAULT_WORKFLOW_FILE,
  maxAgeHours: DEFAULT_MAX_AGE_HOURS,
  futureSkewMinutes: DEFAULT_FUTURE_SKEW_MINUTES
};

export const V3_DASHBOARD_DRILL_RUN_MANIFEST_ARTIFACT_KEYS = [
  ...REQUIRED_ARTIFACT_DIGEST_KEYS
];
