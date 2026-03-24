import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TravelResultPage } from '@/pages/TravelResultPage';

const mockNavigate = jest.fn();
const mockGetTravelById = jest.fn();
const mockGetMemoryPalaceByFrogId = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/features/travel/api', () => ({
  travelFeatureApi: {
    getById: (...args: unknown[]) => mockGetTravelById(...args),
  },
}));

jest.mock('@/features/memory-palace/api', () => ({
  memoryPalaceApi: {
    getByFrogId: (...args: unknown[]) => mockGetMemoryPalaceByFrogId(...args),
  },
}));

jest.mock('@/components/travel/TravelResult', () => ({
  TravelResult: () => <div>Travel Result</div>,
}));

jest.mock('@/components/travel/TravelStatus', () => ({
  TravelStatus: () => <div>Travel Status</div>,
}));

describe('TravelResultPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetTravelById.mockReset();
    mockGetMemoryPalaceByFrogId.mockReset();
    mockGetMemoryPalaceByFrogId.mockResolvedValue(null);
  });

  it('redirects to home when travelId is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/travel']}>
        <Routes>
          <Route path="/travel" element={<TravelResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('clears polling interval on unmount for active travel', async () => {
    mockGetTravelById.mockResolvedValue({
      travelId: 99,
      frogId: 7,
      tokenId: 17,
      frogName: '探险蛙',
      walletAddress: '0xfeed000000000000000000000000000000000000',
      targetWallet: '0xfeed000000000000000000000000000000000000',
      chainId: 7001,
      duration: 3600,
      currentStage: 'DEPARTING',
      progress: 10,
      travelType: 'random',
      targetChain: 'ZETACHAIN_ATHENS',
      startTime: new Date(Date.now() - 10_000).toISOString(),
      endTime: new Date(Date.now() + 60_000).toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
      souvenirId: null,
      souvenir: null,
      journal: null,
      discoveries: [],
    });

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/travel/99']}>
        <Routes>
          <Route path="/travel/:travelId" element={<TravelResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetTravelById).toHaveBeenCalledWith('99');
    });

    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    const intervalId = setIntervalSpy.mock.results[0]?.value;
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('shows memory palace entry and navigates to memory page', async () => {
    mockGetTravelById.mockResolvedValue({
      travelId: 188,
      frogId: 7,
      tokenId: 17,
      frogName: '探险蛙',
      walletAddress: '0xfeed000000000000000000000000000000000000',
      targetWallet: '0xfeed000000000000000000000000000000000000',
      chainId: 7001,
      duration: 3600,
      currentStage: 'COMPLETED',
      progress: 100,
      travelType: 'random',
      targetChain: 'ZETACHAIN_ATHENS',
      startTime: '2026-03-21T00:00:00.000Z',
      endTime: '2026-03-21T01:00:00.000Z',
      completedAt: '2026-03-21T01:00:00.000Z',
      updatedAt: '2026-03-21T01:00:00.000Z',
      status: 'COMPLETED',
      souvenirId: null,
      souvenir: null,
      journal: null,
      discoveries: [],
    });
    mockGetMemoryPalaceByFrogId.mockResolvedValue({
      id: 'memory-7',
      frogId: 7,
      title: 'Memory',
      summary: 'summary',
      highlights: [],
    });

    render(
      <MemoryRouter initialEntries={['/travel/188']}>
        <Routes>
          <Route path="/travel/:travelId" element={<TravelResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    const memoryButton = await screen.findByText(/进入记忆空间|Open Memory Palace/);
    fireEvent.click(memoryButton);

    expect(mockNavigate).toHaveBeenCalledWith('/memory-palace/7');
  });
});
