import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BadgesPage } from '@/pages/BadgesPage';

const mockNavigate = jest.fn();
const mockUseMyFrog = jest.fn();
const mockGetBadges = jest.fn();
const mockGetPendingRewards = jest.fn();
const mockClaimAllRewards = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

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

jest.mock('@/features/reward/api', () => ({
  rewardFeatureApi: {
    getBadges: (...args: unknown[]) => mockGetBadges(...args),
    getPendingRewards: (...args: unknown[]) => mockGetPendingRewards(...args),
    claimAllRewards: (...args: unknown[]) => mockClaimAllRewards(...args),
  },
}));

jest.mock('@/components/common/ToastProvider', () => ({
  useToast: () => ({
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
    },
  }),
}));

describe('BadgesPage', () => {
  beforeEach(() => {
    mockUseMyFrog.mockReturnValue({
      frog: null,
      loading: false,
      isConnected: false,
      hasFrog: false,
    });
    mockGetBadges.mockResolvedValue([]);
    mockGetPendingRewards.mockResolvedValue([]);
    mockClaimAllRewards.mockResolvedValue({ successCount: 0, txHashes: [] });
  });

  it('shows connect prompt when wallet is not connected', () => {
    render(
      <MemoryRouter>
        <BadgesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('请先连接钱包')).toBeInTheDocument();
    expect(screen.getByText('连接钱包后查看你的徽章收藏。')).toBeInTheDocument();
  });

  it('prompts connected users without a frog to mint first', async () => {
    mockUseMyFrog.mockReturnValue({
      frog: null,
      loading: false,
      isConnected: true,
      hasFrog: false,
    });

    render(
      <MemoryRouter>
        <BadgesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('还没有青蛙')).toBeInTheDocument();
    expect(screen.getByText('先铸造一只青蛙，才能开始收集徽章和旅行成就。')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /立即铸造/ }));

    expect(mockNavigate).toHaveBeenCalledWith('/?mint=true');
  });

  it('loads badges, supports filtering, and claims pending rewards', async () => {
    mockUseMyFrog.mockReturnValue({
      frog: {
        id: 1,
        tokenId: 9,
        name: '旅行蛙',
        ownerAddress: '0xowner',
        birthday: new Date('2025-01-01'),
        totalTravels: 4,
        status: 'Idle',
      },
      loading: false,
      isConnected: true,
      hasFrog: true,
    });

    mockGetBadges.mockResolvedValue([
      {
        id: 'b1',
        code: 'TRAVELER',
        name: '旅行大师',
        description: '完成第一次旅行',
        icon: '🧭',
        rarity: 3,
        isHidden: false,
        unlocked: true,
        unlockType: 'TRIP_COUNT',
      },
      {
        id: 'b2',
        code: 'SECRET',
        name: '秘密徽章',
        description: '隐藏目标',
        icon: '🌟',
        rarity: 5,
        isHidden: true,
        unlocked: false,
        unlockType: 'SPECIAL',
      },
    ]);

    mockGetPendingRewards
      .mockResolvedValueOnce([{ id: 'r1', amount: '1000000000000000000' }])
      .mockResolvedValueOnce([]);

    mockClaimAllRewards.mockResolvedValue({
      successCount: 1,
      txHashes: ['0xtx'],
    });

    render(
      <MemoryRouter>
        <BadgesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetBadges).toHaveBeenCalledWith(9);
      expect(mockGetPendingRewards).toHaveBeenCalledWith('0xowner');
    });

    expect(await screen.findByText(/旅行蛙/)).toBeInTheDocument();
    expect(screen.getByText('旅行大师')).toBeInTheDocument();
    expect(screen.getByText('1 份待领取奖励')).toBeInTheDocument();
    expect(screen.getByText('1.0000 ZETA')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /已解锁/ }));
    expect(screen.getByText('旅行大师')).toBeInTheDocument();
    expect(screen.queryByText('???')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '🎉 一键领取' }));

    await waitFor(() => {
      expect(mockClaimAllRewards).toHaveBeenCalledWith('0xowner');
      expect(mockGetPendingRewards).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('✅ 成功领取 1 份奖励！')).toBeInTheDocument();
  });
});
