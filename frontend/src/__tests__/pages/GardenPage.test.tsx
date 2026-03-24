import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GardenPage } from '@/pages/GardenPage';

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockUseMyFrog = jest.fn();
const mockUseFrogData = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

jest.mock('@/hooks/useMyFrog', () => ({
  useMyFrog: () => mockUseMyFrog(),
}));

jest.mock('@/hooks/useFrogData', () => ({
  useFrogData: () => mockUseFrogData(),
}));

describe('GardenPage', () => {
  const myFrog = {
    id: 1,
    tokenId: 11,
    name: '主蛙',
    ownerAddress: '0xowner',
    birthday: new Date('2025-01-01'),
    totalTravels: 3,
    status: 'Idle' as const,
    level: 2,
    xp: 10,
  };

  const visitFrog = {
    id: 9,
    tokenId: 99,
    name: '好友蛙',
    ownerAddress: '0xfriend',
    birthday: new Date('2025-01-01'),
    totalTravels: 5,
    status: 'Idle' as const,
    level: 3,
    xp: 20,
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseParams.mockReset();
    mockUseMyFrog.mockReset();
    mockUseFrogData.mockReset();
    mockUseParams.mockReturnValue({});
    mockUseMyFrog.mockReturnValue({
      frog: myFrog,
      loading: false,
      isConnected: true,
      hasFrog: true,
    });
    mockUseFrogData.mockReturnValue({
      frog: null,
      loading: false,
    });
  });

  it('redirects /garden to memory palace for the current frog', async () => {
    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/memory-palace/1', { replace: true });
    });
  });

  it('redirects /visit/:address to the friend memory palace', async () => {
    mockUseParams.mockReturnValue({ address: '0xfriend' });
    mockUseMyFrog.mockReturnValue({
      frog: myFrog,
      loading: false,
      isConnected: true,
      hasFrog: true,
    });
    mockUseFrogData.mockReturnValue({
      frog: visitFrog,
      loading: false,
    });

    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/memory-palace/9', { replace: true });
    });
  });

  it('shows a wallet prompt when trying to open own space while disconnected', () => {
    mockUseMyFrog.mockReturnValue({
      frog: null,
      loading: false,
      isConnected: false,
      hasFrog: false,
    });

    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('请先连接钱包')).toBeInTheDocument();
    expect(screen.getByText('连接钱包后才能进入你的记忆空间。')).toBeInTheDocument();
  });

  it('prompts connected users without a frog to mint first', () => {
    mockUseMyFrog.mockReturnValue({
      frog: null,
      loading: false,
      isConnected: true,
      hasFrog: false,
    });

    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('还没有记忆空间')).toBeInTheDocument();
    expect(screen.getByText('先铸造一只青蛙，空间、徽章和旅行功能才会完整开启。')).toBeInTheDocument();
  });

  it('shows a not-found state when visiting a missing frog address', () => {
    mockUseParams.mockReturnValue({ address: '0xmissing' });
    mockUseFrogData.mockReturnValue({
      frog: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    expect(screen.getByText('找不到这只青蛙的记忆空间')).toBeInTheDocument();
  });
});
