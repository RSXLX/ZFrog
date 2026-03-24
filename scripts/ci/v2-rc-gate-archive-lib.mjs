const COMPACT_UTC_REGEX = /[-:]/g;

export const toCompactUtcTimestamp = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid archive timestamp');
  }

  return date.toISOString().replace(COMPACT_UTC_REGEX, '').replace(/\.\d{3}/, '');
};

export const sanitizeFileToken = (value, fallback = 'na') => {
  const token = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return token || fallback;
};

export const resolveArchiveFilename = ({ generatedAt, runId }) => {
  const timestamp = toCompactUtcTimestamp(generatedAt);
  const normalizedRunId = sanitizeFileToken(runId, 'local');
  return `v2-rc-gate-${timestamp}-run-${normalizedRunId}.md`;
};

export const renderArchivedReport = ({ report, metadata }) => {
  const lines = [];
  lines.push('# V2 RC Gate Archived Evidence');
  lines.push('');
  lines.push(`- Archived at: ${metadata.archivedAt}`);
  lines.push(`- Workflow: ${metadata.workflow}`);
  lines.push(`- Run ID: ${metadata.runId}`);
  lines.push(`- Run URL: ${metadata.runUrl}`);
  lines.push(`- Ref: ${metadata.ref}`);
  lines.push(`- Commit: ${metadata.sha}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(report.trimEnd());
  lines.push('');
  return `${lines.join('\n')}`;
};
