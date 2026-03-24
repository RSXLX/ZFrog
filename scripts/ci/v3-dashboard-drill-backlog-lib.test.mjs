import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateDrillBacklogEvidence,
  renderV3DashboardBacklogSnippet
} from './v3-dashboard-drill-backlog-lib.mjs';

const passPayload = {
  generatedAt: '2026-03-24T10:11:12.000Z',
  runId: '9988',
  runUrl: 'https://github.com/example/zfrog/actions/runs/9988',
  drill: {
    smokeResult: 'pass',
    conclusion: '可发布'
  }
};

test('evaluateDrillBacklogEvidence returns publishable evidence', () => {
  const evidence = evaluateDrillBacklogEvidence({
    payload: passPayload,
    expectedRunId: '9988'
  });

  assert.equal(evidence.publishable, true);
  assert.equal(evidence.runId, '9988');
  assert.equal(evidence.generatedDate, '2026-03-24');
});

test('evaluateDrillBacklogEvidence rejects pass result without run URL', () => {
  assert.throws(
    () =>
      evaluateDrillBacklogEvidence({
        payload: {
          ...passPayload,
          runUrl: 'n/a'
        }
      }),
    /requires a workflow run URL/
  );
});

test('evaluateDrillBacklogEvidence rejects publishable evidence with runId/url mismatch', () => {
  assert.throws(
    () =>
      evaluateDrillBacklogEvidence({
        payload: {
          ...passPayload,
          runUrl: 'https://github.com/example/zfrog/actions/runs/9989'
        }
      }),
    /requires canonical workflow run URL bound to runId/
  );
});

test('renderV3DashboardBacklogSnippet outputs blocked next action when drill fails', () => {
  const evidence = evaluateDrillBacklogEvidence({
    payload: {
      generatedAt: '2026-03-24T10:11:12.000Z',
      runId: 'local',
      runUrl: 'n/a',
      drill: {
        smokeResult: 'fail',
        conclusion: '暂缓发布'
      }
    }
  });

  const snippet = renderV3DashboardBacklogSnippet({
    evidence,
    reportMdPath: 'reports/v3/drill-local.md',
    drillJsonPath: 'reports/v3/drill-local.json'
  });

  assert.match(snippet, /V3-RC-02 执行记录回写片段（自动生成）/);
  assert.match(snippet, /演练结论=`暂缓发布`/);
  assert.match(snippet, /保持 `暂缓发布`/);
});
