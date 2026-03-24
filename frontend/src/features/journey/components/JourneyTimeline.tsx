import type { V3JourneyViewerReadModel } from '../../../../../packages/shared/src';

interface JourneyTimelineProps {
  viewer: V3JourneyViewerReadModel | null;
  loading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-sky-100 text-sky-700',
  FAILED: 'bg-rose-100 text-rose-700',
  SKIPPED: 'bg-amber-100 text-amber-700',
};

const riskStyles: Record<string, string> = {
  LOW: 'border-lime-400',
  MEDIUM: 'border-amber-400',
  HIGH: 'border-rose-400',
};

export function JourneyTimeline({ viewer, loading = false, errorMessage, onRefresh }: JourneyTimelineProps) {
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading journey viewer...</p>
      </section>
    );
  }

  if (!viewer) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Journey Timeline</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a journey or load an existing one to display chapter timeline and choice card.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{viewer.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Journey ID: <span className="font-mono">{viewer.id}</span>
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Metric label="Completion" value={`${viewer.progress.completionPercent}%`} />
        <Metric
          label="Finished"
          value={`${viewer.progress.completedChapters}/${viewer.progress.totalChapters}`}
        />
        <Metric label="Party Members" value={String(viewer.party.memberCount)} />
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {viewer.chapters.map((chapter) => (
          <li
            key={chapter.id}
            className={`rounded-xl border border-slate-200 border-l-4 p-4 ${riskStyles[chapter.riskLevel] || 'border-slate-300'} ${
              chapter.isCurrent ? 'ring-2 ring-emerald-100' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                {chapter.order}. {chapter.title}
              </h3>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  statusStyles[chapter.status] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {chapter.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{chapter.description || 'No description.'}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Risk: {chapter.riskLevel}</span>
              {chapter.isCurrent && <span>Current Chapter</span>}
              {chapter.completedAt && <span>Done: {new Date(chapter.completedAt).toLocaleString()}</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
