import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateV3BetaReleaseGate, pickLatestReportsByLayer } from './v3-beta-release-gate-lib.mjs';

const baseConfig = {
  gateId: 'v3-beta-release-gate',
  requiredLayers: ['contract', 'integration', 'e2e', 'playwright'],
  passStatuses: ['success'],
  layerFreshnessHours: 30,
  allowMissingLayersInDryRun: true,
  allowFailureInDryRun: true
};

const reports = [
  {
    layer: 'contract',
    status: 'success',
    generatedAt: '2026-03-24T00:00:00Z',
    command: 'contract-tests'
  },
  {
    layer: 'integration',
    status: 'success',
    generatedAt: '2026-03-24T00:05:00Z',
    command: 'integration-tests'
  },
  {
    layer: 'e2e',
    status: 'success',
    generatedAt: '2026-03-24T00:10:00Z',
    command: 'e2e-tests'
  },
  {
    layer: 'playwright',
    status: 'success',
    generatedAt: '2026-03-24T00:15:00Z',
    command: 'playwright-tests'
  }
];

test('pickLatestReportsByLayer keeps latest generatedAt per layer', () => {
  const selected = pickLatestReportsByLayer([
    { layer: 'contract', status: 'failure', generatedAt: '2026-03-23T00:00:00Z' },
    { layer: 'contract', status: 'success', generatedAt: '2026-03-24T00:00:00Z' }
  ]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].status, 'success');
});

test('evaluateV3BetaReleaseGate passes in strict mode with complete fresh reports', () => {
  const result = evaluateV3BetaReleaseGate({
    config: baseConfig,
    reports,
    now: new Date('2026-03-24T00:20:00Z')
  });

  assert.equal(result.passed, true);
  assert.equal(result.strictPassed, true);
  assert.equal(result.checks.every((check) => check.strictPass), true);
});

test('evaluateV3BetaReleaseGate fails in strict mode when a required layer is missing', () => {
  const result = evaluateV3BetaReleaseGate({
    config: baseConfig,
    reports: reports.filter((item) => item.layer !== 'playwright'),
    now: new Date('2026-03-24T00:20:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(result.strictPassed, false);
  const missingCheck = result.checks.find((check) => check.id === 'required-layers-present');
  assert.ok(missingCheck);
  assert.equal(missingCheck.strictPass, false);
});

test('evaluateV3BetaReleaseGate dry-run waives strict failure but keeps strict verdict', () => {
  const result = evaluateV3BetaReleaseGate({
    config: baseConfig,
    reports: reports.map((item) => (item.layer === 'e2e' ? { ...item, status: 'failure' } : item)),
    now: new Date('2026-03-24T00:20:00Z'),
    dryRun: true
  });

  assert.equal(result.passed, true);
  assert.equal(result.strictPassed, false);
  const statusCheck = result.checks.find((check) => check.id === 'required-layer-status');
  assert.ok(statusCheck);
  assert.equal(statusCheck.waived, true);
});

test('evaluateV3BetaReleaseGate fails freshness check when report is stale', () => {
  const result = evaluateV3BetaReleaseGate({
    config: {
      ...baseConfig,
      layerFreshnessHours: 2
    },
    reports,
    now: new Date('2026-03-24T10:20:00Z')
  });

  assert.equal(result.passed, false);
  assert.equal(result.strictPassed, false);
  const freshnessCheck = result.checks.find((check) => check.id === 'required-layer-freshness');
  assert.ok(freshnessCheck);
  assert.equal(freshnessCheck.strictPass, false);
});
