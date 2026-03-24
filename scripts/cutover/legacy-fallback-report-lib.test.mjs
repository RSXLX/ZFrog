import assert from 'node:assert/strict';
import test from 'node:test';
import { computeFallbackStats, parseEntryLine, renderFallbackReport } from './legacy-fallback-report-lib.mjs';

test('parseEntryLine parses mode/source/reason fields', () => {
  const entry = parseEntryLine(
    '2026-03-23T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=--dry-run|runner=dev'
  );

  assert.ok(entry);
  assert.equal(entry.mode, 'legacy');
  assert.equal(entry.source, 'arg');
  assert.equal(entry.reason, 'workspace-startup-failed');
});

test('computeFallbackStats counts windowed fallback reasons', () => {
  const entries = [
    parseEntryLine(
      '2026-03-23T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=--dry-run|runner=dev'
    ),
    parseEntryLine(
      '2026-03-23T09:00:00Z|mode=workspace|source=default|reason=|args=|runner=dev'
    ),
    parseEntryLine(
      '2026-03-22T08:00:00Z|mode=legacy|source=env|reason=manual-debug|args=|runner=dev'
    )
  ].filter(Boolean);

  const stats = computeFallbackStats({
    entries,
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 2
  });

  assert.equal(stats.totalEntries, 3);
  assert.equal(stats.legacyEntries, 2);
  assert.equal(stats.reasons[0].key, 'manual-debug');
  assert.equal(stats.reasons[0].count, 1);
});

test('renderFallbackReport renders summary and reason section', () => {
  const stats = computeFallbackStats({
    entries: [
      parseEntryLine(
        '2026-03-23T10:00:00Z|mode=legacy|source=arg|reason=workspace-startup-failed|args=--dry-run|runner=dev'
      )
    ].filter(Boolean),
    now: new Date('2026-03-23T12:00:00Z'),
    windowDays: 1
  });
  const report = renderFallbackReport({ stats, logPath: 'reports/cutover/dev-entry.log' });

  assert.match(report, /Workspace Legacy Fallback Report/);
  assert.match(report, /Legacy launches: 1/);
  assert.match(report, /workspace-startup-failed: 1/);
});
