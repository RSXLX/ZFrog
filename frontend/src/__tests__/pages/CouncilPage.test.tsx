import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CouncilPage } from '@/pages/CouncilPage';

const mockListSuggestions = jest.fn();
const mockGetSuggestionById = jest.fn();
const mockRespondSuggestion = jest.fn();

jest.mock('@/features/council/api', () => ({
  councilFeatureApi: {
    listSuggestions: (...args: unknown[]) => mockListSuggestions(...args),
    getSuggestionById: (...args: unknown[]) => mockGetSuggestionById(...args),
    respondSuggestion: (...args: unknown[]) => mockRespondSuggestion(...args),
  },
}));

const baseSuggestion = {
  id: 'csg_001',
  runId: 'crn_001',
  title: 'Council Plan: Totem Repair Sprint',
  focus: 'Collect 3 witness notes and repair family totem this week.',
  objective: 'Raise shared trust score.',
  rationale: 'Journey incident logs show repair chance window is active for 48 hours.',
  risk: {
    level: 'MEDIUM' as const,
    reason: 'Requires at least two active participants.',
  },
  dataSources: [
    {
      source: 'journey_incidents',
      referenceId: 'evt_001',
      freshness: '5m',
    },
  ],
  suggestedActions: [
    {
      id: 'act_001',
      label: 'Start Rescue Shift',
      detail: 'Assign one frog for rescue and one for witness.',
    },
  ],
  status: 'OPEN' as const,
  trace: {
    traceId: 'trace_001',
    promptKitVersion: 'v3-council-suggest-v1',
    model: 'heuristic-council-planner',
    fingerprint: 'abc123def4567890',
  },
  createdAt: '2026-03-23T00:00:00.000Z',
  updatedAt: '2026-03-23T00:00:00.000Z',
  response: {
    decision: null,
    note: null,
    respondedAt: null,
    respondedByActor: null,
  },
  audit: {
    createdByAppId: 'app_alpha',
    createdByKeyId: 'key_alpha',
    createdByActor: 'app_alpha:key_alpha',
    requestId: null,
    updatedByActor: 'app_alpha:key_alpha',
  },
};

const acceptedSuggestion = {
  ...baseSuggestion,
  status: 'ACCEPTED' as const,
  updatedAt: '2026-03-23T01:00:00.000Z',
  response: {
    decision: 'ACCEPT' as const,
    note: 'Proceed now',
    respondedAt: '2026-03-23T01:00:00.000Z',
    respondedByActor: 'app_alpha:key_alpha',
  },
};

describe('CouncilPage', () => {
  beforeEach(() => {
    mockListSuggestions.mockReset();
    mockGetSuggestionById.mockReset();
    mockRespondSuggestion.mockReset();
    (window as any).__ZFROG_V3_COUNCIL_BETA__ = undefined;
    window.localStorage.clear();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/council']}>
        <Routes>
          <Route path="/council" element={<CouncilPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows beta gate when council alpha flag is disabled', () => {
    renderPage();
    expect(screen.getByText('Council Inbox 正在灰度')).toBeInTheDocument();
  });

  it('fails closed when integration key is missing', () => {
    (window as any).__ZFROG_V3_COUNCIL_BETA__ = true;
    renderPage();

    expect(
      screen.getByText(
        'Integration API key missing. Inbox/detail/respond operations are fail-closed until key is set.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Inbox' })).toBeDisabled();
  });

  it('loads council inbox and opens suggestion detail', async () => {
    (window as any).__ZFROG_V3_COUNCIL_BETA__ = true;
    mockListSuggestions.mockResolvedValue({
      total: 1,
      items: [baseSuggestion],
    });
    mockGetSuggestionById.mockResolvedValue(baseSuggestion);

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.click(screen.getByRole('button', { name: 'Load Inbox' }));

    await waitFor(() => {
      expect(mockListSuggestions).toHaveBeenCalledWith({ status: 'OPEN', limit: 20 }, 'test-key');
    });

    await userEvent.click(screen.getByTestId('council-inbox-item-csg_001'));

    await waitFor(() => {
      expect(mockGetSuggestionById).toHaveBeenCalledWith('csg_001', 'test-key');
    });

    expect(await screen.findByText(/Suggestion ID:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Defer' })).toBeInTheDocument();
  });

  it('responds council suggestion with accept decision', async () => {
    (window as any).__ZFROG_V3_COUNCIL_BETA__ = true;
    mockListSuggestions.mockResolvedValue({
      total: 1,
      items: [baseSuggestion],
    });
    mockGetSuggestionById.mockResolvedValue(baseSuggestion);
    mockRespondSuggestion.mockResolvedValue(acceptedSuggestion);

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.click(screen.getByRole('button', { name: 'Load Inbox' }));
    await waitFor(() => expect(mockListSuggestions).toHaveBeenCalled());

    await userEvent.click(screen.getByTestId('council-inbox-item-csg_001'));
    await waitFor(() => expect(mockGetSuggestionById).toHaveBeenCalled());

    await userEvent.type(screen.getByTestId('council-response-note'), 'Proceed now');
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(mockRespondSuggestion).toHaveBeenCalledWith(
        'csg_001',
        {
          decision: 'ACCEPT',
          note: 'Proceed now',
        },
        'test-key'
      );
    });

    expect(await screen.findByText('Status: ACCEPTED')).toBeInTheDocument();
    expect(screen.getByText(/Decision: ACCEPT/)).toBeInTheDocument();
  });
});
