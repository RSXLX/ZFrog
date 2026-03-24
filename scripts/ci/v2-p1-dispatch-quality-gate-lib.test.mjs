import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateDispatchQualityGate,
  renderDispatchQualityGateReport
} from './v2-p1-dispatch-quality-gate-lib.mjs';

const buildConfig = (overrides = {}) => ({
  gateId: 'v2-p1-dispatch-quality-gate',
  thresholds: {
    maxFailedCreatesPerRun: 0,
    maxRetryExhausted: 0,
    maxIdempotencyParseErrors: 0,
    ...(overrides.thresholds ?? {})
  },
  ...overrides
});

const buildDispatchResult = (overrides = {}) => ({
  mode: 'apply',
  retryPolicy: {
    maxAttempts: 3
  },
  actions: [
    {
      reason: 'workspace-startup-failed',
      decision: 'created',
      attempts: 2
    },
    {
      reason: 'manual-debug',
      decision: 'skip-existing'
    }
  ],
  ...overrides
});

test('evaluateDispatchQualityGate passes when thresholds are satisfied', () => {
  const result = evaluateDispatchQualityGate({
    dispatchResult: buildDispatchResult(),
    config: buildConfig(),
    idempotencyLog: {
      records: [
        { key: 'a', decision: 'created', recordedAt: '2026-03-23T12:00:00.000Z' },
        { key: 'b', decision: 'created', recordedAt: '2026-03-23T12:01:00.000Z' }
      ],
      parseErrors: 0,
      totalLines: 2
    }
  });

  assert.equal(result.passed, true);
  assert.equal(result.metrics.failedCreates, 0);
  assert.equal(result.metrics.retryExhausted, 0);
  assert.equal(result.metrics.retriedSuccesses, 1);
  assert.equal(result.metrics.idempotencyDuplicateKeys, 0);
});

test('evaluateDispatchQualityGate fails on failed creates and retry exhausted', () => {
  const result = evaluateDispatchQualityGate({
    dispatchResult: buildDispatchResult({
      actions: [
        { reason: 'r1', decision: 'failed', attempts: 3 },
        { reason: 'r2', decision: 'failed', attempts: 2 },
        { reason: 'r3', decision: 'created', attempts: 1 }
      ]
    }),
    config: buildConfig({
      thresholds: {
        maxFailedCreatesPerRun: 1,
        maxRetryExhausted: 0,
        maxIdempotencyParseErrors: 0
      }
    }),
    idempotencyLog: {
      records: [
        { key: 'r1', decision: 'failed' },
        { key: 'r1', decision: 'failed' }
      ],
      parseErrors: 0,
      totalLines: 2
    }
  });

  assert.equal(result.passed, false);
  assert.equal(result.metrics.failedCreates, 2);
  assert.equal(result.metrics.retryExhausted, 1);
  assert.equal(result.metrics.idempotencyDuplicateKeys, 1);
  const failedChecks = result.checks.filter((check) => !check.pass).map((check) => check.id);
  assert.deepEqual(failedChecks.sort(), ['failed-creates-per-run', 'retry-exhausted']);
});

test('evaluateDispatchQualityGate fails when idempotency parse errors exceed threshold', () => {
  const result = evaluateDispatchQualityGate({
    dispatchResult: buildDispatchResult(),
    config: buildConfig({
      thresholds: {
        maxIdempotencyParseErrors: 0
      }
    }),
    idempotencyLog: {
      records: [{ key: 'a', decision: 'created' }],
      parseErrors: 2,
      totalLines: 3
    }
  });

  assert.equal(result.passed, false);
  assert.equal(result.metrics.idempotencyParseErrors, 2);
  assert.equal(result.checks.find((check) => check.id === 'idempotency-log-parse-errors')?.pass, false);
});

test('renderDispatchQualityGateReport includes quality metrics and checks', () => {
  const result = evaluateDispatchQualityGate({
    dispatchResult: buildDispatchResult(),
    config: buildConfig(),
    idempotencyLog: {
      records: [],
      parseErrors: 0,
      totalLines: 0,
      missing: true
    }
  });

  const report = renderDispatchQualityGateReport({
    generatedAt: new Date('2026-03-23T13:00:00.000Z'),
    configPath: '.github/release-gates/v2-p1-dispatch-quality-gate.json',
    dispatchJsonPath: 'reports/v2-p1-escalation-dispatch.json',
    idempotencyLogPath: 'reports/v2-p1-escalation-dispatch-idempotency.jsonl',
    result
  });

  assert.match(report, /V2 P1 Dispatch Quality Gate Report/);
  assert.match(report, /Dispatch quality overview/);
  assert.match(report, /Failed creates/);
  assert.match(report, /Gate checks/);
});
