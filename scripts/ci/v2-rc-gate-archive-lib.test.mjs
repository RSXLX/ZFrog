import assert from 'node:assert/strict';
import test from 'node:test';
import { renderArchivedReport, resolveArchiveFilename, sanitizeFileToken, toCompactUtcTimestamp } from './v2-rc-gate-archive-lib.mjs';

test('toCompactUtcTimestamp renders sortable utc value', () => {
  const value = toCompactUtcTimestamp(new Date('2026-03-23T10:11:12.000Z'));
  assert.equal(value, '20260323T101112Z');
});

test('sanitizeFileToken strips unsafe characters', () => {
  assert.equal(sanitizeFileToken(' run id:123 '), 'run-id-123');
  assert.equal(sanitizeFileToken('***', 'fallback'), 'fallback');
});

test('resolveArchiveFilename includes run identifier and timestamp', () => {
  const filename = resolveArchiveFilename({
    generatedAt: new Date('2026-03-23T10:11:12.000Z'),
    runId: '9988'
  });
  assert.equal(filename, 'v2-rc-gate-20260323T101112Z-run-9988.md');
});

test('renderArchivedReport prepends evidence metadata', () => {
  const report = renderArchivedReport({
    report: '# Base Report\n\n- Verdict: PASS\n',
    metadata: {
      archivedAt: '2026-03-23T10:11:12.000Z',
      workflow: 'v2-rc-release-gate',
      runId: '9988',
      runUrl: 'https://example.test/runs/9988',
      ref: 'refs/heads/main',
      sha: 'abc123'
    }
  });

  assert.match(report, /# V2 RC Gate Archived Evidence/);
  assert.match(report, /Run ID: 9988/);
  assert.match(report, /# Base Report/);
});
