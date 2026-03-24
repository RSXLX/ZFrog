import { useMemo, useState } from 'react';
import type {
  V3JourneySettleStepPayload,
  V3JourneyViewerReadModel,
} from '../../../../../packages/shared/src';

interface JourneyChoiceCardProps {
  viewer: V3JourneyViewerReadModel | null;
  disabled?: boolean;
  submitting?: boolean;
  onAdvance: (stepId: string, reason?: string) => Promise<void>;
  onSettle: (stepId: string, result: V3JourneySettleStepPayload['result'], reason?: string) => Promise<void>;
}

export function JourneyChoiceCard({
  viewer,
  disabled = false,
  submitting = false,
  onAdvance,
  onSettle,
}: JourneyChoiceCardProps) {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentChapter = useMemo(() => {
    if (!viewer) {
      return null;
    }
    return viewer.chapters.find((chapter) => chapter.isCurrent) || null;
  }, [viewer]);

  const isLocked = disabled || submitting;

  if (!viewer) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Choice Card</h2>
        <p className="mt-2 text-sm text-slate-600">
          No active journey loaded. Create or load a journey first.
        </p>
      </section>
    );
  }

  if (!currentChapter || currentChapter.status !== 'ACTIVE') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Choice Card</h2>
        <p className="mt-2 text-sm text-slate-600">
          Journey has no active chapter to resolve.
        </p>
      </section>
    );
  }

  const submitReason = reason.trim();

  const runAction = async (
    action: () => Promise<void>,
    options?: {
      clearReason?: boolean;
    }
  ) => {
    try {
      setErrorMessage(null);
      await action();
      if (options?.clearReason) {
        setReason('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to execute chapter action.');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Choice Card</h2>
      <p className="mt-1 text-sm text-slate-600">
        Resolve active chapter with explicit action. Writes are blocked during in-flight requests.
      </p>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-900">
          Active: {currentChapter.order}. {currentChapter.title}
        </p>
        <p className="mt-1 text-sm text-emerald-800">{currentChapter.description || 'No description.'}</p>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Reason (Optional)</span>
        <textarea
          className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={280}
          disabled={isLocked}
          placeholder="Add context for audit trail..."
        />
      </label>

      {errorMessage && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isLocked}
          onClick={() =>
            runAction(
              () => onAdvance(currentChapter.id, submitReason || undefined),
              { clearReason: true }
            )
          }
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Complete Chapter
        </button>
        <button
          type="button"
          disabled={isLocked}
          onClick={() =>
            runAction(
              () => onSettle(currentChapter.id, 'SKIPPED', submitReason || undefined),
              { clearReason: true }
            )
          }
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Skip Chapter
        </button>
        <button
          type="button"
          disabled={isLocked}
          onClick={() =>
            runAction(
              () => onSettle(currentChapter.id, 'FAILED', submitReason || undefined),
              { clearReason: true }
            )
          }
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark Failed
        </button>
      </div>
    </section>
  );
}
