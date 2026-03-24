import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JourneyPage } from '@/pages/JourneyPage';

const mockCreateJourney = jest.fn();
const mockGetViewer = jest.fn();
const mockAdvanceStep = jest.fn();
const mockSettleStep = jest.fn();

jest.mock('@/features/journey/api', () => ({
  journeyFeatureApi: {
    createJourney: (...args: unknown[]) => mockCreateJourney(...args),
    getViewer: (...args: unknown[]) => mockGetViewer(...args),
    advanceStep: (...args: unknown[]) => mockAdvanceStep(...args),
    settleStep: (...args: unknown[]) => mockSettleStep(...args),
  },
}));

const baseViewer = {
  id: 'jrn_001',
  slug: 'starlight-rescue-night',
  title: 'Starlight Rescue Night',
  narrativeSeed: null,
  status: 'ACTIVE' as const,
  currentStepId: 'launch',
  createdAt: '2026-03-23T00:00:00.000Z',
  updatedAt: '2026-03-23T00:00:00.000Z',
  progress: {
    totalChapters: 3,
    completedChapters: 0,
    failedChapters: 0,
    skippedChapters: 0,
    pendingChapters: 2,
    activeChapters: 1,
    completionPercent: 0,
  },
  chapters: [
    {
      id: 'launch',
      title: 'Launch Preparation',
      description: 'Collect supplies.',
      riskLevel: 'LOW' as const,
      order: 1,
      status: 'ACTIVE' as const,
      completedAt: null,
      settledByActor: null,
      resultNote: null,
      isCurrent: true,
    },
    {
      id: 'midpoint',
      title: 'Midpoint Challenge',
      description: 'Resolve obstacle.',
      riskLevel: 'MEDIUM' as const,
      order: 2,
      status: 'PENDING' as const,
      completedAt: null,
      settledByActor: null,
      resultNote: null,
      isCurrent: false,
    },
    {
      id: 'return-home',
      title: 'Safe Return',
      description: 'Return with rewards.',
      riskLevel: 'LOW' as const,
      order: 3,
      status: 'PENDING' as const,
      completedAt: null,
      settledByActor: null,
      resultNote: null,
      isCurrent: false,
    },
  ],
  party: {
    leadWalletAddress: '0x0000000000000000000000000000000000000000',
    memberCount: 1,
    members: [
      {
        walletAddress: '0x0000000000000000000000000000000000000000',
        role: 'LEAD' as const,
        joinedAt: '2026-03-23T00:00:00.000Z',
      },
    ],
  },
  rewards: {
    status: 'LOCKED' as const,
    hint: 'Complete all chapters.',
  },
  audit: {
    createdByAppId: 'app_alpha',
    createdByKeyId: 'key_alpha',
    createdByActor: 'app_alpha:key_alpha',
    requestId: null,
    updatedByActor: 'app_alpha:key_alpha',
  },
};

const nextViewer = {
  ...baseViewer,
  currentStepId: 'midpoint',
  progress: {
    ...baseViewer.progress,
    completedChapters: 1,
    pendingChapters: 1,
    completionPercent: 33,
  },
  chapters: baseViewer.chapters.map((chapter) => {
    if (chapter.id === 'launch') {
      return {
        ...chapter,
        status: 'COMPLETED' as const,
        isCurrent: false,
        completedAt: '2026-03-23T01:00:00.000Z',
      };
    }
    if (chapter.id === 'midpoint') {
      return {
        ...chapter,
        status: 'ACTIVE' as const,
        isCurrent: true,
      };
    }
    return chapter;
  }),
};

describe('JourneyPage', () => {
  beforeEach(() => {
    mockCreateJourney.mockReset();
    mockGetViewer.mockReset();
    mockAdvanceStep.mockReset();
    mockSettleStep.mockReset();
    (window as any).__ZFROG_V3_JOURNEY_BETA__ = undefined;
    window.localStorage.clear();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/journeys']}>
        <Routes>
          <Route path="/journeys" element={<JourneyPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('shows beta gate when journey alpha flag is disabled', () => {
    renderPage();
    expect(screen.getByText('Journey Map 正在灰度')).toBeInTheDocument();
  });

  it('fails closed when integration key is missing', () => {
    (window as any).__ZFROG_V3_JOURNEY_BETA__ = true;
    renderPage();

    expect(
      screen.getByText('Integration API key missing. Create/load/actions are fail-closed until key is set.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Journey' })).toBeDisabled();
  });

  it('creates a journey and renders timeline + choice card', async () => {
    (window as any).__ZFROG_V3_JOURNEY_BETA__ = true;
    mockCreateJourney.mockResolvedValue({ id: 'jrn_001' });
    mockGetViewer.mockResolvedValue(baseViewer);

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.type(screen.getByPlaceholderText('Starlight Rescue Night'), 'Starlight Rescue Night');
    await userEvent.click(screen.getByRole('button', { name: 'Create Journey' }));

    await waitFor(() => {
      expect(mockCreateJourney).toHaveBeenCalled();
      expect(mockGetViewer).toHaveBeenCalledWith('jrn_001', 'test-key');
    });

    expect(await screen.findByText('Active: 1. Launch Preparation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete Chapter' })).toBeInTheDocument();
  });

  it('advances active chapter with in-flight guarded action', async () => {
    (window as any).__ZFROG_V3_JOURNEY_BETA__ = true;
    mockGetViewer.mockResolvedValueOnce(baseViewer).mockResolvedValueOnce(nextViewer);
    mockAdvanceStep.mockResolvedValue({ id: 'jrn_001' });

    renderPage();

    await userEvent.type(screen.getByPlaceholderText('Paste V3 integration key'), 'test-key');
    await userEvent.type(screen.getByPlaceholderText('jrn_xxx'), 'jrn_001');
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));

    expect(await screen.findByText('Active: 1. Launch Preparation')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Complete Chapter' }));

    await waitFor(() => {
      expect(mockAdvanceStep).toHaveBeenCalledWith('jrn_001', 'launch', undefined, 'test-key');
      expect(mockGetViewer).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Active: 2. Midpoint Challenge')).toBeInTheDocument();
  });
});
