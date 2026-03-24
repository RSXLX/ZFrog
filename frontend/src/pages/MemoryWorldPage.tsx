import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  V3MemoryPalaceAddCollaboratorPayload,
  V3MemoryPalaceAddContributionPayload,
  V3MemoryPalaceTemplateReadModel,
  V3MemoryPalaceCreateWorldPayload,
  V3MemoryPalaceWorldReadModel,
} from '../../../packages/shared/src';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { memoryWorldFeatureApi } from '../features/memory-palace-builder/api';
import {
  MemoryWorldCollaboratorPanel,
  MemoryWorldContributionComposer,
  MemoryWorldContributionFeed,
  MemoryWorldOverview,
} from '../features/memory-palace-builder/components';
import {
  getMemoryWorldIntegrationApiKeySeed,
  isMemoryWorldBetaEnabled,
  isMemoryWorldOwnerEntryEnabled,
} from '../features/memory-palace-builder/runtime';
import { resolveMemoryWorldTheme } from '../features/memory-palace/themes';
import { useParams } from 'react-router-dom';

const MEMORY_WORLD_KEY_STORAGE = 'zfrog.v3.integrationApiKey';

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Memory world request failed.';
};

export function MemoryWorldPage() {
  const { worldId: worldIdFromRoute } = useParams<{ worldId?: string }>();
  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [worldIdInput, setWorldIdInput] = useState('');
  const [journeyIdInput, setJourneyIdInput] = useState('');
  const [worldTitleInput, setWorldTitleInput] = useState('');
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState('');
  const [world, setWorld] = useState<V3MemoryPalaceWorldReadModel | null>(null);
  const [templates, setTemplates] = useState<V3MemoryPalaceTemplateReadModel[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loadingWorld, setLoadingWorld] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creatingWorld, setCreatingWorld] = useState(false);
  const [submittingContribution, setSubmittingContribution] = useState(false);
  const [managingCollaborator, setManagingCollaborator] = useState(false);

  const betaEnabled = useMemo(() => isMemoryWorldBetaEnabled(), []);
  const ownerEntryEnabled = useMemo(() => isMemoryWorldOwnerEntryEnabled(), []);
  const normalizedApiKey = integrationApiKey.trim();
  const hasApiKey = normalizedApiKey.length > 0;
  const writeInFlight = creatingWorld || submittingContribution || managingCollaborator;
  const resolvedTheme = useMemo(
    () =>
      resolveMemoryWorldTheme({
        world,
        templates,
      }),
    [templates, world]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = window.localStorage.getItem(MEMORY_WORLD_KEY_STORAGE);
    const seed = (fromStorage && fromStorage.trim()) || getMemoryWorldIntegrationApiKeySeed() || '';
    if (seed) {
      setIntegrationApiKey(seed);
    }
  }, []);

  useEffect(() => {
    if (worldIdFromRoute && worldIdFromRoute.trim()) {
      setWorldIdInput(worldIdFromRoute.trim());
    }
  }, [worldIdFromRoute]);

  const persistApiKey = useCallback((value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (value.trim()) {
      window.localStorage.setItem(MEMORY_WORLD_KEY_STORAGE, value.trim());
    } else {
      window.localStorage.removeItem(MEMORY_WORLD_KEY_STORAGE);
    }
  }, []);

  const refreshWorld = useCallback(
    async (worldId: string, apiKey?: string) => {
      const effectiveKey = (apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        throw new Error('Integration API key is required before loading memory world.');
      }

      const normalizedWorldId = worldId.trim();
      if (!normalizedWorldId) {
        throw new Error('Memory world ID is required.');
      }

      const nextWorld = await memoryWorldFeatureApi.getWorldById(normalizedWorldId, effectiveKey);
      setWorld(nextWorld);
      setWorldIdInput(nextWorld.id);
      return nextWorld;
    },
    [normalizedApiKey]
  );

  const refreshTemplates = useCallback(
    async (apiKey?: string) => {
      const effectiveKey = (apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        setTemplates([]);
        setSelectedTemplateSlug('');
        return [] as V3MemoryPalaceTemplateReadModel[];
      }

      setLoadingTemplates(true);
      try {
        const result = await memoryWorldFeatureApi.listTemplates(effectiveKey);
        setTemplates(result.items);
        setSelectedTemplateSlug((current) =>
          current && result.items.some((item) => item.slug === current) ? current : ''
        );
        return result.items;
      } finally {
        setLoadingTemplates(false);
      }
    },
    [normalizedApiKey]
  );

  useEffect(() => {
    if (!hasApiKey) {
      setTemplates([]);
      setSelectedTemplateSlug('');
      return;
    }

    void refreshTemplates().catch((error) => {
      setRequestError(normalizeErrorMessage(error));
    });
  }, [hasApiKey, refreshTemplates]);

  const handleLoadWorld = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    if (!worldIdInput.trim()) {
      setRequestError('Input a memory world ID to load.');
      return;
    }

    try {
      setRequestError(null);
      setLoadingWorld(true);
      await refreshTemplates();
      await refreshWorld(worldIdInput);
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setLoadingWorld(false);
    }
  }, [hasApiKey, refreshTemplates, refreshWorld, worldIdInput]);

  const handleCreateWorld = useCallback(async () => {
    if (!hasApiKey) {
      setRequestError('Integration API key is required.');
      return;
    }

    if (!journeyIdInput.trim()) {
      setRequestError('Journey ID is required before creating memory world.');
      return;
    }

    const payload: V3MemoryPalaceCreateWorldPayload = {
      journeyId: journeyIdInput.trim(),
      ...(worldTitleInput.trim() ? { title: worldTitleInput.trim() } : {}),
      ...(selectedTemplateSlug.trim() ? { templateSlug: selectedTemplateSlug.trim() } : {}),
    };

    try {
      setRequestError(null);
      await refreshTemplates();
      setCreatingWorld(true);
      const nextWorld = await memoryWorldFeatureApi.createWorld(payload, normalizedApiKey);
      setWorld(nextWorld);
      setWorldIdInput(nextWorld.id);
    } catch (error) {
      setRequestError(normalizeErrorMessage(error));
    } finally {
      setCreatingWorld(false);
    }
  }, [hasApiKey, journeyIdInput, normalizedApiKey, refreshTemplates, selectedTemplateSlug, worldTitleInput]);

  const handleContributionSubmit = useCallback(
    async (payload: V3MemoryPalaceAddContributionPayload) => {
      if (!hasApiKey || !world) {
        throw new Error('Load memory world with integration key before adding contributions.');
      }

      setSubmittingContribution(true);
      setRequestError(null);
      try {
        const nextWorld = await memoryWorldFeatureApi.addContribution(
          world.id,
          payload,
          normalizedApiKey
        );
        setWorld(nextWorld);
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setRequestError(normalized);
        throw new Error(normalized);
      } finally {
        setSubmittingContribution(false);
      }
    },
    [hasApiKey, normalizedApiKey, world]
  );

  const handleCollaboratorAdd = useCallback(
    async (payload: V3MemoryPalaceAddCollaboratorPayload) => {
      if (!hasApiKey || !world) {
        throw new Error('Load memory world with integration key before managing collaborators.');
      }

      setManagingCollaborator(true);
      setRequestError(null);
      try {
        const nextWorld = await memoryWorldFeatureApi.addCollaborator(
          world.id,
          payload,
          normalizedApiKey
        );
        setWorld(nextWorld);
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setRequestError(normalized);
        throw new Error(normalized);
      } finally {
        setManagingCollaborator(false);
      }
    },
    [hasApiKey, normalizedApiKey, world]
  );

  if (!betaEnabled) {
    return (
      <FeatureGateState
        emoji="🏛️"
        title="Memory World Builder 正在灰度"
        description="V3 Memory World Builder is behind beta flag. Enable beta flag to access this page."
        actionLabel="返回首页"
        actionTo="/"
      />
    );
  }

  if (!ownerEntryEnabled) {
    return (
      <FeatureGateState
        emoji="🛡️"
        title="Memory World Builder Owner Alpha"
        description="This alpha entry is owner-only and can be hidden independently for rollback."
        actionLabel="返回首页"
        actionTo="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-100 via-emerald-50 to-white p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">V3 Memory World Builder Alpha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Owner-only beta entry with fail-closed integration key guardrails and collaborative memory actions.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Integration API Key</span>
              <input
                type="password"
                value={integrationApiKey}
                onChange={(event) => {
                  setIntegrationApiKey(event.target.value);
                  persistApiKey(event.target.value);
                }}
                placeholder="Paste V3 integration key"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Load Memory World</span>
              <div className="flex gap-2">
                <input
                  value={worldIdInput}
                  onChange={(event) => setWorldIdInput(event.target.value)}
                  placeholder="mpw_xxx"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => void handleLoadWorld()}
                  disabled={!hasApiKey || loadingWorld || writeInFlight}
                  className="whitespace-nowrap rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingWorld ? 'Loading...' : 'Load World'}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Journey ID
              </span>
              <input
                value={journeyIdInput}
                onChange={(event) => setJourneyIdInput(event.target.value)}
                placeholder="jrn_story_001"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                World Title (Optional)
              </span>
              <input
                value={worldTitleInput}
                onChange={(event) => setWorldTitleInput(event.target.value)}
                placeholder="Moonlake Witness Hall"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Theme Template
              </span>
              <select
                value={selectedTemplateSlug}
                onChange={(event) => setSelectedTemplateSlug(event.target.value)}
                disabled={!hasApiKey || loadingTemplates || writeInFlight}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.slug}>
                    {template.name} ({template.slug})
                  </option>
                ))}
              </select>
            </label>

            <div className="self-end">
              <button
                type="button"
                onClick={() => void handleCreateWorld()}
                disabled={!hasApiKey || creatingWorld || writeInFlight}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {creatingWorld ? 'Creating...' : 'Create World'}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Theme templates come from reviewed and feature-enabled packs only.
            {loadingTemplates ? ' Refreshing template catalog...' : ''}
          </p>

          {!hasApiKey ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Integration API key missing. Load/create/contribution actions are fail-closed until key is set.
            </p>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr,1fr]">
          <MemoryWorldOverview
            world={world}
            theme={resolvedTheme}
            loading={loadingWorld}
            errorMessage={requestError}
            onRefresh={
              hasApiKey && world
                ? () => {
                    setLoadingWorld(true);
                    void refreshWorld(world.id)
                      .catch((error) => setRequestError(normalizeErrorMessage(error)))
                      .finally(() => setLoadingWorld(false));
                  }
                : undefined
            }
          />

          <MemoryWorldContributionComposer
            disabled={!hasApiKey || !world}
            submitting={submittingContribution}
            onSubmit={handleContributionSubmit}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr,1.2fr]">
          <MemoryWorldCollaboratorPanel
            world={world}
            disabled={!hasApiKey || !world}
            ownerEntryEnabled={ownerEntryEnabled}
            submitting={managingCollaborator}
            onAddCollaborator={handleCollaboratorAdd}
          />

          <MemoryWorldContributionFeed world={world} />
        </div>
      </div>
    </div>
  );
}

export default MemoryWorldPage;
