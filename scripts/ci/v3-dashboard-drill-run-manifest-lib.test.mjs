import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildV3DashboardDrillArtifactDigest,
  buildV3DashboardDrillRunManifest,
  evaluateV3DashboardDrillRunManifestFreshness,
  isV3DashboardDrillArtifactPathMatch,
  parseV3DashboardDrillRunManifest,
  resolveV3DashboardDrillExpectedArtifactPaths
} from './v3-dashboard-drill-run-manifest-lib.mjs';

const buildArtifactDigests = ({ runId }) => ({
  drillReportMd: buildV3DashboardDrillArtifactDigest({
    path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.md`,
    content: '# drill report'
  }),
  drillJson: buildV3DashboardDrillArtifactDigest({
    path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}.json`,
    content: '{\n  "runId": "778899"\n}\n'
  }),
  backlogSnippetMd: buildV3DashboardDrillArtifactDigest({
    path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog.md`,
    content: '# backlog snippet\n'
  }),
  backlogAppliedMd: buildV3DashboardDrillArtifactDigest({
    path: `reports/v3/v3-dashboard-freeze-rollback-drill-${runId}-backlog-applied.md`,
    content: '# backlog applied\n'
  })
});

test('buildV3DashboardDrillRunManifest normalizes required metadata', () => {
  const manifest = buildV3DashboardDrillRunManifest({
    runId: '778899',
    runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
    serverUrl: 'https://github.com',
    workflowName: 'v3-beta-regression-matrix',
    workflowFile: '.github/workflows/v3-beta-regression-matrix.yml',
    eventName: 'workflow_dispatch',
    repository: 'example/zfrog',
    ref: 'refs/heads/main',
    sha: 'abc123',
    runAttempt: '2',
    generatedAt: '2026-03-24T00:00:00Z',
    artifactDigests: buildArtifactDigests({
      runId: '778899'
    })
  });

  const parsed = parseV3DashboardDrillRunManifest({ manifest });
  assert.equal(parsed.runId, '778899');
  assert.equal(parsed.runUrl, 'https://github.com/example/zfrog/actions/runs/778899');
  assert.equal(parsed.serverUrl, 'https://github.com');
  assert.equal(parsed.serverHost, 'github.com');
  assert.equal(parsed.runUrlHost, 'github.com');
  assert.equal(parsed.workflowName, 'v3-beta-regression-matrix');
  assert.equal(parsed.workflowFile, '.github/workflows/v3-beta-regression-matrix.yml');
  assert.equal(parsed.runAttempt, '2');
  assert.equal(parsed.artifactDigests.drillJson.path, 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.json');
});

test('evaluateV3DashboardDrillRunManifestFreshness passes when manifest is fresh', () => {
  const result = evaluateV3DashboardDrillRunManifestFreshness({
    manifest: {
      runId: '778899',
      runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
      serverUrl: 'https://github.com',
      workflowName: 'v3-beta-regression-matrix',
      workflowFile: '.github/workflows/v3-beta-regression-matrix.yml',
      generatedAt: '2026-03-24T00:00:00Z',
      artifactDigests: buildArtifactDigests({
        runId: '778899'
      })
    },
    now: new Date('2026-03-24T12:00:00Z'),
    maxAgeHours: 24
  });

  assert.equal(result.freshnessPass, true);
  assert.equal(result.withinMaxAge, true);
  assert.equal(result.withinFutureSkew, true);
  assert.equal(result.serverHost, 'github.com');
  assert.equal(result.runUrlHost, 'github.com');
  assert.equal(result.artifactDigests.backlogAppliedMd.bytes > 0, true);
});

test('evaluateV3DashboardDrillRunManifestFreshness fails when manifest is stale', () => {
  const result = evaluateV3DashboardDrillRunManifestFreshness({
    manifest: {
      runId: '778899',
      runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
      serverUrl: 'https://github.com',
      workflowName: 'v3-beta-regression-matrix',
      workflowFile: '.github/workflows/v3-beta-regression-matrix.yml',
      generatedAt: '2026-03-20T00:00:00Z',
      artifactDigests: buildArtifactDigests({
        runId: '778899'
      })
    },
    now: new Date('2026-03-24T12:00:00Z'),
    maxAgeHours: 24
  });

  assert.equal(result.freshnessPass, false);
  assert.equal(result.withinMaxAge, false);
});

test('parseV3DashboardDrillRunManifest rejects invalid artifact digest shape', () => {
  assert.throws(
    () =>
      parseV3DashboardDrillRunManifest({
        manifest: {
          runId: '778899',
          runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
          serverUrl: 'https://github.com',
          workflowName: 'v3-beta-regression-matrix',
          workflowFile: '.github/workflows/v3-beta-regression-matrix.yml',
          generatedAt: '2026-03-24T00:00:00Z',
          artifactDigests: {
            drillReportMd: {
              path: 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.md',
              sha256: 'not-a-sha',
              bytes: 12
            }
          }
        }
      }),
    /missing sha256/
  );
});

test('buildV3DashboardDrillRunManifest rejects non-https serverUrl', () => {
  assert.throws(
    () =>
      buildV3DashboardDrillRunManifest({
        runId: '778899',
        runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
        serverUrl: 'http://github.com',
        artifactDigests: buildArtifactDigests({
          runId: '778899'
        })
      }),
    /serverUrl must use https/
  );
});

test('buildV3DashboardDrillRunManifest rejects serverUrl with path segment', () => {
  assert.throws(
    () =>
      buildV3DashboardDrillRunManifest({
        runId: '778899',
        runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
        serverUrl: 'https://github.com/enterprise',
        artifactDigests: buildArtifactDigests({
          runId: '778899'
        })
      }),
    /serverUrl must not include path/
  );
});

test('buildV3DashboardDrillRunManifest rejects runUrl host mismatch against serverUrl host', () => {
  assert.throws(
    () =>
      buildV3DashboardDrillRunManifest({
        runId: '778899',
        runUrl: 'https://evil.example/example/zfrog/actions/runs/778899',
        serverUrl: 'https://github.com',
        artifactDigests: buildArtifactDigests({
          runId: '778899'
        })
      }),
    /runUrl host must match serverUrl host/
  );
});

test('buildV3DashboardDrillRunManifest rejects invalid runAttempt token', () => {
  assert.throws(
    () =>
      buildV3DashboardDrillRunManifest({
        runId: '778899',
        runUrl: 'https://github.com/example/zfrog/actions/runs/778899',
        serverUrl: 'https://github.com',
        runAttempt: '0',
        artifactDigests: buildArtifactDigests({
          runId: '778899'
        })
      }),
    /runAttempt must be a positive integer/
  );
});

test('resolveV3DashboardDrillExpectedArtifactPaths returns canonical run artifacts', () => {
  const paths = resolveV3DashboardDrillExpectedArtifactPaths({
    reportsDir: './reports/v3',
    runId: '778899'
  });

  assert.equal(paths.reportMdPath, 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.md');
  assert.equal(paths.drillJsonPath, 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.json');
  assert.equal(paths.snippetMdPath, 'reports/v3/v3-dashboard-freeze-rollback-drill-778899-backlog.md');
  assert.equal(
    paths.backlogAppliedPath,
    'reports/v3/v3-dashboard-freeze-rollback-drill-778899-backlog-applied.md'
  );
  assert.equal(
    paths.runManifestPath,
    'reports/v3/v3-dashboard-freeze-rollback-drill-778899-run-manifest.json'
  );
});

test('isV3DashboardDrillArtifactPathMatch handles relative path variants', () => {
  assert.equal(
    isV3DashboardDrillArtifactPathMatch({
      actualPath: './reports/v3//v3-dashboard-freeze-rollback-drill-778899.md',
      expectedPath: 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.md'
    }),
    true
  );

  assert.equal(
    isV3DashboardDrillArtifactPathMatch({
      actualPath: 'reports/v3/../secrets/leak.md',
      expectedPath: 'reports/v3/v3-dashboard-freeze-rollback-drill-778899.md'
    }),
    false
  );
});
