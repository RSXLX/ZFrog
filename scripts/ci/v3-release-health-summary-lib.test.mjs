import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateV3ReleaseHealth,
  renderV3ReleaseHealthSummaryReport
} from './v3-release-health-summary-lib.mjs';

const passPayload = {
  configPath: '.github/release-gates/v3-rc-gate.json',
  runSource: 'fixture:test',
  result: {
    passed: true,
    checks: [
      { id: 'defect-p0', name: 'P0 defects within budget', expected: '<= 0', actual: '0', pass: true },
      { id: 'defect-p1', name: 'P1 defects within budget', expected: '<= 0', actual: '0', pass: true },
      {
        id: 'defect-snapshot-freshness',
        name: 'Defect snapshot freshness',
        expected: 'updated <= 168h',
        actual: 'updated 2.00h ago',
        pass: true
      },
      {
        id: 'nightly-stability',
        name: 'Nightly stability',
        expected: '3 consecutive successful runs',
        actual: '3 consecutive successful runs',
        pass: true
      },
      {
        id: 'nightly-freshness',
        name: 'Nightly freshness',
        expected: 'latest success <= 30h ago',
        actual: 'latest success 2.00h ago',
        pass: true
      }
    ],
    meta: {
      gateId: 'v3-rc-gate',
      workflowFile: 'v3-beta-regression-matrix.yml',
      consecutiveSuccesses: 3,
      requiredSuccesses: 3,
      latestSuccessAt: '2026-03-24T04:00:00.000Z',
      latestSuccessUrl: 'https://example.test/runs/3',
      defect: {
        p0Open: 0,
        p1Open: 0,
        p0Budget: 0,
        p1Budget: 0,
        snapshotUpdatedAt: '2026-03-24T02:00:00.000Z',
        snapshotSource: 'test',
        hoursSinceSnapshot: 2
      }
    }
  }
};

test('evaluateV3ReleaseHealth marks GREEN when RC gate passed', () => {
  const summary = evaluateV3ReleaseHealth({
    rcGatePayload: passPayload,
    now: new Date('2026-03-24T06:00:00Z')
  });

  assert.equal(summary.passed, true);
  assert.equal(summary.healthLevel, 'GREEN');
  assert.equal(summary.failedCheckCount, 0);
});

test('evaluateV3ReleaseHealth marks RED when defect checks fail', () => {
  const summary = evaluateV3ReleaseHealth({
    rcGatePayload: {
      ...passPayload,
      result: {
        ...passPayload.result,
        passed: false,
        checks: passPayload.result.checks.map((check) =>
          check.id === 'defect-p1' ? { ...check, actual: '2', pass: false } : check
        )
      }
    },
    now: new Date('2026-03-24T06:00:00Z')
  });

  assert.equal(summary.healthLevel, 'RED');
  assert.equal(summary.failedCheckCount, 1);
  assert.equal(summary.actionItems[0].checkId, 'defect-p1');
});

test('renderV3ReleaseHealthSummaryReport includes verdict and action section', () => {
  const summary = evaluateV3ReleaseHealth({
    rcGatePayload: passPayload,
    now: new Date('2026-03-24T06:00:00Z')
  });

  const report = renderV3ReleaseHealthSummaryReport({
    rcResultPath: 'reports/v3/v3-rc-gate.json',
    summary
  });

  assert.match(report, /# V3 Release Health Summary/);
  assert.match(report, /RC gate verdict: \*\*PASS\*\*/);
  assert.match(report, /Action Items/);
});
