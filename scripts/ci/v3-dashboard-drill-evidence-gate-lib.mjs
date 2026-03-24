import { createHash } from 'node:crypto';
import { evaluateDrillBacklogEvidence } from './v3-dashboard-drill-backlog-lib.mjs';
import { parseV3DashboardBacklogSnippet } from './v3-dashboard-drill-backlog-apply-lib.mjs';
import { parseWorkflowRunUrlEvidence } from './v3-dashboard-drill-report-lib.mjs';
import {
  evaluateV3DashboardDrillRunManifestFreshness,
  isV3DashboardDrillArtifactPathMatch,
  resolveV3DashboardDrillExpectedArtifactPaths,
  resolveV3DashboardDrillReportsDir,
  V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS
} from './v3-dashboard-drill-run-manifest-lib.mjs';

const DEFAULT_TASK_ID = 'V3-RC-02';
const FULL_GIT_SHA_REGEX = /^[a-f0-9]{40}$/;
const CANONICAL_GIT_REF_REGEX = /^refs\/[^\s]+$/;

const toTrimmedString = (value) => String(value ?? '').trim();

const toLowerTrimmedString = (value) => toTrimmedString(value).toLowerCase();

const isFullGitCommitSha = (value) => FULL_GIT_SHA_REGEX.test(toLowerTrimmedString(value));
const isCanonicalGitRef = (value) => CANONICAL_GIT_REF_REGEX.test(toTrimmedString(value));

const parseExpectedServerUrlEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('expectedServerUrl must be a valid URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('expectedServerUrl must use https');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('expectedServerUrl must not include credentials');
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error('expectedServerUrl must not include query/hash');
  }

  if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
    throw new Error('expectedServerUrl must not include path');
  }

  return {
    url: parsedUrl.origin,
    host: parsedUrl.host
  };
};

const parseExpectedRepositoryEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (!/^[^/\s]+\/[^/\s]+$/.test(normalized)) {
    throw new Error('expectedRepository must be owner/repo');
  }

  if (normalized.toLowerCase() === 'unknown') {
    throw new Error('expectedRepository must not be unknown');
  }

  return normalized;
};

const parseExpectedRunAttemptEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (!/^[1-9][0-9]*$/.test(normalized)) {
    throw new Error('expectedRunAttempt must be a positive integer');
  }

  return normalized;
};

const parseExpectedRefEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (/\s/.test(normalized)) {
    throw new Error('expectedRef must not contain whitespace');
  }

  if (normalized.toLowerCase() === 'unknown') {
    throw new Error('expectedRef must not be unknown');
  }

  return normalized;
};

const parseExpectedShaEvidence = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (/\s/.test(normalized)) {
    throw new Error('expectedSha must not contain whitespace');
  }

  if (normalized.toLowerCase() === 'unknown') {
    throw new Error('expectedSha must not be unknown');
  }

  return normalized.toLowerCase();
};

const splitLines = (content) => String(content ?? '').split(/\r?\n/);

const buildCheck = ({ name, expected, actual, pass }) => ({
  name,
  expected: toTrimmedString(expected),
  actual: toTrimmedString(actual),
  pass: Boolean(pass)
});

const stripInlineCode = (value) => {
  const normalized = toTrimmedString(value);
  const matcher = /^`(.+)`$/.exec(normalized);
  return matcher ? toTrimmedString(matcher[1]) : normalized;
};

const extractReportField = ({ content, pattern, fieldName }) => {
  const matcher = pattern.exec(String(content ?? ''));
  if (!matcher) {
    throw new Error(`Drill report markdown missing field: ${fieldName}`);
  }

  return stripInlineCode(matcher[1]);
};

const parseV3DashboardDrillReportEvidence = ({ drillReportMd }) => {
  const reportContent = String(drillReportMd ?? '');
  if (!reportContent.trim()) {
    throw new Error('Drill report markdown content is empty');
  }

  const runUrl = extractReportField({
    content: reportContent,
    pattern: /^-\s证据链接：(.+)$/m,
    fieldName: '证据链接'
  });
  const runId = extractReportField({
    content: reportContent,
    pattern: /^-\sworkflow run id：(.+)$/m,
    fieldName: 'workflow run id'
  });
  const smokeResult = toTrimmedString(
    extractReportField({
      content: reportContent,
      pattern: /^-\sPlaywright 双态 smoke 结果：(.+)$/m,
      fieldName: 'Playwright 双态 smoke 结果'
    })
  ).toLowerCase();
  const conclusion = extractReportField({
    content: reportContent,
    pattern: /^-\s结论：(.+)$/m,
    fieldName: '结论'
  });

  if (!runId || !runUrl || !smokeResult || !conclusion) {
    throw new Error('Drill report markdown contains empty required fields');
  }

  return {
    runId,
    runUrl,
    smokeResult,
    conclusion
  };
};

