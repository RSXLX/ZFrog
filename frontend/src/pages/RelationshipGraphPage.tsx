import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { V3RelationshipGraphReadModel } from '../../../packages/shared/src';
import { FeatureGateState } from '../components/common/FeatureGateState';
import { relationshipGraphFeatureApi } from '../features/relationship-graph/api';
import {
  isRelationshipGraphAnchorBetaEnabled,
  getRelationshipGraphIntegrationApiKeySeed,
  isRelationshipGraphBetaEnabled,
} from '../features/relationship-graph/runtime';

const RELATIONSHIP_GRAPH_KEY_STORAGE = 'zfrog.v3.integrationApiKey';
const FROG_ID_PATTERN = /^[1-9][0-9]*$/;

const normalizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Relationship graph request failed.';
};

const anchorStatusLabelMap: Record<'PENDING' | 'ANCHORED' | 'FAILED', string> = {
  PENDING: 'Pending',
  ANCHORED: 'Anchored',
  FAILED: 'Failed',
};

const anchorStatusStyleMap: Record<'PENDING' | 'ANCHORED' | 'FAILED', string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  ANCHORED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function RelationshipGraphPage() {
  const navigate = useNavigate();
  const params = useParams<{ frogId?: string }>();

  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [frogIdInput, setFrogIdInput] = useState(params.frogId || '');
  const [limitInput, setLimitInput] = useState('20');
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graph, setGraph] = useState<V3RelationshipGraphReadModel | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const betaEnabled = useMemo(() => isRelationshipGraphBetaEnabled(), []);
  const anchorViewEnabled = useMemo(() => isRelationshipGraphAnchorBetaEnabled(), []);
  const normalizedApiKey = integrationApiKey.trim();
  const hasApiKey = normalizedApiKey.length > 0;
  const normalizedFrogId = frogIdInput.trim();
  const hasValidFrogId = FROG_ID_PATTERN.test(normalizedFrogId);
  const parsedLimit = useMemo(() => {
    const parsed = Number(limitInput);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.min(parsed, 100);
  }, [limitInput]);

  const selectedEdge = useMemo(() => {
    if (!graph || !selectedEdgeId) {
      return graph?.edges[0] || null;
    }
    return graph.edges.find((edge) => edge.id === selectedEdgeId) || graph.edges[0] || null;
  }, [graph, selectedEdgeId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = window.localStorage.getItem(RELATIONSHIP_GRAPH_KEY_STORAGE);
    const seed = (fromStorage && fromStorage.trim()) || getRelationshipGraphIntegrationApiKeySeed() || '';
    if (seed) {
      setIntegrationApiKey(seed);
    }
  }, []);

  useEffect(() => {
    if (params.frogId) {
      setFrogIdInput(params.frogId);
    }
  }, [params.frogId]);

  const persistApiKey = useCallback((value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (value.trim()) {
      window.localStorage.setItem(RELATIONSHIP_GRAPH_KEY_STORAGE, value.trim());
    } else {
      window.localStorage.removeItem(RELATIONSHIP_GRAPH_KEY_STORAGE);
    }
  }, []);

  const loadGraph = useCallback(
    async (frogId: string) => {
      if (!hasApiKey) {
        setRequestError('Integration API key is required.');
        return;
      }

      if (!FROG_ID_PATTERN.test(frogId)) {
        setRequestError('frogId must be a positive integer.');
        return;
      }

      setLoadingGraph(true);
      setRequestError(null);
      setRequestSuccess(null);
      try {
        const result = await relationshipGraphFeatureApi.getFrogGraph(
          frogId,
          parsedLimit ? { limit: parsedLimit } : undefined,
          normalizedApiKey
        );
        setGraph(result);
        setSelectedEdgeId(result.edges[0]?.id || null);
        setRequestSuccess(`Graph loaded for frog ${result.frogId}.`);
        navigate(`/relationship-graph/${result.frogId}`, { replace: true });
      } catch (error) {
        setGraph(null);
        setSelectedEdgeId(null);
        setRequestError(normalizeErrorMessage(error));
      } finally {
        setLoadingGraph(false);
      }
    },
    [hasApiKey, navigate, normalizedApiKey, parsedLimit]
  );

  useEffect(() => {
    if (!betaEnabled || !hasApiKey || !params.frogId) {
      return;
    }
    if (!FROG_ID_PATTERN.test(params.frogId)) {
      return;
    }
    if (graph && graph.frogId === Number(params.frogId)) {
      return;
    }
    void loadGraph(params.frogId);
  }, [betaEnabled, graph, hasApiKey, loadGraph, params.frogId]);

  if (!betaEnabled) {
    return (
      <FeatureGateState
        emoji="🕸️"
        title="Relationship Graph 正在灰度"
        description="该观测页仅在 V3 beta 开关开启后可见，默认关闭以保证回滚安全。"
        actionLabel="返回首页"
        actionTo="/"
        secondaryLabel="前往 Journey"
        secondaryTo="/journeys"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-slate-900">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          V3-50 Read Only
        </p>
        <h1 className="mt-2 text-2xl font-bold">Relationship Graph Observatory</h1>
        <p className="mt-2 text-sm text-slate-600">
          只读观测页。查询依赖 integration API key 和 frogId，默认 fail-closed。
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Integration API Key
            <input
              value={integrationApiKey}
              onChange={(event) => {
                const next = event.target.value;
                setIntegrationApiKey(next);
                persistApiKey(next);
              }}
              placeholder="Paste V3 integration key"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Frog ID
            <input
              value={frogIdInput}
              onChange={(event) => setFrogIdInput(event.target.value)}
              placeholder="901"
              data-testid="relationship-graph-frog-id"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Edge Limit
            <input
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              type="number"
              min={1}
              max={100}
              data-testid="relationship-graph-limit"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-200 transition focus:ring"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              void loadGraph(normalizedFrogId);
            }}
            disabled={!hasApiKey || !hasValidFrogId || loadingGraph}
            className="h-10 self-end rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loadingGraph ? 'Loading...' : 'Load Graph'}
          </button>
        </div>

        {!hasApiKey ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Integration API key missing. Graph queries are fail-closed until key is set.
          </p>
        ) : null}
        {requestError ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {requestError}
          </p>
        ) : null}
        {requestSuccess ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {requestSuccess}
          </p>
        ) : null}
      </section>

      {graph ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scope</p>
              <p className="mt-2 text-lg font-semibold">{graph.scopeAppId}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Edges</p>
              <p className="mt-2 text-lg font-semibold">{graph.summary.totalEdges}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Signals</p>
              <p className="mt-2 text-lg font-semibold">{graph.summary.totalSignalCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Score</p>
              <p className="mt-2 text-lg font-semibold">{graph.summary.totalScore}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Snapshot</h2>
            <p className="mt-2 text-sm text-slate-600">
              digest: <span className="font-mono text-xs">{graph.snapshot.digest}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              strongest peer: {graph.snapshot.strongestPeerFrogId || '-'} / score:{' '}
              {graph.snapshot.strongestScore ?? '-'}
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Graph Card</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-3">Peer Frog</th>
                      <th className="py-2 pr-3">Strength</th>
                      <th className="py-2 pr-3">Score</th>
                      <th className="py-2 pr-3">Signals</th>
                      {anchorViewEnabled ? <th className="py-2 pr-3">Anchor</th> : null}
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.edges.map((edge) => (
                      <tr key={edge.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-medium">{edge.peerFrogId}</td>
                        <td className="py-2 pr-3">{edge.strength}</td>
                        <td className="py-2 pr-3">{edge.score}</td>
                        <td className="py-2 pr-3">{edge.signalCount}</td>
                        {anchorViewEnabled ? (
                          <td className="py-2 pr-3">
                            {edge.anchor ? (
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${anchorStatusStyleMap[edge.anchor.status]}`}
                              >
                                {anchorStatusLabelMap[edge.anchor.status]}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not Anchored</span>
                            )}
                          </td>
                        ) : null}
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            data-testid={`relationship-graph-edge-${edge.id}`}
                            onClick={() => setSelectedEdgeId(edge.id)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                          >
                            {selectedEdgeId === edge.id || (!selectedEdgeId && graph.edges[0]?.id === edge.id)
                              ? 'Selected'
                              : 'View Detail'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Detail (Read-only)</h2>
              {selectedEdge ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Peer Frog</dt>
                    <dd className="font-semibold">{selectedEdge.peerFrogId}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Score / Strength</dt>
                    <dd className="font-semibold">
                      {selectedEdge.score} / {selectedEdge.strength}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Journey / Rescue / Witness / Contribution</dt>
                    <dd className="font-semibold">
                      {selectedEdge.signals.journey} / {selectedEdge.signals.rescue} /{' '}
                      {selectedEdge.signals.witness} / {selectedEdge.signals.contribution}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">First -&gt; Last</dt>
                    <dd className="font-semibold">
                      {new Date(selectedEdge.firstOccurredAt).toLocaleString()} -&gt;{' '}
                      {new Date(selectedEdge.lastOccurredAt).toLocaleString()}
                    </dd>
                  </div>
                  {anchorViewEnabled ? (
                    <div>
                      <dt className="text-slate-500">Anchor Status</dt>
                      <dd className="font-semibold">
                        {selectedEdge.anchor
                          ? anchorStatusLabelMap[selectedEdge.anchor.status]
                          : 'Not Anchored'}
                      </dd>
                    </div>
                  ) : null}
                  {anchorViewEnabled && selectedEdge.anchor ? (
                    <div>
                      <dt className="text-slate-500">Anchor TX / Chain</dt>
                      <dd className="font-semibold">
                        {selectedEdge.anchor.onchain.txHash || '-'} /{' '}
                        {selectedEdge.anchor.onchain.chainId || '-'}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No edge selected.</p>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
