import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  V3CouncilRespondSuggestionPayload,
  V3CouncilSuggestionReadModel,
} from '../../../packages/shared/src';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { councilFeatureApi } from '../features/council/api';
import {
  CouncilInboxList,
  CouncilSuggestionDetail,
  type CouncilSuggestionFilter,
} from '../features/council/components';
import {
  getCouncilIntegrationApiKeySeed,
  isCouncilBetaEnabled,
} from '../features/council/runtime';

const COUNCIL_KEY_STORAGE = 'zfrog.v3.integrationApiKey';
const COUNCIL_LIST_LIMIT = 20;

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Council request failed.';
};

export function CouncilPage() {
  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [statusFilter, setStatusFilter] = useState<CouncilSuggestionFilter>('OPEN');
  const [suggestions, setSuggestions] = useState<V3CouncilSuggestionReadModel[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<V3CouncilSuggestionReadModel | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const betaEnabled = useMemo(() => isCouncilBetaEnabled(), []);
  const normalizedApiKey = integrationApiKey.trim();
  const hasApiKey = normalizedApiKey.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = window.localStorage.getItem(COUNCIL_KEY_STORAGE);
    const seed = (fromStorage && fromStorage.trim()) || getCouncilIntegrationApiKeySeed() || '';
    if (seed) {
      setIntegrationApiKey(seed);
    }
  }, []);

  const persistApiKey = useCallback((value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (value.trim()) {
      window.localStorage.setItem(COUNCIL_KEY_STORAGE, value.trim());
    } else {
      window.localStorage.removeItem(COUNCIL_KEY_STORAGE);
    }
  }, []);

  const buildListQuery = useCallback((filter: CouncilSuggestionFilter) => {
    if (filter === 'ALL') {
      return { limit: COUNCIL_LIST_LIMIT };
    }
    return {
      status: filter,
      limit: COUNCIL_LIST_LIMIT,
    };
  }, []);

  const refreshInbox = useCallback(
    async (input?: { apiKey?: string; filter?: CouncilSuggestionFilter }) => {
      const effectiveKey = (input?.apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        throw new Error('Integration API key is required before loading council inbox.');
      }

      const effectiveFilter = input?.filter || statusFilter;
      const nextList = await councilFeatureApi.listSuggestions(
        buildListQuery(effectiveFilter),
        effectiveKey
      );
      setSuggestions(nextList.items);
      return nextList.items;
    },
    [buildListQuery, normalizedApiKey, statusFilter]
  );

  const handleLoadInbox = useCallback(async () => {
    if (!hasApiKey) {
      setListError('Integration API key is required.');
      return;
    }

    try {
      setListError(null);
      setListLoading(true);
      await refreshInbox();
    } catch (error) {
      setListError(normalizeErrorMessage(error));
    } finally {
      setListLoading(false);
    }
  }, [hasApiKey, refreshInbox]);

  const handleFilterChange = useCallback(
    async (nextFilter: CouncilSuggestionFilter) => {
      setStatusFilter(nextFilter);
      if (!hasApiKey) {
        setSuggestions([]);
        return;
      }
      try {
        setListError(null);
        setListLoading(true);
        await refreshInbox({ filter: nextFilter });
      } catch (error) {
        setListError(normalizeErrorMessage(error));
      } finally {
        setListLoading(false);
      }
    },
    [hasApiKey, refreshInbox]
  );

  const handleSelectSuggestion = useCallback(
    async (suggestionId: string) => {
      if (!hasApiKey) {
        setDetailError('Integration API key is required.');
        return;
      }

      try {
        setSelectedSuggestionId(suggestionId);
        setDetailError(null);
        setDetailLoading(true);
        const nextSuggestion = await councilFeatureApi.getSuggestionById(suggestionId, normalizedApiKey);
        setSelectedSuggestion(nextSuggestion);
      } catch (error) {
        setDetailError(normalizeErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [hasApiKey, normalizedApiKey]
  );

  const handleRespond = useCallback(
    async (
      decision: V3CouncilRespondSuggestionPayload['decision'],
      note?: string
    ) => {
      if (!hasApiKey || !selectedSuggestionId) {
        throw new Error('Load a council suggestion with integration key before response.');
      }

      setResponding(true);
      setDetailError(null);
      try {
        const updatedSuggestion = await councilFeatureApi.respondSuggestion(
          selectedSuggestionId,
          {
            decision,
            ...(note ? { note } : {}),
          },
          normalizedApiKey
        );

        setSelectedSuggestion(updatedSuggestion);
        setSuggestions((current) => {
          const next = current
            .map((item) => (item.id === updatedSuggestion.id ? updatedSuggestion : item))
            .filter((item) => statusFilter === 'ALL' || item.status === statusFilter);
          return next;
        });
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setDetailError(normalized);
        throw new Error(normalized);
      } finally {
        setResponding(false);
      }
    },
    [hasApiKey, normalizedApiKey, selectedSuggestionId, statusFilter]
  );

  if (!betaEnabled) {
    return (
      <FeatureGateState
        emoji="🐸"
        title="Council Inbox 正在灰度"
        description="V3 Council Inbox Alpha is behind beta flag. Enable beta flag to access this page."
        actionLabel="返回首页"
        actionTo="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-100 via-sky-50 to-white p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">V3 Council Inbox Alpha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Security-first flow: beta gated entry, integration key required, actionable responses are in-flight locked.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[2fr,auto]">
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

            <div className="self-end">
              <button
                type="button"
                data-testid="council-load-inbox"
                onClick={() => void handleLoadInbox()}
                disabled={!hasApiKey || listLoading}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {listLoading ? 'Loading...' : 'Load Inbox'}
              </button>
            </div>
          </div>

          {!hasApiKey && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Integration API key missing. Inbox/detail/respond operations are fail-closed until key is set.
            </p>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr,1.2fr]">
          <CouncilInboxList
            suggestions={suggestions}
            selectedSuggestionId={selectedSuggestionId}
            statusFilter={statusFilter}
            loading={listLoading}
            disabled={!hasApiKey}
            errorMessage={listError}
            onStatusFilterChange={(next) => void handleFilterChange(next)}
            onSelectSuggestion={(suggestionId) => void handleSelectSuggestion(suggestionId)}
            onRefresh={() => void handleLoadInbox()}
          />

          <CouncilSuggestionDetail
            suggestion={selectedSuggestion}
            loading={detailLoading}
            disabled={!hasApiKey}
            submitting={responding}
            errorMessage={detailError}
            onRespond={handleRespond}
          />
        </div>
      </div>
    </div>
  );
}

export default CouncilPage;
