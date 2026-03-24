const parseTimestamp = (value) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }
  return timestamp;
};

const parseKvPairs = (segments) => {
  const record = {};
  for (const segment of segments) {
    const equalIndex = segment.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }
    const key = segment.slice(0, equalIndex).trim();
    const value = segment.slice(equalIndex + 1).trim();
    record[key] = value;
  }
  return record;
};

export const parseEntryLine = (line) => {
  if (typeof line !== 'string' || !line.trim()) {
    return null;
  }

  const segments = line.split('|').map((item) => item.trim());
  if (segments.length < 2) {
    return null;
  }

  const timestamp = parseTimestamp(segments[0]);
  if (!timestamp) {
    return null;
  }

  const payload = parseKvPairs(segments.slice(1));
  return {
    timestamp,
    mode: payload.mode || 'unknown',
    source: payload.source || 'unknown',
    reason: payload.reason || '',
    args: payload.args || ''
  };
};

const incrementCount = (counterMap, key) => {
  const normalized = key || 'unspecified';
  counterMap.set(normalized, (counterMap.get(normalized) || 0) + 1);
};

const mapToSortedArray = (counterMap) => {
  return Array.from(counterMap.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

export const computeFallbackStats = ({ entries, now, windowDays }) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(nowDate.getTime())) {
    throw new Error('Invalid now timestamp');
  }

  const days = Number(windowDays ?? 7);
  const durationMs = days * 24 * 60 * 60 * 1000;
  const windowStart = new Date(nowDate.getTime() - durationMs);

  const windowEntries = entries.filter((entry) => entry.timestamp >= windowStart && entry.timestamp <= nowDate);
  const fallbackEntries = windowEntries.filter((entry) => entry.mode === 'legacy');

  const byReason = new Map();
  const bySource = new Map();
  for (const entry of fallbackEntries) {
    incrementCount(byReason, entry.reason || 'unspecified');
    incrementCount(bySource, entry.source || 'unknown');
  }

  return {
    now: nowDate,
    windowStart,
    windowDays: days,
    totalEntries: windowEntries.length,
    legacyEntries: fallbackEntries.length,
    legacyRate: windowEntries.length > 0 ? fallbackEntries.length / windowEntries.length : 0,
    reasons: mapToSortedArray(byReason),
    sources: mapToSortedArray(bySource),
    latestFallbacks: fallbackEntries.slice(-10).reverse()
  };
};

export const renderFallbackReport = ({ stats, logPath }) => {
  const lines = [];
  lines.push('# Workspace Legacy Fallback Report');
  lines.push('');
  lines.push(`- Generated at: ${stats.now.toISOString()} (UTC)`);
  lines.push(`- Log source: \`${logPath}\``);
  lines.push(
    `- Window: ${stats.windowStart.toISOString()} ~ ${stats.now.toISOString()} (${stats.windowDays} days)`
  );
  lines.push(`- Total launches: ${stats.totalEntries}`);
  lines.push(
    `- Legacy launches: ${stats.legacyEntries} (${(stats.legacyRate * 100).toFixed(2)}%)`
  );
  lines.push('');
  lines.push('## Legacy reasons');
  lines.push('');
  if (stats.reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const item of stats.reasons) {
      lines.push(`- ${item.key}: ${item.count}`);
    }
  }
  lines.push('');
  lines.push('## Trigger sources');
  lines.push('');
  if (stats.sources.length === 0) {
    lines.push('- none');
  } else {
    for (const item of stats.sources) {
      lines.push(`- ${item.key}: ${item.count}`);
    }
  }
  lines.push('');
  lines.push('## Latest legacy launches');
  lines.push('');
  if (stats.latestFallbacks.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of stats.latestFallbacks) {
      const reason = entry.reason || 'unspecified';
      lines.push(
        `- ${entry.timestamp.toISOString()} | source=${entry.source} | reason=${reason} | args=${entry.args}`
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}`;
};
