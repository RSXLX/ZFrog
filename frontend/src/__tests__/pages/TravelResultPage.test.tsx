import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TravelResultPage } from '@/pages/TravelResultPage';

const mockNavigate = jest.fn();
const mockApiGet = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/services/api', () => ({
  apiService: {
    get: (...args: unknown[]) => mockApiGet(...args),
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
    mockApiGet.mockReset();
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
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        id: 99,
        frogId: 7,
        targetWallet: '0xfeed000000000000000000000000000000000000',
        chainId: 7001,
        startTime: new Date(Date.now() - 10_000).toISOString(),
        endTime: new Date(Date.now() + 60_000).toISOString(),
        status: 'Active',
      },
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
      expect(mockApiGet).toHaveBeenCalledWith('/travels/p0/99');
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
});
