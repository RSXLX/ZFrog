import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRunEvidenceForPass,
  buildDrillResult,
  isCanonicalWorkflowRunUrlForRunId,
  normalizeLayerStatus,
  parseWorkflowRunUrlEvidence,
  renderV3DashboardDrillReport,
  resolveDrillReportFilename,
  toMinuteToken
} from './v3-dashboard-drill-report-lib.mjs';

test('toMinuteToken renders YYYYMMDD-HHmm in UTC', () => {
  assert.equal(toMinuteToken(new Date('2026-03-24T10:11:12.000Z')), '20260324-1011');
});

test('resolveDrillReportFilename includes timestamp and run id', () => {
  const filename = resolveDrillReportFilename({
    generatedAt: new Date('2026-03-24T10:11:12.000Z'),
    runId: '9988'
  });
  assert.equal(filename, 'v3-dashboard-freeze-rollback-drill-20260324-1011-run-9988.md');
});

test('normalizeLayerStatus maps github outcomes to pass/fail', () => {
  assert.equal(normalizeLayerStatus('success'), 'pass');
  assert.equal(normalizeLayerStatus('failure'), 'fail');
  assert.equal(normalizeLayerStatus('unknown'), 'fail');
});

test('assertRunEvidenceForPass blocks pass without run url', () => {
  assert.throws(
    () =>
      assertRunEvidenceForPass({
        smokeStatus: 'pass',
        runUrl: 'n/a',
        runId: '9988'
      }),
    /requires a workflow run URL evidence/
  );
});

test('assertRunEvidenceForPass blocks pass with non-canonical run url', () => {
  assert.throws(
    () =>
      assertRunEvidenceForPass({
        smokeStatus: 'pass',
        runUrl: 'https://github.com/example/zfrog/runs/9988',
        runId: '9988'
      }),
    /requires canonical workflow run URL evidence/
  );
});

test('parseWorkflowRunUrlEvidence parses canonical github run url', () => {
  const parsed = parseWorkflowRunUrlEvidence('https://github.com/example/zfrog/actions/runs/9988');
  assert.deepEqual(parsed, {
    runId: '9988',
    repository: 'example/zfrog',
    protocol: 'https:',
    host: 'github.com'
  });
});

test('parseWorkflowRunUrlEvidence rejects non-https and non-canonical url variants', () => {
  assert.equal(
    parseWorkflowRunUrlEvidence('http://github.com/example/zfrog/actions/runs/9988'),
    null
  );
  assert.equal(
    parseWorkflowRunUrlEvidence('https://github.com/example/zfrog/actions/runs/9988?attempt=1'),
    null
  );
  assert.equal(
    parseWorkflowRunUrlEvidence('https://github.com/example/zfrog/actions/runs/9988#step:1:1'),
    null
  );
});

test('isCanonicalWorkflowRunUrlForRunId validates run id binding', () => {
  assert.equal(
    isCanonicalWorkflowRunUrlForRunId({
      runUrl: 'https://github.com/example/zfrog/actions/runs/9988',
      runId: '9988'
    }),
    true
  );
  assert.equal(
    isCanonicalWorkflowRunUrlForRunId({
      runUrl: 'https://github.com/example/zfrog/actions/runs/9988',
      runId: '9989'
    }),
    false
  );
});

test('buildDrillResult returns blocked verdict for failed layer status', () => {
  const result = buildDrillResult({
    layerStatus: 'failure',
    runUrl: 'n/a'
  });

  assert.equal(result.smokeResult, 'fail');
  assert.equal(result.conclusion, '暂缓发布');
  assert.match(result.anomalies, /EPERM/);
});

test('renderV3DashboardDrillReport includes key sections and values', () => {
  const report = renderV3DashboardDrillReport({
    meta: {
      generatedAt: '2026-03-24T10:11:12.000Z',
      owner: 'QA Owner',
      environment: 'staging',
      triggerReason: 'rc drill',
      runId: '9988',
      runUrl: 'https://github.com/example/zfrog/actions/runs/9988',
      moduleName: 'relationshipGraph',
      betaGate: 'VITE_V3_DASHBOARD_BETA_ENABLED=true',
      freezeEndpoint: '/api/admin/v3/runtime/modules/:module/toggle',
      moduleReadEndpoint: '/api/admin/v3/relationship-graph/frogs/:frogId'
    },
    drill: {
      smokeResult: 'pass',
      runtimeStatusSnapshot: 'enabled',
      moduleSnapshot: 'relationshipGraph: ACTIVE -> BLOCKED -> ACTIVE',
      freezeWritePathResult: 'pass',
      rollbackReadPathResult: 'pass',
      freezeSeconds: '18',
      rollbackSeconds: '14',
      runtimeStatusApiResult: 'pass',
      moduleReadApiResult: 'pass',
      anomalies: 'none',
      conclusion: '可发布'
    }
  });

  assert.match(report, /# V3Dashboard 运营冻结\/回滚演练记录/);
  assert.match(report, /证据链接：https:\/\/github\.com\/example\/zfrog\/actions\/runs\/9988/);
  assert.match(report, /Playwright 双态 smoke 结果：pass/);
});
