import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TravelDetailPage } from '@/pages/TravelDetailPage';

const mockNavigate = jest.fn();
const mockGetP0Detail = jest.fn();
const mockGetJournal = jest.fn();
const mockGetHistory = jest.fn();
const mockGetSouvenirImageStatus = jest.fn();
const mockGetSessionWalletAddress = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/features/travel/api', () => ({
  travelFeatureApi: {
    getP0Detail: (...args: unknown[]) => mockGetP0Detail(...args),
    getJournal: (...args: unknown[]) => mockGetJournal(...args),
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
    getSouvenirImageStatus: (...args: unknown[]) => mockGetSouvenirImageStatus(...args),
  },
}));

jest.mock('@/lib/auth/session', () => ({
  getSessionWalletAddress: () => mockGetSessionWalletAddress(),
}));

jest.mock('@/components/travel/ExplorationList', () => ({
  ExplorationList: () => <div>Exploration List</div>,
}));

describe('TravelDetailPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetP0Detail.mockReset();
    mockGetJournal.mockReset();
    mockGetHistory.mockReset();
    mockGetSouvenirImageStatus.mockReset();
    mockGetSessionWalletAddress.mockReset();

    mockGetSouvenirImageStatus.mockResolvedValue({ success: false });
  });

  it('loads detail through P0 path first', async () => {
    mockGetP0Detail.mockResolvedValue({
      id: 123,
      travelId: 123,
      frogId: 7,
      tokenId: 17,
      targetWallet: '0x1111111111111111111111111111111111111111',
      chainId: 7001,
      status: 'COMPLETED',
      startTime: '2026-03-21T00:00:00.000Z',
      endTime: '2026-03-21T01:00:00.000Z',
      completedAt: '2026-03-21T01:00:00.000Z',
      journal: {
        title: 'P0 Journal',
        content: 'P0 content',
        mood: 'HAPPY',
        highlights: [],
      },
      souvenir: null,
      exploredSnapshot: { discoveries: [] },
    });

    render(
      <MemoryRouter initialEntries={['/travel-detail/123']}>
        <Routes>
          <Route path="/travel-detail/:travelId" element={<TravelDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetP0Detail).toHaveBeenCalledWith('123');
    });

    expect(await screen.findByText('P0 Journal')).toBeInTheDocument();
    expect(mockGetJournal).not.toHaveBeenCalled();
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it('falls back to journal + history when P0 detail fails', async () => {
    mockGetP0Detail.mockRejectedValue(new Error('P0 unavailable'));
    mockGetSessionWalletAddress.mockReturnValue('0xabc0000000000000000000000000000000000000');
    mockGetJournal.mockResolvedValue({
      id: 123,
      journal: {
        title: 'Fallback Journal',
        content: 'Fallback content',
        mood: 'CURIOUS',
        highlights: [],
      },
      souvenir: null,
    });
    mockGetHistory.mockResolvedValue({
      travels: [
        {
          id: 123,
          frogId: 7,
          targetWallet: '0x1111111111111111111111111111111111111111',
          targetChain: 'ZETACHAIN_ATHENS',
          chainId: 7001,
          status: 'Completed',
          completedAt: '2026-03-21T01:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter initialEntries={['/travel-detail/123']}>
        <Routes>
          <Route path="/travel-detail/:travelId" element={<TravelDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetJournal).toHaveBeenCalledWith('123');
      expect(mockGetHistory).toHaveBeenCalledWith({
        address: '0xabc0000000000000000000000000000000000000',
        limit: 100,
        offset: 0,
      });
    });

    expect(await screen.findByText('Fallback Journal')).toBeInTheDocument();
  });
});
