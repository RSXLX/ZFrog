import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateTimeoutStabilityObservationGate,
  renderTimeoutStabilityObservationGateReport
} from './v2-p1-timeout-stability-observation-gate-lib.mjs';

const buildConfig = (overrides = {}) => ({
  gateId: 'v2-p1-timeout-stability-observation-gate',
  observation: {
    requiredConsecutivePassedWeeks: 2,
    failOnInsufficientConsecutivePassedWeeks: true,
    requireLatestTimeoutRunPass: true,
    requireNoTimeoutConsecutiveFailure: true,
    requireTimeoutGatePass: true,
    maxLabelDriftIssues: 0,
    failOnLabelDrift: true,
    requireRatchetingCheck: true,
    ratchetingCheckId: 'timeout-candidate-recovery-threshold-ratchet',
    failOnMissingRatchetingCheck: true,
    failOnRatchetingCheckFailure: true,
    ...(overrides.observation ?? {})
  },
  ...overrides
});

const buildSummary = (overrides = {}) => ({
  timeoutConsecutivePassedWeeks: 2,
  timeoutConsecutiveFailureDetected: false,
  timeoutLatestRunFailed: false,
  ...overrides
});

const buildTimeoutGateResult = (overrides = {}) => ({
  passed: true,
  metrics: {
    labelDriftIssues: 0
  },
  checks: [
    {
      id: 'timeout-candidate-recovery-threshold-ratchet',
      name: 'Timeout candidate recovery threshold ratchet',
      pass: true
    }
  ],
  ...overrides
});

test('evaluateTimeoutStabilityObservationGate passes when all observation conditions are met', () => {
  const result = evaluateTimeoutStabilityObservationGate({
    config: buildConfig(),
    summary: buildSummary(),
    timeoutGateResult: buildTimeoutGateResult()
  });

  assert.equal(result.passed, true);
  assert.equal(result.metrics.observedConsecutivePassedWeeks, 2);
  assert.equal(result.metrics.labelDriftIssues, 0);
  assert.equal(result.metrics.ratchetingCheckPass, true);
});

test('evaluateTimeoutStabilityObservationGate fails when consecutive passed weeks are insufficient', () => {
  const result = evaluateTimeoutStabilityObservationGate({
    config: buildConfig(),
    summary: buildSummary({
      timeoutConsecutivePassedWeeks: 1
    }),
    timeoutGateResult: buildTimeoutGateResult()
  });

  assert.equal(result.passed, false);
  const check = result.checks.find((item) => item.id === 'observation-consecutive-passed-weeks');
  assert.ok(check);
  assert.equal(check.pass, false);
});

test('evaluateTimeoutStabilityObservationGate fails on label drift breach', () => {
  const result = evaluateTimeoutStabilityObservationGate({
    config: buildConfig(),
    summary: buildSummary(),
    timeoutGateResult: buildTimeoutGateResult({
      metrics: {
        labelDriftIssues: 1
      }
    })
  });

  assert.equal(result.passed, false);
  const check = result.checks.find((item) => item.id === 'observation-label-drift-budget');
  assert.ok(check);
  assert.equal(check.pass, false);
});

test('evaluateTimeoutStabilityObservationGate can tolerate missing ratcheting check when policy disables strict mode', () => {
  const result = evaluateTimeoutStabilityObservationGate({
    config: buildConfig({
      observation: {
        failOnMissingRatchetingCheck: false,
        failOnRatchetingCheckFailure: false
      }
    }),
    summary: buildSummary(),
    timeoutGateResult: buildTimeoutGateResult({
      checks: []
    })
  });

  assert.equal(result.passed, true);
  const presenceCheck = result.checks.find((item) => item.id === 'observation-ratcheting-check-present');
  const passCheck = result.checks.find((item) => item.id === 'observation-ratcheting-check-pass');
  assert.ok(presenceCheck);
  assert.ok(passCheck);
  assert.equal(Boolean(presenceCheck.skipped), true);
  assert.equal(Boolean(passCheck.skipped), true);
});

test('renderTimeoutStabilityObservationGateReport includes overview and checks', () => {
  const result = evaluateTimeoutStabilityObservationGate({
    config: buildConfig(),
    summary: buildSummary({
      timeoutConsecutivePassedWeeks: 1
    }),
    timeoutGateResult: buildTimeoutGateResult()
  });

  const report = renderTimeoutStabilityObservationGateReport({
    generatedAt: new Date('2026-03-23T16:00:00.000Z'),
    configPath: '.github/release-gates/v2-p1-timeout-stability-observation-gate.json',
    summaryJsonPath: 'reports/v2-release-health-summary.json',
    timeoutGateJsonPath: 'reports/v2-p1-escalation-timeout-gate.json',
    result
  });

  assert.match(report, /V2 P1 Timeout Stability Observation Gate Report/);
  assert.match(report, /Observation overview/);
  assert.match(report, /Gate checks/);
  assert.match(report, /Timeout consecutive passed weeks/);
});