const extractTaskSection = ({ backlogAppliedDoc, taskId }) => {
  const lines = splitLines(backlogAppliedDoc);
  const heading = `### \`${taskId}\``;
  const start = lines.findIndex((line) => line.trim().startsWith(heading));
  if (start < 0) {
    throw new Error(`Backlog applied preview missing task section: ${taskId}`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('### ') || lines[index].trim() === '---') {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join('\n');
};

const escapeCell = (value) => toTrimmedString(value).replace(/\|/g, '\\|');

const digestUtf8Sha256 = (content) =>
  createHash('sha256').update(String(content ?? ''), 'utf8').digest('hex');

const digestUtf8Bytes = (content) => Buffer.byteLength(String(content ?? ''), 'utf8');

const resolveDrillJsonDigestContent = ({ drillPayloadRaw, drillPayload }) => {
  if (drillPayloadRaw !== undefined) {
    return String(drillPayloadRaw);
  }

  return `${JSON.stringify(drillPayload ?? {}, null, 2)}\n`;
};

export const evaluateV3DashboardDrillEvidenceGate = ({
  runId,
  drillPayload,
  drillPayloadRaw,
  drillReportMd,
  backlogSnippet,
  backlogAppliedDoc,
  runManifest,
  artifactPaths,
  taskId = DEFAULT_TASK_ID,
  reportsDir = 'reports/v3',
  now = new Date(),
  maxManifestAgeHours = V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.maxAgeHours,
  expectedWorkflowName = V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.workflowName,
  expectedWorkflowFile = V3_DASHBOARD_DRILL_RUN_MANIFEST_DEFAULTS.workflowFile,
  expectedServerUrl,
  expectedRepository,
  expectedRunAttempt,
  expectedRef,
  expectedSha
}) => {
  const normalizedRunId = toTrimmedString(runId);
  if (!normalizedRunId) {
    throw new Error('Missing required runId for evidence gate');
  }

  const normalizedTaskId = toTrimmedString(taskId) || DEFAULT_TASK_ID;
  const expectedPaths = resolveV3DashboardDrillExpectedArtifactPaths({
    reportsDir,
    runId: normalizedRunId
  });
  const resolvedArtifactPaths = {
    reportMdPath: toTrimmedString(artifactPaths?.reportMdPath) || expectedPaths.reportMdPath,
    drillJsonPath: toTrimmedString(artifactPaths?.drillJsonPath) || expectedPaths.drillJsonPath,
    snippetMdPath: toTrimmedString(artifactPaths?.snippetMdPath) || expectedPaths.snippetMdPath,
    backlogAppliedPath:
      toTrimmedString(artifactPaths?.backlogAppliedPath) || expectedPaths.backlogAppliedPath
  };

  const evidence = evaluateDrillBacklogEvidence({
    payload: drillPayload,
    expectedRunId: normalizedRunId
  });
  const reportEvidence = parseV3DashboardDrillReportEvidence({
    drillReportMd
  });
  const manifestEvidence = evaluateV3DashboardDrillRunManifestFreshness({
    manifest: runManifest,
    now,
    maxAgeHours: maxManifestAgeHours
  });
  const manifestArtifactDigests = manifestEvidence.artifactDigests || {};
  const digestSources = {
    drillReportMd: {
      path: resolvedArtifactPaths.reportMdPath,
      content: drillReportMd
    },
    drillJson: {
      path: resolvedArtifactPaths.drillJsonPath,
      content: resolveDrillJsonDigestContent({
        drillPayloadRaw,
        drillPayload
      })
    },
    backlogSnippetMd: {
      path: resolvedArtifactPaths.snippetMdPath,
      content: backlogSnippet
    },
    backlogAppliedMd: {
      path: resolvedArtifactPaths.backlogAppliedPath,
      content: backlogAppliedDoc
    }
  };

  const snippetMeta = parseV3DashboardBacklogSnippet({
    snippet: backlogSnippet,
    taskId: normalizedTaskId,
    expectedRunId: normalizedRunId
  });

  const appliedSection = extractTaskSection({
    backlogAppliedDoc,
    taskId: normalizedTaskId
  });

  const expectedConclusionLine = evidence.publishable
    ? '结论更新：`V3-RC-02` 满足 PASS 证据闭环，可执行正式关闭流程。'
    : '结论维持：`暂缓发布`，继续阻塞态回滚收口。';
  const expectedNextActionLine = `下一点：${snippetMeta.nextAction}`;
  const expectedRunEvidenceLine = `run \`${evidence.runId}\`（${evidence.runUrl}）`;
  const expectedArchiveLine = `\`${snippetMeta.reportMdPath}\`、\`${snippetMeta.drillJsonPath}\``;
  const parsedRunUrlEvidence = parseWorkflowRunUrlEvidence(evidence.runUrl);
  const expectedServerEvidence = parseExpectedServerUrlEvidence(expectedServerUrl);
  const expectedRepositoryEvidence = parseExpectedRepositoryEvidence(expectedRepository);
  const expectedRunAttemptEvidence = parseExpectedRunAttemptEvidence(expectedRunAttempt);
  const expectedRefEvidence = parseExpectedRefEvidence(expectedRef);
  const expectedShaEvidence = parseExpectedShaEvidence(expectedSha);
  const manifestRepositoryKnown = manifestEvidence.repository !== 'unknown';
  const manifestServerHostKnown = manifestEvidence.serverHost !== 'unknown';
  const shouldRequireExpectedServerEvidence = evidence.publishable;
  const shouldRequireExpectedRepositoryEvidence = evidence.publishable;
  const shouldRequireExpectedRunAttemptEvidence = evidence.publishable;
  const shouldRequireExpectedRefEvidence = evidence.publishable;
  const shouldRequireExpectedShaEvidence = evidence.publishable;
  const shouldRequireExpectedCanonicalRef =
    evidence.publishable && Boolean(expectedRefEvidence);
  const shouldRequireManifestCanonicalRef = evidence.publishable;
  const shouldRequireExpectedCanonicalSha =
    evidence.publishable && Boolean(expectedShaEvidence);
  const shouldRequireManifestCanonicalSha = evidence.publishable;
  const shouldCheckManifestRunAttemptAgainstExpected = Boolean(expectedRunAttemptEvidence);
  const shouldCheckManifestRefAgainstExpected = Boolean(expectedRefEvidence);
  const shouldCheckManifestShaAgainstExpected = Boolean(expectedShaEvidence);
  const shouldCheckRunUrlRepository =
    evidence.publishable && manifestRepositoryKnown;
  const shouldCheckManifestRepositoryAgainstExpected =
    evidence.publishable && Boolean(expectedRepositoryEvidence);
  const shouldCheckRunUrlRepositoryAgainstExpected =
    evidence.publishable && Boolean(expectedRepositoryEvidence);
  const shouldCheckRunUrlManifestServerHost =
    evidence.publishable && manifestServerHostKnown;
  const shouldCheckManifestServerHostAgainstExpected =
    evidence.publishable && Boolean(expectedServerEvidence);
  const shouldCheckRunUrlExpectedServerHost =
    evidence.publishable && Boolean(expectedServerEvidence);

  const checks = [
    buildCheck({
      name: 'manifest runId equals drill runId',
      expected: evidence.runId,
      actual: manifestEvidence.runId,
      pass: manifestEvidence.runId === evidence.runId
    }),
    buildCheck({
      name: 'manifest runUrl equals drill runUrl',
      expected: evidence.runUrl,
      actual: manifestEvidence.runUrl,
      pass: manifestEvidence.runUrl === evidence.runUrl
    }),
    buildCheck({
      name: 'publishable expected server url is provided',
      expected: shouldRequireExpectedServerEvidence
        ? 'provided for publishable run'
        : 'skip (non-publishable)',
      actual: shouldRequireExpectedServerEvidence
        ? expectedServerEvidence
          ? 'provided'
          : 'missing'
        : 'skip',
      pass: !shouldRequireExpectedServerEvidence || Boolean(expectedServerEvidence)
    }),
    buildCheck({
      name: 'publishable expected repository is provided',
      expected: shouldRequireExpectedRepositoryEvidence
        ? 'provided for publishable run'
        : 'skip (non-publishable)',
      actual: shouldRequireExpectedRepositoryEvidence
        ? expectedRepositoryEvidence
          ? 'provided'
          : 'missing'
        : 'skip',
      pass: !shouldRequireExpectedRepositoryEvidence || Boolean(expectedRepositoryEvidence)
    }),
    buildCheck({
      name: 'publishable expected run attempt is provided',
      expected: shouldRequireExpectedRunAttemptEvidence
        ? 'provided for publishable run'
        : 'skip (non-publishable)',
      actual: shouldRequireExpectedRunAttemptEvidence
        ? expectedRunAttemptEvidence
          ? 'provided'
          : 'missing'
        : 'skip',
      pass: !shouldRequireExpectedRunAttemptEvidence || Boolean(expectedRunAttemptEvidence)
    }),
    buildCheck({
      name: 'publishable expected ref is provided',
      expected: shouldRequireExpectedRefEvidence
        ? 'provided for publishable run'
        : 'skip (non-publishable)',
      actual: shouldRequireExpectedRefEvidence
        ? expectedRefEvidence
          ? 'provided'
          : 'missing'
        : 'skip',
      pass: !shouldRequireExpectedRefEvidence || Boolean(expectedRefEvidence)
    }),
    buildCheck({
      name: 'publishable expected ref is canonical full git ref',
      expected: shouldRequireExpectedCanonicalRef
        ? 'starts with refs/'
        : 'skip (expected ref missing or non-publishable)',
      actual: shouldRequireExpectedCanonicalRef
        ? expectedRefEvidence
        : 'skip',
      pass:
        !shouldRequireExpectedCanonicalRef ||
        isCanonicalGitRef(expectedRefEvidence)
    }),
    buildCheck({
      name: 'publishable expected sha is provided',
      expected: shouldRequireExpectedShaEvidence
        ? 'provided for publishable run'
        : 'skip (non-publishable)',
      actual: shouldRequireExpectedShaEvidence
        ? expectedShaEvidence
          ? 'provided'
          : 'missing'
        : 'skip',
      pass: !shouldRequireExpectedShaEvidence || Boolean(expectedShaEvidence)
    }),
    buildCheck({
      name: 'publishable manifest ref is canonical full git ref',
      expected: shouldRequireManifestCanonicalRef
        ? 'starts with refs/'
        : 'skip (non-publishable)',
      actual: shouldRequireManifestCanonicalRef
        ? toTrimmedString(manifestEvidence.ref) || 'missing'
        : 'skip',
      pass:
        !shouldRequireManifestCanonicalRef ||
        isCanonicalGitRef(manifestEvidence.ref)
    }),
    buildCheck({
      name: 'publishable expected sha is canonical 40-char git commit',
      expected: shouldRequireExpectedCanonicalSha
        ? '40-char lowercase hex'
        : 'skip (expected sha missing or non-publishable)',
      actual: shouldRequireExpectedCanonicalSha
        ? expectedShaEvidence
        : 'skip',
      pass:
        !shouldRequireExpectedCanonicalSha ||
        isFullGitCommitSha(expectedShaEvidence)
    }),
    buildCheck({
      name: 'publishable manifest sha is canonical 40-char git commit',
      expected: shouldRequireManifestCanonicalSha
        ? '40-char lowercase hex'
        : 'skip (non-publishable)',
      actual: shouldRequireManifestCanonicalSha
        ? toLowerTrimmedString(manifestEvidence.sha) || 'missing'
        : 'skip',
      pass:
        !shouldRequireManifestCanonicalSha ||
        isFullGitCommitSha(manifestEvidence.sha)
    }),
    buildCheck({
      name: 'manifest runAttempt matches expected run attempt',
      expected: shouldCheckManifestRunAttemptAgainstExpected
        ? expectedRunAttemptEvidence
        : 'skip (expected run attempt not set)',
      actual: shouldCheckManifestRunAttemptAgainstExpected
        ? manifestEvidence.runAttempt
        : 'skip',
      pass:
        !shouldCheckManifestRunAttemptAgainstExpected ||
        manifestEvidence.runAttempt === expectedRunAttemptEvidence
    }),
    buildCheck({
      name: 'manifest ref matches expected ref',
      expected: shouldCheckManifestRefAgainstExpected
        ? expectedRefEvidence
        : 'skip (expected ref not set)',
      actual: shouldCheckManifestRefAgainstExpected
        ? manifestEvidence.ref
        : 'skip',
      pass:
        !shouldCheckManifestRefAgainstExpected ||
        manifestEvidence.ref === expectedRefEvidence
    }),
    buildCheck({
      name: 'manifest sha matches expected sha',
      expected: shouldCheckManifestShaAgainstExpected
        ? expectedShaEvidence
        : 'skip (expected sha not set)',
      actual: shouldCheckManifestShaAgainstExpected
        ? toLowerTrimmedString(manifestEvidence.sha)
        : 'skip',
      pass:
        !shouldCheckManifestShaAgainstExpected ||
        toLowerTrimmedString(manifestEvidence.sha) === expectedShaEvidence
    }),
    buildCheck({
      name: 'manifest workflow name matches expected',
      expected: expectedWorkflowName,
      actual: manifestEvidence.workflowName,
      pass: manifestEvidence.workflowName === expectedWorkflowName
    }),
    buildCheck({
      name: 'manifest workflow file matches expected',
      expected: expectedWorkflowFile,
      actual: manifestEvidence.workflowFile,
      pass: manifestEvidence.workflowFile === expectedWorkflowFile
    }),
    buildCheck({
      name: 'manifest generatedAt is within freshness window',
      expected: `<=${manifestEvidence.maxAgeHours}h and future skew <=${manifestEvidence.futureSkewMinutes}m`,
      actual: `${manifestEvidence.ageHours.toFixed(2)}h`,
      pass: manifestEvidence.freshnessPass
    }),
    ...Object.entries(digestSources).flatMap(([manifestKey, source]) => {
      const manifestDigest = manifestArtifactDigests[manifestKey];
      const checksForKey = [
        buildCheck({
          name: `manifest includes ${manifestKey} digest`,
          expected: 'present',
          actual: manifestDigest ? 'present' : 'missing',
          pass: Boolean(manifestDigest)
        })
      ];

      if (!manifestDigest) {
        return checksForKey;
      }

      checksForKey.push(
        buildCheck({
          name: `manifest ${manifestKey} path matches artifact path`,
          expected: source.path,
          actual: manifestDigest.path,
          pass: isV3DashboardDrillArtifactPathMatch({
            actualPath: manifestDigest.path,
            expectedPath: source.path
          })
        })
      );

      const computedSha256 = digestUtf8Sha256(source.content);
      checksForKey.push(
        buildCheck({
          name: `manifest ${manifestKey} sha256 matches artifact content`,
          expected: computedSha256,
          actual: manifestDigest.sha256,
          pass: toTrimmedString(manifestDigest.sha256).toLowerCase() === computedSha256
        })
      );

      const computedBytes = String(digestUtf8Bytes(source.content));
      checksForKey.push(
        buildCheck({
          name: `manifest ${manifestKey} bytes matches artifact content`,
          expected: computedBytes,
          actual: String(manifestDigest.bytes),
          pass: String(manifestDigest.bytes) === computedBytes
        })
      );

      return checksForKey;
    }),
    buildCheck({
      name: 'report runId equals drill runId',
      expected: evidence.runId,
      actual: reportEvidence.runId,
      pass: reportEvidence.runId === evidence.runId
    }),
    buildCheck({
      name: 'report runUrl equals drill runUrl',
      expected: evidence.runUrl,
      actual: reportEvidence.runUrl,
      pass: reportEvidence.runUrl === evidence.runUrl
    }),
    buildCheck({
      name: 'report smokeResult equals drill smokeResult',
      expected: evidence.smokeResult,
      actual: reportEvidence.smokeResult,
      pass: reportEvidence.smokeResult === evidence.smokeResult
    }),
    buildCheck({
      name: 'report conclusion equals drill conclusion',
      expected: evidence.conclusion,
      actual: reportEvidence.conclusion,
      pass: reportEvidence.conclusion === evidence.conclusion
    }),
    buildCheck({
      name: 'snippet runId equals drill runId',
      expected: evidence.runId,
      actual: snippetMeta.runId,
      pass: snippetMeta.runId === evidence.runId
    }),
    buildCheck({
      name: 'snippet runUrl equals drill runUrl',
      expected: evidence.runUrl,
      actual: snippetMeta.runUrl,
      pass: snippetMeta.runUrl === evidence.runUrl
    }),
    buildCheck({
      name: 'snippet smokeResult equals drill smokeResult',
      expected: evidence.smokeResult,
      actual: snippetMeta.smokeResult,
      pass: snippetMeta.smokeResult === evidence.smokeResult
    }),
    buildCheck({
      name: 'snippet conclusion equals drill conclusion',
      expected: evidence.conclusion,
      actual: snippetMeta.conclusion,
      pass: snippetMeta.conclusion === evidence.conclusion
    }),
    buildCheck({
      name: 'publishable runUrl is canonical workflow actions link',
      expected: evidence.publishable ? `/actions/runs/${evidence.runId}` : 'skip (non-publishable)',
      actual: evidence.publishable
        ? parsedRunUrlEvidence
          ? `/actions/runs/${parsedRunUrlEvidence.runId}`
          : 'invalid'
        : 'skip (non-publishable)',
      pass: !evidence.publishable || Boolean(parsedRunUrlEvidence && parsedRunUrlEvidence.runId === evidence.runId)
    }),
    buildCheck({
      name: 'publishable manifest repository is known',
      expected: evidence.publishable
        ? 'known repository (owner/repo)'
        : 'skip (non-publishable)',
      actual: evidence.publishable
        ? manifestEvidence.repository
        : 'skip (non-publishable)',
      pass: !evidence.publishable || manifestRepositoryKnown
    }),
    buildCheck({
      name: 'publishable runUrl repository matches manifest repository',
      expected: shouldCheckRunUrlRepository
        ? manifestEvidence.repository
        : 'skip (manifest repository unknown or non-publishable)',
      actual: shouldCheckRunUrlRepository
        ? parsedRunUrlEvidence?.repository || 'invalid'
        : 'skip',
      pass: !shouldCheckRunUrlRepository || parsedRunUrlEvidence?.repository === manifestEvidence.repository
    }),
    buildCheck({
      name: 'publishable manifest repository matches expected repository',
      expected: shouldCheckManifestRepositoryAgainstExpected
        ? expectedRepositoryEvidence
        : 'skip (expected repository not set or non-publishable)',
      actual: shouldCheckManifestRepositoryAgainstExpected
        ? manifestEvidence.repository
        : 'skip',
      pass:
        !shouldCheckManifestRepositoryAgainstExpected ||
        manifestEvidence.repository === expectedRepositoryEvidence
    }),
    buildCheck({
      name: 'publishable runUrl repository matches expected repository',
      expected: shouldCheckRunUrlRepositoryAgainstExpected
        ? expectedRepositoryEvidence
        : 'skip (expected repository not set or non-publishable)',
      actual: shouldCheckRunUrlRepositoryAgainstExpected
        ? parsedRunUrlEvidence?.repository || 'invalid'
        : 'skip',
      pass:
        !shouldCheckRunUrlRepositoryAgainstExpected ||
        parsedRunUrlEvidence?.repository === expectedRepositoryEvidence
    }),
    buildCheck({
      name: 'publishable manifest server host is known',
      expected: evidence.publishable
        ? 'known server host'
        : 'skip (non-publishable)',
      actual: evidence.publishable
        ? manifestEvidence.serverHost
        : 'skip (non-publishable)',
      pass: !evidence.publishable || manifestServerHostKnown
    }),
    buildCheck({
      name: 'publishable manifest server host matches expected server host',
      expected: shouldCheckManifestServerHostAgainstExpected
        ? expectedServerEvidence.host
        : 'skip (expected server url not set or non-publishable)',
      actual: shouldCheckManifestServerHostAgainstExpected
        ? manifestEvidence.serverHost
        : 'skip',
      pass:
        !shouldCheckManifestServerHostAgainstExpected ||
        manifestEvidence.serverHost === expectedServerEvidence.host
    }),
    buildCheck({
      name: 'publishable runUrl host matches manifest server host',
      expected: shouldCheckRunUrlManifestServerHost
        ? manifestEvidence.serverHost
        : 'skip (manifest server host unknown or non-publishable)',
      actual: shouldCheckRunUrlManifestServerHost
        ? parsedRunUrlEvidence?.host || 'invalid'
        : 'skip',
      pass:
        !shouldCheckRunUrlManifestServerHost ||
        parsedRunUrlEvidence?.host === manifestEvidence.serverHost
    }),
    buildCheck({
      name: 'publishable runUrl host matches expected server host',
      expected: shouldCheckRunUrlExpectedServerHost
        ? expectedServerEvidence.host
        : 'skip (expected server url not set or non-publishable)',
      actual: shouldCheckRunUrlExpectedServerHost
        ? parsedRunUrlEvidence?.host || 'invalid'
        : 'skip',
      pass:
        !shouldCheckRunUrlExpectedServerHost ||
        parsedRunUrlEvidence?.host === expectedServerEvidence.host
    }),
    buildCheck({
      name: 'artifact report markdown path matches expected run path',
      expected: expectedPaths.reportMdPath,
      actual: resolvedArtifactPaths.reportMdPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: resolvedArtifactPaths.reportMdPath,
        expectedPath: expectedPaths.reportMdPath
      })
    }),
    buildCheck({
      name: 'artifact drill json path matches expected run path',
      expected: expectedPaths.drillJsonPath,
      actual: resolvedArtifactPaths.drillJsonPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: resolvedArtifactPaths.drillJsonPath,
        expectedPath: expectedPaths.drillJsonPath
      })
    }),
    buildCheck({
      name: 'artifact backlog snippet path matches expected run path',
      expected: expectedPaths.snippetMdPath,
      actual: resolvedArtifactPaths.snippetMdPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: resolvedArtifactPaths.snippetMdPath,
        expectedPath: expectedPaths.snippetMdPath
      })
    }),
    buildCheck({
      name: 'artifact backlog applied path matches expected run path',
      expected: expectedPaths.backlogAppliedPath,
      actual: resolvedArtifactPaths.backlogAppliedPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: resolvedArtifactPaths.backlogAppliedPath,
        expectedPath: expectedPaths.backlogAppliedPath
      })
    }),
    buildCheck({
      name: 'snippet report path targets current run artifact',
      expected: expectedPaths.reportMdPath,
      actual: snippetMeta.reportMdPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: snippetMeta.reportMdPath,
        expectedPath: expectedPaths.reportMdPath
      })
    }),
    buildCheck({
      name: 'snippet drill json path targets current run artifact',
      expected: expectedPaths.drillJsonPath,
      actual: snippetMeta.drillJsonPath,
      pass: isV3DashboardDrillArtifactPathMatch({
        actualPath: snippetMeta.drillJsonPath,
        expectedPath: expectedPaths.drillJsonPath
      })
    }),
    buildCheck({
      name: 'backlog applied preview includes run evidence',
      expected: expectedRunEvidenceLine,
      actual: appliedSection.includes(expectedRunEvidenceLine) ? expectedRunEvidenceLine : 'missing',
      pass: appliedSection.includes(expectedRunEvidenceLine)
    }),
    buildCheck({
      name: 'backlog applied preview includes archive evidence',
      expected: expectedArchiveLine,
      actual: appliedSection.includes(expectedArchiveLine) ? expectedArchiveLine : 'missing',
      pass: appliedSection.includes(expectedArchiveLine)
    }),
    buildCheck({
      name: 'backlog applied preview includes expected conclusion line',
      expected: expectedConclusionLine,
      actual: appliedSection.includes(expectedConclusionLine) ? expectedConclusionLine : 'missing',
      pass: appliedSection.includes(expectedConclusionLine)
    }),
    buildCheck({
      name: 'backlog applied preview includes expected next action',
      expected: expectedNextActionLine,
      actual: appliedSection.includes(expectedNextActionLine) ? expectedNextActionLine : 'missing',
      pass: appliedSection.includes(expectedNextActionLine)
    })
  ];

  const passed = checks.every((check) => check.pass);
  const readyToClose = passed && evidence.publishable;

  return {
    taskId: normalizedTaskId,
    runId: normalizedRunId,
    reportsDir: resolveV3DashboardDrillReportsDir(reportsDir),
    generatedAt: evidence.generatedAt,
    now: manifestEvidence.now,
    manifestGeneratedAt: manifestEvidence.generatedAt,
    manifestAgeHours: manifestEvidence.ageHours,
    maxManifestAgeHours: manifestEvidence.maxAgeHours,
    manifestArtifactDigests: Object.keys(manifestArtifactDigests).length,
    expectedWorkflowName,
    expectedWorkflowFile,
    expectedServerUrl: expectedServerEvidence?.url || 'n/a',
    expectedServerHost: expectedServerEvidence?.host || 'n/a',
    expectedRepository: expectedRepositoryEvidence || 'n/a',
    expectedRunAttempt: expectedRunAttemptEvidence || 'n/a',
    expectedRef: expectedRefEvidence || 'n/a',
    expectedSha: expectedShaEvidence || 'n/a',
    manifestRunAttempt: manifestEvidence.runAttempt,
    manifestRef: manifestEvidence.ref,
    manifestSha: manifestEvidence.sha,
    manifestRepository: manifestEvidence.repository,
    manifestServerHost: manifestEvidence.serverHost,
    manifestRunUrlHost: manifestEvidence.runUrlHost,
    publishable: evidence.publishable,
    passed,
    readyToClose,
    expectedPaths,
    checks
  };
};

