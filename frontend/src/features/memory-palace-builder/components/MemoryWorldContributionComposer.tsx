import { useMemo, useState } from 'react';
import type { V3MemoryPalaceAddContributionPayload } from '../../../../../packages/shared/src';

interface MemoryWorldContributionComposerProps {
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (payload: V3MemoryPalaceAddContributionPayload) => Promise<void>;
}

const actionLabels: Record<V3MemoryPalaceAddContributionPayload['type'], string> = {
  WITNESS_NOTE: 'Add Witness Note',
  RELIC_PLACEMENT: 'Place Relic',
  PHOTO: 'Add Photo',
  MEMORY_FRAGMENT: 'Record Footprint',
};

export function MemoryWorldContributionComposer({
  disabled = false,
  submitting = false,
  onSubmit,
}: MemoryWorldContributionComposerProps) {
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !disabled && !submitting && content.trim().length > 0;
  }, [content, disabled, submitting]);

  const runSubmit = async (type: V3MemoryPalaceAddContributionPayload['type']) => {
    if (!canSubmit) {
      return;
    }

    try {
      setErrorMessage(null);
      const normalizedContent = content.trim();
      const payload: V3MemoryPalaceAddContributionPayload =
        type === 'MEMORY_FRAGMENT'
          ? {
              type,
              content: normalizedContent,
              metadata: {
                kind: 'VISITOR_FOOTPRINT',
              },
            }
          : {
              type,
              content: normalizedContent,
            };

      await onSubmit(payload);
      setContent('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to submit memory world contribution.'
      );
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Co-build Interactions</h3>
      <p className="mt-1 text-sm text-slate-600">
        Leave a message, place relic, or record visitor footprint with write-safe controls.
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Contribution Content</span>
        <textarea
          data-testid="memory-world-contribution-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={800}
          placeholder="Describe the witness note, relic placement, or footprint..."
          disabled={disabled || submitting}
          className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
        />
      </label>

      {disabled ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Integration API key missing or world not loaded. Contribution actions are fail-closed.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="memory-world-add-witness"
          onClick={() => void runSubmit('WITNESS_NOTE')}
          disabled={!canSubmit}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Submitting...' : actionLabels.WITNESS_NOTE}
        </button>

        <button
          type="button"
          data-testid="memory-world-add-relic"
          onClick={() => void runSubmit('RELIC_PLACEMENT')}
          disabled={!canSubmit}
          className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabels.RELIC_PLACEMENT}
        </button>

        <button
          type="button"
          data-testid="memory-world-add-footprint"
          onClick={() => void runSubmit('MEMORY_FRAGMENT')}
          disabled={!canSubmit}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabels.MEMORY_FRAGMENT}
        </button>
      </div>
    </section>
  );
}
