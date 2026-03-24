import type { V3MemoryPalaceWorldReadModel } from '../../../../../packages/shared/src';
import type { ResolvedMemoryWorldTheme } from '../../memory-palace/themes';

interface MemoryWorldOverviewProps {
  world: V3MemoryPalaceWorldReadModel | null;
  theme?: ResolvedMemoryWorldTheme;
  loading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
}

export function MemoryWorldOverview({
  world,
  theme,
  loading = false,
  errorMessage,
  onRefresh,
}: MemoryWorldOverviewProps) {
  const palette = theme?.palette;
  const accentColor = palette?.accent || '#0ea5e9';
  const textColor = palette?.text || '#0f172a';
  const surfaceColor = palette?.surface || '#ffffff';

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm"
      style={{
        borderColor: `${accentColor}33`,
        backgroundColor: surfaceColor,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: textColor }}>
            Memory World Builder
          </h2>
          <p className="mt-1 text-sm" style={{ color: `${textColor}cc` }}>
            Place relics, leave witness notes, and record visitor footprints in one collaborative world.
          </p>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {!loading && !world ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Load an existing world or create one from journey ID to start collaboration.
        </p>
      ) : null}

      {world ? (
        <div className="mt-4 space-y-3">
          <div>
              <p className="text-lg font-semibold text-slate-900">{world.title}</p>
              <p className="text-xs text-slate-500">
                World ID: <span className="font-mono">{world.id}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{world.summary || 'No summary yet.'}</p>
              {theme?.slug ? (
                <p className="mt-2 text-xs" style={{ color: `${textColor}cc` }}>
                  Theme: <span className="font-mono">{theme.slug}</span>
                  {theme.badgeLabel ? ` · ${theme.badgeLabel}` : ''}
                  {theme.source !== 'template' ? ` · fallback:${theme.source}` : ''}
                </p>
              ) : null}
            </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{world.status}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Collaborators</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{world.metrics.collaboratorCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contributions</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{world.metrics.contributionCount}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Owner app: <span className="font-mono">{world.ownerAppId}</span> · Journey:{' '}
            <span className="font-mono">{world.journeyId}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
