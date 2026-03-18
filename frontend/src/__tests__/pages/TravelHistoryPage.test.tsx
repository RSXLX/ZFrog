import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TravelHistoryPage } from '@/pages/TravelHistoryPage';

const mockNavigate = jest.fn();
const mockUseMyFrog = jest.fn();
const mockApiGet = jest.fn();
const mockGetSouvenirImageStatus = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/hooks/useMyFrog', () => ({
  useMyFrog: () => mockUseMyFrog(),
}));

jest.mock('@/services/api', () => ({
  apiService: {
    get: (...args: unknown[]) => mockApiGet(...args),
    getSouvenirImageStatus: (...args: unknown[]) => mockGetSouvenirImageStatus(...args),
  },
}));

jest.mock('@/components/travel/TravelResult', () => ({
  TravelResult: () => <div>Travel Result</div>,
}));

jest.mock('@/components/common/MicroInteractions', () => ({
  AnimatedNumber: ({ value }: { value: number }) => <span>{value}</span>,
}));

describe('TravelHistoryPage', () => {
  beforeEach(() => {
    mockUseMyFrog.mockReturnValue({
      address: null,
      frog: null,
      loading: false,
      isConnected: false,
      hasFrog: false,
    });
    mockApiGet.mockResolvedValue({ success: true, data: null });
    mockGetSouvenirImageStatus.mockResolvedValue({ success: false });
  });

  it('shows a wallet prompt when the user is disconnected', () => {
    render(
      <MemoryRouter>
        <TravelHistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('请先连接钱包')).toBeInTheDocument();
    expect(screen.getByText('连接钱包后查看你的旅行日记和探索记录。')).toBeInTheDocument();
  });

  it('prompts connected users without a frog to mint first', async () => {
    mockUseMyFrog.mockReturnValue({
      address: '0xowner',
      frog: null,
      loading: false,
      isConnected: true,
      hasFrog: false,
    });

    render(
      <MemoryRouter>
        <TravelHistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('还没有旅行中的青蛙')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '立即铸造' }));

    expect(mockNavigate).toHaveBeenCalledWith('/?mint=true');
  });

  it('sends empty-travel users to their frog travel hub', async () => {
    mockUseMyFrog.mockReturnValue({
      address: '0xowner',
      frog: {
        id: 7,
        tokenId: 17,
        name: '探险蛙',
        ownerAddress: '0xowner',
        birthday: new Date('2025-01-01'),
        totalTravels: 0,
        status: 'Idle',
      },
      loading: false,
      isConnected: true,
      hasFrog: true,
    });

    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/travels/history') {
        return Promise.resolve({
          success: true,
          data: {
            travels: [],
            total: 0,
          },
        });
      }

      if (endpoint === '/travels/stats') {
        return Promise.resolve({
          success: true,
          data: null,
        });
      }

      return Promise.resolve({ success: true, data: null });
    });

    render(
      <MemoryRouter>
        <TravelHistoryPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/travels/history', {
        params: {
          address: '0xowner',
          limit: 10,
          offset: 0,
        },
      });
    });

    expect(await screen.findByText('还没有旅行记录')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '开始旅行' }));

    expect(mockNavigate).toHaveBeenCalledWith('/frog/17');
  });

  it('syncs frog filter query params with history fetch', async () => {
    mockUseMyFrog.mockReturnValue({
      address: '0xowner',
      frog: {
        id: 7,
        tokenId: 17,
        name: '探险蛙',
        ownerAddress: '0xowner',
        birthday: new Date('2025-01-01'),
        totalTravels: 3,
        status: 'Idle',
      },
      loading: false,
      isConnected: true,
      hasFrog: true,
    });

    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/travels/history') {
        return Promise.resolve({
          success: true,
          data: { travels: [], total: 0 },
        });
      }

      if (endpoint === '/travels/stats') {
        return Promise.resolve({
          success: true,
          data: null,
        });
      }

      return Promise.resolve({ success: true, data: null });
    });

    render(
      <MemoryRouter initialEntries={['/travel-history?frogId=17']}>
        <Routes>
          <Route path="/travel-history" element={<TravelHistoryPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const historyCalls = mockApiGet.mock.calls.filter((call: unknown[]) => call[0] === '/travels/history');
      expect(historyCalls.length).toBeGreaterThan(0);
      const firstParams = (historyCalls[0][1] as any).params;
      expect(firstParams.frogId).toBe('17');
    });

    const filterSelect = await screen.findByRole('combobox');
    await userEvent.selectOptions(filterSelect, 'all');

    await waitFor(() => {
      const historyCalls = mockApiGet.mock.calls.filter((call: unknown[]) => call[0] === '/travels/history');
      expect(historyCalls.length).toBeGreaterThan(1);
      const lastParams = (historyCalls[historyCalls.length - 1][1] as any).params;
      expect(lastParams.frogId).toBeUndefined();
    });
  });
});
