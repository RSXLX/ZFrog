import type { Response } from 'express';

const LEGACY_API_SUNSET = process.env.LEGACY_API_SUNSET || '2026-06-30T00:00:00.000Z';

export function markLegacyDeprecated(res: Response, successorPath: string): void {
  const sunset = new Date(LEGACY_API_SUNSET);
  const sunsetValue = Number.isNaN(sunset.getTime())
    ? 'Mon, 30 Jun 2026 00:00:00 GMT'
    : sunset.toUTCString();

  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', sunsetValue);
  res.setHeader('Link', `<${successorPath}>; rel="successor-version"`);
  res.setHeader('X-API-Deprecated', 'true');
}
