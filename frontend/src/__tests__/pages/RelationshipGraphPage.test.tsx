import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RelationshipGraphPage } from '@/pages/RelationshipGraphPage';

const mockGetFrogGraph = jest.fn();

jest.mock('@/features/relationship-graph/api', () => ({
  relationshipGraphFeatureApi: {
    getFrogGraph: (...args: unknown[]) => mockGetFrogGraph(...args),
  },
}));

const graphFixture = {
  frogId: 901,
  scopeAppId: 'int_rel_main',
  generatedAt: '2026-03-24T01:00:00.000Z',
  summary: {
    totalEdges: 2,
    totalSignalCount: 5,
    totalScore: 14,
  },
  nodes: [
    {
      frogId: 901,
      role: 'ROOT' as const,
      rank: 0,
      score: 14,
      signalCount: 5,
      lastOccurredAt: '2026-03-24T01:00:00.000Z',
    },
    {
      frogId: 902,
      role: 'PEER' as const,
      rank: 1,
      score: 9,
      signalCount: 3,
      lastOccurredAt: '2026-03-24T00:59:00.000Z',
    },
  ],
  edges: [
    {
      id: 'reg_001',
      frogId: 901,
      peerFrogId: 902,
      sourceFrogId: 901,
      targetFrogId: 902,
      score: 9,
      signalCount: 3,
      strength: 'HIGH' as const,
      firstOccurredAt: '2026-03-24T00:00:00.000Z',
      lastOccurredAt: '2026-03-24T00:59:00.000Z',
      signals: {
        journey: 2,
        rescue: 1,
        witness: 0,
        contribution: 0,
      },
      anchor: {
        id: 'rea_001',
        status: 'ANCHORED' as const,
        replayCount: 0,
        lastError: null,
        anchoredAt: '2026-03-24T01:00:00.000Z',
        onchain: {
          required: false,
          enabled: true,
          anchored: true,
          anchorId: 'orea_001',
          chainId: 7000,
          txHash: '0xabc123',
          blockNumber: '9100001',
        },
      },
    },
    {
      id: 'reg_002',
      frogId: 901,
      peerFrogId: 903,
      sourceFrogId: 901,
      targetFrogId: 903,
      score: 5,
      signalCount: 2,
      strength: 'MEDIUM' as const,
      firstOccurredAt: '2026-03-24T00:10:00.000Z',
      lastOccurredAt: '2026-03-24T00:40:00.000Z',
      signals: {
        journey: 1,
        rescue: 0,
        witness: 1,
        contribution: 0,
      },
      anchor: null,
    },
  ],
  snapshot: {
    id: 'rgs_001',
    scopeAppId: 'int_rel_main',
    frogId: 901,
    version: 2,
    computedAt: '2026-03-24T01:00:00.000Z',
    totalEdges: 2,
    totalScore: 14,
    strongestPeerFrogId: 902,
    strongestScore: 9,
    digest: 'abcdef0123456789',
  },
};

describe('RelationshipGraphPage', () => {
  beforeEach(() => {
    mockGetFrogGraph.mockReset();
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_BETA__ = undefined;
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA__ = undefined;
    window.localStorage.clear();
  });

  const renderPage = (initialEntry = '/relationship-graph') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/relationship-graph" element={<RelationshipGraphPage />} />
          <Route path="/relationship-graph/:frogId" element={<RelationshipGraphPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows beta gate when relationship graph alpha flag is disabled', () => {
    renderPage();
    expect(screen.getByText('Relationship Graph 正在灰度')).toBeInTheDocument();
  });

  it('fails closed when integration key is missing', () => {
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_BETA__ = true;
    renderPage();

    expect(
      screen.getByText('Integration API key missing. Graph queries are fail-closed until key is set.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Graph' })).toBeDisabled();
  });

  it('loads graph card and detail view', async () => {
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_BETA__ = true;
    mockGetFrogGraph.mockResolvedValue(graphFixture);
    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.clear(screen.getByTestId('relationship-graph-frog-id'));
    await userEvent.type(screen.getByTestId('relationship-graph-frog-id'), '901');
    await userEvent.click(screen.getByRole('button', { name: 'Load Graph' }));

    await waitFor(() => {
      expect(mockGetFrogGraph).toHaveBeenCalledWith('901', { limit: 20 }, 'test-key');
    });

    expect(await screen.findByText('Graph loaded for frog 901.')).toBeInTheDocument();
    expect(screen.getByText('Relationship Graph Observatory')).toBeInTheDocument();
    expect(screen.getByText('int_rel_main')).toBeInTheDocument();
    expect(screen.getByText('abcdef0123456789')).toBeInTheDocument();
    expect(screen.getByText('Detail (Read-only)')).toBeInTheDocument();
    expect(screen.getAllByText('902').length).toBeGreaterThan(0);
  });

  it('shows anchor status when anchor beta gate is enabled', async () => {
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_BETA__ = true;
    (window as any).__ZFROG_V3_RELATIONSHIP_GRAPH_ANCHOR_BETA__ = true;
    mockGetFrogGraph.mockResolvedValue(graphFixture);
    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.clear(screen.getByTestId('relationship-graph-frog-id'));
    await userEvent.type(screen.getByTestId('relationship-graph-frog-id'), '901');
    await userEvent.click(screen.getByRole('button', { name: 'Load Graph' }));

    await waitFor(() => {
      expect(mockGetFrogGraph).toHaveBeenCalled();
    });

    expect(await screen.findByText('Anchor Status')).toBeInTheDocument();
    expect(screen.getAllByText('Anchored').length).toBeGreaterThan(0);
  });
});
