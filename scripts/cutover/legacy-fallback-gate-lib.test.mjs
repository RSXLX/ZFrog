import assert from 'node:assert/strict';
import test from 'node:test';
import { computeFallbackStats, parseEntryLine } from './legacy-fallback-report-lib.mjs';
import { evaluateFallbackGate, filterEntriesForGate, renderFallbackGateReport } from './legacy-fallback-gate-lib.mjs';

test('evaluateFallbackGate passes when thresholds are satisfied', () => {
  const entries = [
    parseEntryLine('2026-03-23T11:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev'),
    parseEntryLine(
      '2026-03-23T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    )
  ].filter(Boolean);

  const stats = computeFallbackStats({
    entries,
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 1
  });

  const result = evaluateFallbackGate({
    stats,
    config: {
      gateId: 'test-gate',
      thresholds: {
        maxLegacyLaunches: 2,
        maxLegacyRate: 0.8,
        minTotalLaunchesForRate: 1
      },
      reasonBudgets: {
        'workspace-startup-failed': 1
      }
    }
  });

  assert.equal(result.passed, true);
  assert.equal(result.checks.every((item) => item.pass), true);
});

test('evaluateFallbackGate fails when rate and reason budgets are exceeded', () => {
  const entries = [
    parseEntryLine(
      '2026-03-23T11:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    ),
    parseEntryLine(
      '2026-03-23T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=|runner=dev'
    ),
    parseEntryLine('2026-03-23T09:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev')
  ].filter(Boolean);

  const stats = computeFallbackStats({
    entries,
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 1
  });

  const result = evaluateFallbackGate({
    stats,
    config: {
      thresholds: {
        maxLegacyLaunches: 3,
        maxLegacyRate: 0.5,
        minTotalLaunchesForRate: 1
      },
      reasonBudgets: {
        'workspace-startup-failed': 1
      }
    }
  });

  assert.equal(result.passed, false);
  assert.ok(result.checks.some((check) => check.id === 'legacy-launch-rate' && check.pass === false));
  assert.ok(result.checks.some((check) => check.id.includes('workspace-startup-failed') && check.pass === false));
});

test('filterEntriesForGate excludes dry-run entries when enabled', () => {
  const entries = [
    parseEntryLine(
      '2026-03-23T11:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=--dry-run|runner=dev'
    ),
    parseEntryLine('2026-03-23T10:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev')
  ].filter(Boolean);

  const filtered = filterEntriesForGate({
    entries,
    excludeDryRun: true
  });

  assert.equal(filtered.entries.length, 1);
  assert.equal(filtered.excludedDryRunCount, 1);
  assert.equal(filtered.entries[0].mode, 'workspace');
});

test('renderFallbackGateReport includes verdict and check table', () => {
  const stats = computeFallbackStats({
    entries: [parseEntryLine('2026-03-23T10:00:00Z|mode=workspace|source=arg|reason=|args=|runner=dev')].filter(
      Boolean
    ),
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 1
  });
  const result = evaluateFallbackGate({
    stats,
    config: {
      gateId: 'report-gate',
      thresholds: {
        maxLegacyLaunches: 1,
        maxLegacyRate: 0.5,
        minTotalLaunchesForRate: 1
      }
    },
    excludedDryRunCount: 0
  });

  const report = renderFallbackGateReport({
    configPath: '.github/release-gates/v2-cutover-fallback-gate.json',
    logPath: 'reports/cutover/dev-entry.log',
    generatedAt: new Date('2026-03-23T12:00:00Z'),
    result,
    stats
  });

  assert.match(report, /Legacy Fallback Gate Report/);
  assert.match(report, /Verdict: \*\*PASS\*\*/);
  assert.match(report, /\| Check \| Expected \| Actual \| Result \|/);
});
