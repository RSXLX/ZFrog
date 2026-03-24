import type {
  V3CouncilSuggestionReadModel,
  V3CouncilSuggestionStatus,
} from '../../../../../packages/shared/src';

export type CouncilSuggestionFilter = 'ALL' | V3CouncilSuggestionStatus;

interface CouncilInboxListProps {
  suggestions: V3CouncilSuggestionReadModel[];
  selectedSuggestionId: string | null;
  statusFilter: CouncilSuggestionFilter;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
  onStatusFilterChange: (next: CouncilSuggestionFilter) => void;
  onSelectSuggestion: (suggestionId: string) => void;
  onRefresh?: () => void;
}

const statusStyles: Record<string, string> = {
  OPEN: 'bg-sky-100 text-sky-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DEFERRED: 'bg-amber-100 text-amber-700',
};

export function CouncilInboxList({
  suggestions,
  selectedSuggestionId,
  statusFilter,
  loading = false,
  disabled = false,
  errorMessage,
  onStatusFilterChange,
  onSelectSuggestion,
  onRefresh,
}: CouncilInboxListProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Council Inbox</h2>
          <p className="mt-1 text-sm text-slate-600">
            Browse suggestion queue and open one item for detailed decision.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Council status filter"
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as CouncilSuggestionFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="DEFERRED">Deferred</option>
          </select>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={disabled || loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {disabled && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Integration API key missing. Inbox requests are fail-closed.
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      {!loading && !disabled && suggestions.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No suggestions found in current filter.
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-600">Loading council inbox...</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {suggestions.map((suggestion) => {
            const isSelected = selectedSuggestionId === suggestion.id;
            return (
              <li key={suggestion.id}>
                <button
                  type="button"
                  data-testid={`council-inbox-item-${suggestion.id}`}
                  onClick={() => onSelectSuggestion(suggestion.id)}
                  disabled={disabled}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        statusStyles[suggestion.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {suggestion.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{suggestion.focus}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Risk: {suggestion.risk.level} · {new Date(suggestion.updatedAt).toLocaleString()}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
