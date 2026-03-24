const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toDate = (value) => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return null;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toStatusSet = (value) => {
  if (!Array.isArray(value)) {
    return new Set(['success']);
  }
  const statuses = value
    .map((item) => toTrimmedString(item).toLowerCase())
    .filter(Boolean);

  if (!statuses.length) {
    return new Set(['success']);
  }

  return new Set(statuses);
};

const toLayers = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item).toLowerCase())
    .filter(Boolean);
};

export const normalizeLayerReports = (reports) => {
  if (!Array.isArray(reports)) {
    return [];
  }

  const normalized = [];
  for (const item of reports) {
    if (!isObject(item)) {
      continue;
    }

    const layer = toTrimmedString(item.layer).toLowerCase();
    if (!layer) {
      continue;
    }

    normalized.push({
      layer,
      status: toTrimmedString(item.status).toLowerCase() || 'unknown',
      generatedAt: toTrimmedString(item.generatedAt),
      command: toTrimmedString(item.command),
      source: toTrimmedString(item.source)
    });
  }

  return normalized;
};

export const pickLatestReportsByLayer = (reports) => {
  const latestByLayer = new Map();

  for (const report of reports) {
    const existing = latestByLayer.get(report.layer);
    if (!existing) {
      latestByLayer.set(report.layer, report);
      continue;
    }

    const reportDate = toDate(report.generatedAt);
    const existingDate = toDate(existing.generatedAt);

    if (reportDate && existingDate) {
      if (reportDate.getTime() >= existingDate.getTime()) {
        latestByLayer.set(report.layer, report);
      }
      continue;
    }

    if (reportDate && !existingDate) {
      latestByLayer.set(report.layer, report);
      continue;
    }

    if (!reportDate && !existingDate) {
      latestByLayer.set(report.layer, report);
    }
  }

  return [...latestByLayer.values()];
};

