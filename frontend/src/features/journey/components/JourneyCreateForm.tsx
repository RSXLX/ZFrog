import { FormEvent, useMemo, useState } from 'react';
import type { V3JourneyCreatePayload, V3JourneyStepInput } from '../../../../../packages/shared/src';

const WALLET_PATTERN = /^0x[a-f0-9]{40}$/i;

interface JourneyCreateFormProps {
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (payload: V3JourneyCreatePayload) => Promise<void>;
}

const parseStepInputs = (rawValue: string): V3JourneyStepInput[] => {
  return rawValue
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((title, index, rows) => ({
      title,
      riskLevel: index === 0 || index === rows.length - 1 ? 'LOW' : 'MEDIUM',
    }));
};

const parsePartyMembers = (rawValue: string): string[] => {
  return Array.from(
    new Set(
      rawValue
        .split(/[\n,\s]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
};

export function JourneyCreateForm({
  disabled = false,
  submitting = false,
  onSubmit,
}: JourneyCreateFormProps) {
  const [title, setTitle] = useState('');
  const [narrativeSeed, setNarrativeSeed] = useState('');
  const [partyMembers, setPartyMembers] = useState('');
  const [chapterTitles, setChapterTitles] = useState('Launch Preparation\nMidpoint Challenge\nSafe Return');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLocked = disabled || submitting;
  const submitLabel = useMemo(() => (submitting ? 'Creating...' : 'Create Journey'), [submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLocked) {
      return;
    }

    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setErrorMessage('Journey title is required.');
      return;
    }

    const parsedMembers = parsePartyMembers(partyMembers);
    const invalidWallet = parsedMembers.find((wallet) => !WALLET_PATTERN.test(wallet));
    if (invalidWallet) {
      setErrorMessage(`Invalid wallet address: ${invalidWallet}`);
      return;
    }

    const parsedSteps = parseStepInputs(chapterTitles);
    const payload: V3JourneyCreatePayload = {
      title: normalizedTitle,
      ...(narrativeSeed.trim() ? { narrativeSeed: narrativeSeed.trim() } : {}),
      ...(parsedMembers.length > 0 ? { partyMembers: parsedMembers } : {}),
      ...(parsedSteps.length > 0 ? { steps: parsedSteps } : {}),
    };

    try {
      setErrorMessage(null);
      await onSubmit(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create journey.');
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Create Story Journey</h2>
        <p className="mt-1 text-sm text-slate-600">
          All writes are fail-closed when integration key is missing.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Journey Title</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Starlight Rescue Night"
            maxLength={120}
            disabled={isLocked}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Narrative Seed (Optional)</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            value={narrativeSeed}
            onChange={(event) => setNarrativeSeed(event.target.value)}
            placeholder="A meteor shower opens unstable portals over the pond..."
            maxLength={500}
            disabled={isLocked}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Party Members (Optional, split by comma/newline)
          </span>
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            value={partyMembers}
            onChange={(event) => setPartyMembers(event.target.value)}
            placeholder="0xabc... , 0xdef..."
            disabled={isLocked}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Chapter Titles (One per line)
          </span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
            value={chapterTitles}
            onChange={(event) => setChapterTitles(event.target.value)}
            disabled={isLocked}
          />
        </label>

        {errorMessage && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isLocked}
          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitLabel}
        </button>
      </form>
    </section>
  );
}
