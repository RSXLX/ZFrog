import assert from 'node:assert/strict';
import test from 'node:test';
import { countConsecutiveSuccesses, evaluateGate } from './v2-rc-gate-lib.mjs';

const baseConfig = {
  gateId: 'v2-rc',
  nightly: {
    workflowFile: 'v2-regression-nightly-matrix.yml',
    requiredConsecutiveSuccesses: 3,
    maxHoursSinceLatestSuccess: 30
  },
  defectBudget: {
    p0Open: 0,
    p1Open: 0
  },
  defectSnapshot: {
    p0Open: 0,
    p1Open: 0,
    updatedAt: '2026-03-23T09:55:00Z',
    source: 'test'
  }
};

const successRuns = [
  {
    status: 'completed',
    conclusion: 'success',
    updated_at: '2026-03-23T09:00:00Z',
    html_url: 'https://example.test/runs/3'
  },
  {
    status: 'completed',
    conclusion: 'success',
    updated_at: '2026-03-22T09:00:00Z',
    html_url: 'https://example.test/runs/2'
  },
  {
    status: 'completed',
    conclusion: 'success',
    updated_at: '2026-03-21T09:00:00Z',
    html_url: 'https://example.test/runs/1'
  }
];

test('countConsecutiveSuccesses stops at first non-success run', () => {
  const runs = [
    { status: 'completed', conclusion: 'success' },
    { status: 'completed', conclusion: 'failure' },
    { status: 'completed', conclusion: 'success' }
  ];
  assert.equal(countConsecutiveSuccesses(runs), 1);
});

test('evaluateGate passes when defects are zero and nightly is stable/fresh', () => {
  const now = new Date('2026-03-23T10:00:00Z');
  const result = evaluateGate({
    config: baseConfig,
    runs: successRuns,
    now
  });

  assert.equal(result.passed, true);
  assert.equal(result.checks.every((item) => item.pass), true);
});

test('evaluateGate fails when defects exceed budget', () => {
  const now = new Date('2026-03-23T10:00:00Z');
  const result = evaluateGate({
    config: {
      ...baseConfig,
      defectSnapshot: {
        ...baseConfig.defectSnapshot,
        p1Open: 1
      }
    },
    runs: successRuns,
    now
  });

  assert.equal(result.passed, false);
  const p1Check = result.checks.find((check) => check.id === 'defect-p1');
  assert.ok(p1Check);
  assert.equal(p1Check.pass, false);
});

test('evaluateGate fails when latest success is too old', () => {
  const now = new Date('2026-03-25T10:00:00Z');
  const result = evaluateGate({
    config: baseConfig,
    runs: successRuns,
    now
  });

  assert.equal(result.passed, false);
  const freshnessCheck = result.checks.find((check) => check.id === 'nightly-freshness');
  assert.ok(freshnessCheck);
  assert.equal(freshnessCheck.pass, false);
});