export const evaluateV3BetaReleaseGate = ({ config, reports, now, dryRun = false }) => {
  const safeConfig = isObject(config) ? config : {};
  const requiredLayers = toLayers(safeConfig.requiredLayers);
  const passStatuses = toStatusSet(safeConfig.passStatuses);
  const layerFreshnessHours = Number(safeConfig.layerFreshnessHours ?? 30);
  const allowMissingLayersInDryRun = Boolean(safeConfig.allowMissingLayersInDryRun ?? true);
  const allowFailureInDryRun = Boolean(safeConfig.allowFailureInDryRun ?? true);

  const safeNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();

  const normalizedReports = normalizeLayerReports(reports);
  const latestReports = pickLatestReportsByLayer(normalizedReports);
  const reportMap = new Map(latestReports.map((report) => [report.layer, report]));

  const missingLayers = requiredLayers.filter((layer) => !reportMap.has(layer));

  const failedLayers = [];
  const staleLayers = [];
  const layers = [];

  for (const layer of requiredLayers) {
    const report = reportMap.get(layer);
    if (!report) {
      layers.push({
        layer,
        status: 'missing',
        generatedAt: null,
        ageHours: null,
        command: '',
        source: ''
      });
      continue;
    }

    const generatedAt = toDate(report.generatedAt);
    const ageHours = generatedAt ? Math.max(0, (safeNow.getTime() - generatedAt.getTime()) / (60 * 60 * 1000)) : null;

    if (!passStatuses.has(report.status)) {
      failedLayers.push(`${layer}:${report.status}`);
    }

    if (!generatedAt) {
      staleLayers.push(`${layer}:invalid-generatedAt`);
    } else if (Number.isFinite(layerFreshnessHours) && ageHours > layerFreshnessHours) {
      staleLayers.push(`${layer}:stale-${ageHours.toFixed(2)}h`);
    }

    layers.push({
      layer,
      status: report.status,
      generatedAt: generatedAt ? generatedAt.toISOString() : report.generatedAt || null,
      ageHours,
      command: report.command,
      source: report.source
    });
  }

  for (const report of latestReports) {
    if (!requiredLayers.includes(report.layer)) {
      const generatedAt = toDate(report.generatedAt);
      const ageHours = generatedAt ? Math.max(0, (safeNow.getTime() - generatedAt.getTime()) / (60 * 60 * 1000)) : null;
      layers.push({
        layer: report.layer,
        status: report.status,
        generatedAt: generatedAt ? generatedAt.toISOString() : report.generatedAt || null,
        ageHours,
        command: report.command,
        source: report.source
      });
    }
  }

  const missingStrictPass = missingLayers.length === 0;
  const failureStrictPass = failedLayers.length === 0;
  const freshnessStrictPass = staleLayers.length === 0;

  const checks = [
    {
      id: 'required-layers-present',
      name: 'Required layers present',
      expected: requiredLayers.length ? requiredLayers.join(', ') : 'no required layers',
      actual: missingLayers.length ? `missing: ${missingLayers.join(', ')}` : 'all present',
      strictPass: missingStrictPass,
      effectivePass: missingStrictPass || (dryRun && allowMissingLayersInDryRun)
    },
    {
      id: 'required-layer-status',
      name: 'Required layer status',
      expected: `status in [${[...passStatuses].join(', ')}]`,
      actual: failedLayers.length ? `failed: ${failedLayers.join(', ')}` : 'all passing',
      strictPass: failureStrictPass,
      effectivePass: failureStrictPass || (dryRun && allowFailureInDryRun)
    },
    {
      id: 'required-layer-freshness',
      name: 'Required layer freshness',
      expected: Number.isFinite(layerFreshnessHours)
        ? `generatedAt <= ${layerFreshnessHours}h`
        : 'freshness check disabled',
      actual: staleLayers.length ? `stale: ${staleLayers.join(', ')}` : 'all fresh',
      strictPass: freshnessStrictPass,
      effectivePass: freshnessStrictPass || (dryRun && allowFailureInDryRun)
    }
  ].map((check) => ({
    ...check,
    waived: !check.strictPass && check.effectivePass
  }));

  const strictPassed = checks.every((check) => check.strictPass);
  const passed = checks.every((check) => check.effectivePass);

  return {
    passed,
    strictPassed,
    checks,
    layers,
    meta: {
      gateId: toTrimmedString(safeConfig.gateId) || 'v3-beta-release-gate',
      dryRun,
      allowMissingLayersInDryRun,
      allowFailureInDryRun,
      layerFreshnessHours,
      requiredLayers,
      passStatuses: [...passStatuses],
      reportedLayers: latestReports.map((item) => item.layer).sort()
    }
  };
};

export const renderV3BetaReleaseGateReport = ({ configPath, reportSource, generatedAt, result }) => {
  const lines = [];
  lines.push('# V3 Beta Release Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt.toISOString()} (UTC)`);
  lines.push(`- Gate: \`${result.meta.gateId}\``);
  lines.push(`- Config: \`${configPath}\``);
  lines.push(`- Report source: \`${reportSource}\``);
  lines.push(`- Dry-run: ${result.meta.dryRun ? 'enabled' : 'disabled'}`);
  lines.push(`- Verdict: **${result.passed ? 'PASS' : 'FAIL'}**`);
  if (result.meta.dryRun) {
    lines.push(`- Strict verdict (without dry-run waiver): **${result.strictPassed ? 'PASS' : 'FAIL'}**`);
  }
  lines.push('');
  lines.push('| Check | Expected | Actual | Strict | Effective |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const check of result.checks) {
    const effectiveLabel = check.waived ? 'PASS (waived)' : check.effectivePass ? 'PASS' : 'FAIL';
    lines.push(
      `| ${check.name} | ${check.expected} | ${check.actual} | ${check.strictPass ? 'PASS' : 'FAIL'} | ${effectiveLabel} |`
    );
  }

  lines.push('');
  lines.push('| Layer | Status | Generated At | Age (h) | Command |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const layer of result.layers) {
    const ageValue = Number.isFinite(layer.ageHours) ? layer.ageHours.toFixed(2) : '-';
    lines.push(
      `| ${layer.layer} | ${layer.status} | ${layer.generatedAt || '-'} | ${ageValue} | ${layer.command || '-'} |`
    );
  }

  return `${lines.join('\n')}\n`;
};