export const assertV3DashboardDrillEvidenceGate = ({
  result,
  requirePublishable = false
}) => {
  if (!result || typeof result !== 'object') {
    throw new Error('Evidence gate result is missing');
  }

  const failedChecks = (result.checks || []).filter((check) => !check.pass);
  if (failedChecks.length > 0) {
    const names = failedChecks.map((check) => check.name).join(', ');
    throw new Error(`V3 dashboard evidence gate failed checks: ${names}`);
  }

  if (requirePublishable && !result.readyToClose) {
    throw new Error('V3 dashboard evidence gate is not publishable; cannot close V3-RC-02 yet');
  }
};

export const renderV3DashboardDrillEvidenceGateReport = ({
  result,
  generatedAt = new Date().toISOString(),
  requirePublishable = false
}) => {
  if (!result || typeof result !== 'object') {
    throw new Error('Evidence gate result is missing');
  }

  const lines = [];
  lines.push('# V3Dashboard RC-02 证据对账报告');
  lines.push('');
  lines.push(`- 生成时间（UTC）：${generatedAt}`);
  lines.push(`- 任务卡：\`${result.taskId}\``);
  lines.push(`- run id：\`${result.runId}\``);
  lines.push(`- 目标目录：\`${result.reportsDir}\``);
  lines.push(`- workflow 期望：\`${result.expectedWorkflowName}\``);
  lines.push(`- workflow 文件期望：\`${result.expectedWorkflowFile}\``);
  lines.push(`- server host 期望：\`${result.expectedServerHost || 'n/a'}\``);
  lines.push(`- repository 期望：\`${result.expectedRepository || 'n/a'}\``);
  lines.push(`- runAttempt 期望：\`${result.expectedRunAttempt || 'n/a'}\``);
  lines.push(`- ref 期望：\`${result.expectedRef || 'n/a'}\``);
  lines.push(`- sha 期望：\`${result.expectedSha || 'n/a'}\``);
  lines.push(`- manifest runAttempt：\`${result.manifestRunAttempt || 'unknown'}\``);
  lines.push(`- manifest ref：\`${result.manifestRef || 'unknown'}\``);
  lines.push(`- manifest sha：\`${result.manifestSha || 'unknown'}\``);
  lines.push(`- manifest repository：\`${result.manifestRepository || 'unknown'}\``);
  lines.push(`- manifest server host：\`${result.manifestServerHost || 'unknown'}\``);
  lines.push(`- manifest runUrl host：\`${result.manifestRunUrlHost || 'unknown'}\``);
  lines.push(`- manifest 生成时间（UTC）：${result.manifestGeneratedAt}`);
  lines.push(`- manifest 新鲜度（小时）：${Number(result.manifestAgeHours || 0).toFixed(2)} / <=${result.maxManifestAgeHours}`);
  lines.push(`- manifest 摘要条目数：${result.manifestArtifactDigests ?? 0}`);
  lines.push(`- 对账 verdict：**${result.passed ? 'PASS' : 'FAIL'}**`);
  lines.push(`- 发布证据状态：${result.publishable ? '可发布' : '暂缓发布'}`);
  lines.push(`- 可关闭状态（readyToClose）：${result.readyToClose ? 'yes' : 'no'}`);
  lines.push(`- require-publishable：${requirePublishable ? 'true' : 'false'}`);
  lines.push('');
  lines.push('| Check | Expected | Actual | Status |');
  lines.push('| --- | --- | --- | --- |');

  for (const check of result.checks || []) {
    lines.push(
      `| ${escapeCell(check.name)} | ${escapeCell(check.expected)} | ${escapeCell(check.actual)} | ${
        check.pass ? 'PASS' : 'FAIL'
      } |`
    );
  }

  lines.push('');
  return `${lines.join('\n')}`;
};
