import assert from 'node:assert/strict';
import test from 'node:test';
import { countConsecutiveSuccesses, evaluateV3RcGate, filterRunsByAllowedEvents } from './v3-rc-gate-lib.mjs';

const baseConfig = {
  gateId: 'v3-rc-gate',
  nightly: {
    workflowFile: 'v3-beta-regression-matrix.yml',
    requiredConsecutiveSuccesses: 3,
    maxHoursSinceLatestSuccess: 30,
    allowedEvents: ['schedule']
  },
  defectBudget: {
    p0Open: 0,
    p1Open: 0
  },
  defectSnapshot: {
    p0Open: 0,
    p1Open: 0,
    updatedAt: '2026-03-24T00:00:00Z',
    maxHoursSinceUpdated: 168,
    source: 'test'
  }
};

const successRuns = [
  {
    id: 2003,
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-24T05:00:00Z',
    html_url: 'https://example.test/runs/2003'
  },
  {
    id: 2002,
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-24T02:00:00Z',
    html_url: 'https://example.test/runs/2002'
  },
  {
    id: 2001,
    status: 'completed',
    conclusion: 'success',
    event: 'schedule',
    updated_at: '2026-03-23T23:00:00Z',
    html_url: 'https://example.test/runs/2001'
  }
];

test('countConsecutiveSuccesses stops on first non-success run', () => {
  const runs = [
    { status: 'completed', conclusion: 'success' },
    { status: 'completed', conclusion: 'failure' },
    { status: 'completed', conclusion: 'success' }
  ];

  assert.equal(countConsecutiveSuccesses(runs), 1);
});

test('filterRunsByAllowedEvents keeps only configured events', () => {
  const filtered = filterRunsByAllowedEvents(
    [
      { event: 'schedule' },
      { event: 'workflow_dispatch' }
    ],
    new Set(['schedule'])
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].event, 'schedule');
});

test('evaluateV3RcGate passes with stable schedule runs and fresh snapshot', () => {
  const result = evaluateV3RcGate({
    config: baseConfig,
    runs: successRuns,
    now: new Date('2026-03-24T06:00:00Z')
  });

  assert.equal(result.passed, true);
  assert.equal(result.checks.every((check) => check.pass), true);
});

test('evaluateV3RcGate fails when defect budget is exceeded', () => {
  const result = evaluateV3RcGate({
    config: {
      ...baseConfig,
      defectSnapshot: {
        ...baseConfig.defectSnapshot,
        p1Open: 1
      }
    },
    runs: successRuns,
    now: new Date('2026-03-24T06:00:00Z')
  });

  assert.equal(result.passed, false);
  const p1Check = result.checks.find((check) => check.id === 'defect-p1');
  assert.ok(p1Check);
  assert.equal(p1Check.pass, false);
});

test('evaluateV3RcGate fails when schedule event coverage is missing', () => {
  const result = evaluateV3RcGate({
    config: baseConfig,
    runs: successRuns.map((run) => ({ ...run, event: 'workflow_dispatch' })),
    now: new Date('2026-03-24T06:00:00Z')
  });

  assert.equal(result.passed, false);
  const coverageCheck = result.checks.find((check) => check.id === 'nightly-run-coverage');
  assert.ok(coverageCheck);
  assert.equal(coverageCheck.pass, false);
});
