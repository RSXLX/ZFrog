import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  journeyFeatureApi,
} from '../features/journey/api';
import type {
  V3JourneyCreatePayload,
  V3JourneySettleStepPayload,
  V3JourneyViewerReadModel,
} from '../../../packages/shared/src';
import { FeatureGateState } from '../components/common/FeatureGateState';
import {
  JourneyChoiceCard,
  JourneyCreateForm,
  JourneyTimeline,
} from '../features/journey/components';
import {
  getJourneyIntegrationApiKeySeed,
  isJourneyBetaEnabled,
} from '../features/journey/runtime';

const JOURNEY_KEY_STORAGE = 'zfrog.v3.integrationApiKey';

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Journey request failed.';
};

export function JourneyPage() {
  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [journeyIdInput, setJourneyIdInput] = useState('');
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<V3JourneyViewerReadModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [creatingJourney, setCreatingJourney] = useState(false);
  const [resolvingStep, setResolvingStep] = useState(false);

  const betaEnabled = useMemo(() => isJourneyBetaEnabled(), []);
  const normalizedApiKey = integrationApiKey.trim();
  const hasApiKey = normalizedApiKey.length > 0;
  const writesInFlight = creatingJourney || resolvingStep;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = window.localStorage.getItem(JOURNEY_KEY_STORAGE);
    const seed = (fromStorage && fromStorage.trim()) || getJourneyIntegrationApiKeySeed() || '';
    if (seed) {
      setIntegrationApiKey(seed);
    }
  }, []);

  const persistApiKey = useCallback(
    (value: string) => {
      if (typeof window === 'undefined') {
        return;
      }
      if (value.trim()) {
        window.localStorage.setItem(JOURNEY_KEY_STORAGE, value.trim());
      } else {
        window.localStorage.removeItem(JOURNEY_KEY_STORAGE);
      }
    },
    []
  );

  const refreshViewer = useCallback(
    async (journeyId: string, apiKey?: string) => {
      const effectiveKey = (apiKey || normalizedApiKey).trim();
      if (!effectiveKey) {
        throw new Error('Integration API key is required before loading journey viewer.');
      }
      const normalizedJourneyId = journeyId.trim();
      if (!normalizedJourneyId) {
        throw new Error('Journey ID is required.');
      }

      const nextViewer = await journeyFeatureApi.getViewer(normalizedJourneyId, effectiveKey);
      setViewer(nextViewer);
      setActiveJourneyId(nextViewer.id);
      setJourneyIdInput(nextViewer.id);
      return nextViewer;
    },
    [normalizedApiKey]
  );

  const handleLoadJourney = useCallback(async () => {
    if (!hasApiKey) {
      setErrorMessage('Integration API key is required.');
      return;
    }

    if (!journeyIdInput.trim()) {
      setErrorMessage('Input a journey ID to load viewer.');
      return;
    }

    try {
      setErrorMessage(null);
      setLoadingViewer(true);
      await refreshViewer(journeyIdInput);
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setLoadingViewer(false);
    }
  }, [hasApiKey, journeyIdInput, refreshViewer]);

  const handleCreateJourney = useCallback(
    async (payload: V3JourneyCreatePayload) => {
      if (!hasApiKey) {
        throw new Error('Integration API key is required.');
      }

      setCreatingJourney(true);
      setErrorMessage(null);
      try {
        const createdJourney = await journeyFeatureApi.createJourney(payload, normalizedApiKey);
        await refreshViewer(createdJourney.id, normalizedApiKey);
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setErrorMessage(normalized);
        throw new Error(normalized);
      } finally {
        setCreatingJourney(false);
      }
    },
    [hasApiKey, normalizedApiKey, refreshViewer]
  );

  const handleAdvance = useCallback(
    async (stepId: string, reason?: string) => {
      if (!hasApiKey || !activeJourneyId) {
        throw new Error('Load a journey with integration key before chapter actions.');
      }

      setResolvingStep(true);
      setErrorMessage(null);
      try {
        await journeyFeatureApi.advanceStep(
          activeJourneyId,
          stepId,
          reason ? { reason } : undefined,
          normalizedApiKey
        );
        await refreshViewer(activeJourneyId, normalizedApiKey);
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setErrorMessage(normalized);
        throw new Error(normalized);
      } finally {
        setResolvingStep(false);
      }
    },
    [activeJourneyId, hasApiKey, normalizedApiKey, refreshViewer]
  );

  const handleSettle = useCallback(
    async (
      stepId: string,
      result: V3JourneySettleStepPayload['result'],
      reason?: string
    ) => {
      if (!hasApiKey || !activeJourneyId) {
        throw new Error('Load a journey with integration key before chapter actions.');
      }

      setResolvingStep(true);
      setErrorMessage(null);
      try {
        await journeyFeatureApi.settleStep(
          activeJourneyId,
          stepId,
          {
            result,
            ...(reason ? { reason } : {}),
          },
          normalizedApiKey
        );
        await refreshViewer(activeJourneyId, normalizedApiKey);
      } catch (error) {
        const normalized = normalizeErrorMessage(error);
        setErrorMessage(normalized);
        throw new Error(normalized);
      } finally {
        setResolvingStep(false);
      }
    },
    [activeJourneyId, hasApiKey, normalizedApiKey, refreshViewer]
  );

  if (!betaEnabled) {
    return (
      <FeatureGateState
        emoji="🧭"
        title="Journey Map 正在灰度"
        description="V3 Journey Alpha is behind beta flag. Enable beta flag to access this page."
        actionLabel="返回首页"
        actionTo="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-emerald-50 to-white p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">V3 Journey Map Alpha</h1>
          <p className="mt-2 text-sm text-slate-600">
            Security-first flow: beta gated entry, integration key required, write actions are in-flight locked.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[2fr,1fr]">
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
              <span className="mb-1 block text-sm font-medium text-slate-700">Load Journey ID</span>
              <div className="flex gap-2">
                <input
                  value={journeyIdInput}
                  onChange={(event) => setJourneyIdInput(event.target.value)}
                  placeholder="jrn_xxx"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => void handleLoadJourney()}
                  disabled={!hasApiKey || loadingViewer}
                  className="whitespace-nowrap rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingViewer ? 'Loading...' : 'Load'}
                </button>
              </div>
            </label>
          </div>

          {!hasApiKey && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Integration API key missing. Create/load/actions are fail-closed until key is set.
            </p>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <JourneyCreateForm
            disabled={!hasApiKey}
            submitting={creatingJourney}
            onSubmit={handleCreateJourney}
          />
          <JourneyChoiceCard
            viewer={viewer}
            disabled={!hasApiKey || !activeJourneyId}
            submitting={writesInFlight}
            onAdvance={handleAdvance}
            onSettle={handleSettle}
          />
        </div>

        <JourneyTimeline
          viewer={viewer}
          loading={loadingViewer}
          errorMessage={errorMessage}
          onRefresh={
            activeJourneyId && hasApiKey
              ? () => {
                  setLoadingViewer(true);
                  void refreshViewer(activeJourneyId)
                    .catch((error) => setErrorMessage(normalizeErrorMessage(error)))
                    .finally(() => setLoadingViewer(false));
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default JourneyPage;
