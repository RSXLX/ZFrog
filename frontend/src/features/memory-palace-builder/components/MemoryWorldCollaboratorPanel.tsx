import { useMemo, useState } from 'react';
import type {
  V3MemoryPalaceAddCollaboratorPayload,
  V3MemoryPalaceWorldReadModel,
} from '../../../../../packages/shared/src';

interface MemoryWorldCollaboratorPanelProps {
  world: V3MemoryPalaceWorldReadModel | null;
  disabled?: boolean;
  ownerEntryEnabled?: boolean;
  submitting?: boolean;
  onAddCollaborator: (payload: V3MemoryPalaceAddCollaboratorPayload) => Promise<void>;
}

export function MemoryWorldCollaboratorPanel({
  world,
  disabled = false,
  ownerEntryEnabled = false,
  submitting = false,
  onAddCollaborator,
}: MemoryWorldCollaboratorPanelProps) {
  const [appId, setAppId] = useState('');
  const [role, setRole] = useState<'CONTRIBUTOR' | 'EDITOR'>('CONTRIBUTOR');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManage = useMemo(() => {
    return Boolean(world) && !disabled && ownerEntryEnabled && !submitting && appId.trim().length > 0;
  }, [appId, disabled, ownerEntryEnabled, submitting, world]);

  const handleAddCollaborator = async () => {
    if (!canManage) {
      return;
    }

    try {
      setErrorMessage(null);
      await onAddCollaborator({
        appId: appId.trim(),
        role,
      });
      setAppId('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upsert collaborator.');
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Collaborators</h3>
      <p className="mt-1 text-sm text-slate-600">
        Owner-only alpha control for collaborator onboarding during beta rollout.
      </p>

      {!ownerEntryEnabled ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Owner-only entry is required before collaborator management is available.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[2fr,1fr,auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Collaborator App ID
          </span>
          <input
            data-testid="memory-world-collaborator-appid"
            value={appId}
            onChange={(event) => setAppId(event.target.value)}
            placeholder="int_002"
            disabled={disabled || submitting || !ownerEntryEnabled}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Role
          </span>
          <select
            data-testid="memory-world-collaborator-role"
            value={role}
            onChange={(event) => setRole(event.target.value as 'CONTRIBUTOR' | 'EDITOR')}
            disabled={disabled || submitting || !ownerEntryEnabled}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          >
            <option value="CONTRIBUTOR">CONTRIBUTOR</option>
            <option value="EDITOR">EDITOR</option>
          </select>
        </label>

        <div className="self-end">
          <button
            type="button"
            data-testid="memory-world-add-collaborator"
            onClick={() => void handleAddCollaborator()}
            disabled={!canManage}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Add Collaborator'}
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {(world?.collaborators || []).map((collaborator) => (
          <li
            key={`${collaborator.appId}:${collaborator.role}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-600">{collaborator.appId}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                {collaborator.role}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {collaborator.addedByActor} · {new Date(collaborator.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
