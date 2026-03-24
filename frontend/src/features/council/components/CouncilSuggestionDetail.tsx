import { useMemo, useState } from 'react';
import type {
  V3CouncilSuggestionDecision,
  V3CouncilSuggestionReadModel,
} from '../../../../../packages/shared/src';

interface CouncilSuggestionDetailProps {
  suggestion: V3CouncilSuggestionReadModel | null;
  loading?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  onRespond: (decision: V3CouncilSuggestionDecision, note?: string) => Promise<void>;
}

const statusStyles: Record<string, string> = {
  OPEN: 'bg-sky-100 text-sky-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DEFERRED: 'bg-amber-100 text-amber-700',
};

export function CouncilSuggestionDetail({
  suggestion,
  loading = false,
  disabled = false,
  submitting = false,
  errorMessage,
  onRespond,
}: CouncilSuggestionDetailProps) {
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const canRespond = useMemo(() => {
    if (!suggestion) {
      return false;
    }
    return suggestion.status === 'OPEN' && !disabled;
  }, [disabled, suggestion]);

  const runAction = async (decision: V3CouncilSuggestionDecision) => {
    if (!suggestion || !canRespond || submitting) {
      return;
    }

    const normalizedNote = note.trim();

    try {
      setActionError(null);
      await onRespond(decision, normalizedNote || undefined);
      setNote('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to submit council decision.');
    }
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-slate-600">Loading suggestion detail...</p>
      </section>
    );
  }

  if (!suggestion) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Suggestion Detail</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pick one inbox item to inspect rationale, trace, and decision actions.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{suggestion.title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            Suggestion ID: <span className="font-mono">{suggestion.id}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            statusStyles[suggestion.status] || 'bg-slate-100 text-slate-700'
          }`}
        >
          Status: {suggestion.status}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <p className="font-semibold text-slate-900">Focus</p>
          <p>{suggestion.focus}</p>
        </div>
        {suggestion.objective && (
          <div>
            <p className="font-semibold text-slate-900">Objective</p>
            <p>{suggestion.objective}</p>
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-900">Rationale</p>
          <p>{suggestion.rationale}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Risk</p>
          <p className="mt-1 text-sm text-slate-800">
            {suggestion.risk.level}: {suggestion.risk.reason}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Trace</p>
          <p className="mt-1 text-sm text-slate-800">
            {suggestion.trace.promptKitVersion} · {suggestion.trace.model}
          </p>
          <p className="mt-1 text-xs font-mono text-slate-500">{suggestion.trace.traceId}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Data Sources</p>
          <ul className="space-y-2">
            {suggestion.dataSources.map((item) => (
              <li key={`${item.source}:${item.referenceId || 'none'}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{item.source}</p>
                <p className="text-xs text-slate-500">
                  Ref: {item.referenceId || 'N/A'} · Freshness: {item.freshness || 'N/A'}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Suggested Actions</p>
          <ul className="space-y-2">
            {suggestion.suggestedActions.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Current Response</p>
        <p className="mt-1">
          Decision: {suggestion.response.decision || 'Pending'}
          {suggestion.response.respondedAt
            ? ` · ${new Date(suggestion.response.respondedAt).toLocaleString()}`
            : ''}
        </p>
        {suggestion.response.note && <p className="mt-1">Note: {suggestion.response.note}</p>}
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Decision Note (Optional)</span>
        <textarea
          data-testid="council-response-note"
          className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          disabled={!canRespond || submitting}
          placeholder="Optional note for council audit trail..."
        />
      </label>

      {(errorMessage || actionError) && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {actionError || errorMessage}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="council-respond-accept"
          onClick={() => void runAction('ACCEPT')}
          disabled={!canRespond || submitting}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Submitting...' : 'Accept'}
        </button>
        <button
          type="button"
          data-testid="council-respond-reject"
          onClick={() => void runAction('REJECT')}
          disabled={!canRespond || submitting}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
        <button
          type="button"
          data-testid="council-respond-defer"
          onClick={() => void runAction('DEFER')}
          disabled={!canRespond || submitting}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Defer
        </button>
      </div>
    </section>
  );
}
