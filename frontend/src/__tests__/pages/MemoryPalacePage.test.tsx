import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MemoryPalacePage } from '@/pages/MemoryPalacePage';

const mockNavigate = jest.fn();
const mockGetByFrogId = jest.fn();
const mockUseMyFrog = jest.fn();
const mockGetMessages = jest.fn();
const mockGetGifts = jest.fn();
const mockGetGarden = jest.fn();
const mockUseGardenWebSocket = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('@/features/memory-palace/api', () => ({
  memoryPalaceApi: {
    getByFrogId: (...args: unknown[]) => mockGetByFrogId(...args),
  },
}));

jest.mock('@/hooks/useMyFrog', () => ({
  useMyFrog: () => mockUseMyFrog(),
}));

jest.mock('@/hooks/useGardenWebSocket', () => ({
  useGardenWebSocket: (...args: unknown[]) => mockUseGardenWebSocket(...args),
}));

jest.mock('@/components/common/ToastProvider', () => ({
  useToast: () => ({
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
      info: mockToastInfo,
    },
  }),
}));

jest.mock('@/features/garden/api', () => ({
  gardenFeatureApi: {
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
    getGifts: (...args: unknown[]) => mockGetGifts(...args),
    getGarden: (...args: unknown[]) => mockGetGarden(...args),
    visit: jest.fn(),
    interact: jest.fn(),
  },
}));

jest.mock('@/features/social/api', () => ({
  socialFeatureApi: {
    listFriends: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/features/travel/api', () => ({
  travelFeatureApi: {
    startGroupTravel: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('@/features/frog/api', () => ({
  frogFeatureApi: {
    interact: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('@/components/garden/GardenScene', () => ({
  GardenScene: ({ gardenState, currentUserFrogId, hasNewMail, hasNewGift }: any) => (
    <div>{`Garden Scene ${gardenState.ownerFrog.name}-${currentUserFrogId ?? 'guest'}-${String(hasNewMail)}-${String(hasNewGift)}`}</div>
  ),
}));

jest.mock('@/components/garden/GardenVisitorList', () => ({
  GardenVisitorList: ({ visitors, pendingRequests }: any) => (
    <div>{`Visitors ${visitors.length}-${pendingRequests.length}`}</div>
  ),
}));

jest.mock('@/components/garden/MessageBoard', () => ({
  MessageBoard: ({ frogId, currentFrogId, isOwner }: any) => (
    <div>{`Message Board ${frogId}-${currentFrogId}-${String(isOwner)}`}</div>
  ),
}));

jest.mock('@/components/garden/GiftBox', () => ({
  GiftBox: ({ frogId, isOwner }: any) => <div>{`Gift Box ${frogId}-${String(isOwner)}`}</div>,
}));

jest.mock('@/components/garden/PhotoAlbum', () => ({
  PhotoAlbum: ({ frogId, isOwner }: any) => <div>{`Photo Album ${frogId}-${String(isOwner)}`}</div>,
}));

jest.mock('@/components/garden/AchievementWall', () => ({
  AchievementWall: ({ frogId, isOwner }: any) => (
    <div>{`Achievement Wall ${frogId}-${String(isOwner)}`}</div>
  ),
}));

jest.mock('@/components/garden/GardenInteractionPanel', () => ({
  GardenInteractionPanel: ({ frogState }: any) => <div>{`Interact ${frogState.frog.name}`}</div>,
}));

jest.mock('@/components/garden/FrogActionMenu', () => ({
  FrogActionMenu: () => null,
}));

jest.mock('@/components/crosschain/CrossChainTransfer', () => ({
  CrossChainTransfer: () => null,
}));

describe('MemoryPalacePage', () => {
  const ownerFrog = {
    id: 9,
    tokenId: 11,
    name: '主蛙',
    ownerAddress: '0xowner',
    birthday: new Date('2025-01-01'),
    totalTravels: 3,
    status: 'Idle' as const,
    level: 2,
    xp: 10,
  };

  const memoryFrog = {
    id: 9,
    tokenId: 11,
    name: '主蛙',
    ownerAddress: '0xowner',
    birthday: '2025-01-01T00:00:00.000Z',
    totalTravels: 3,
    status: 'Idle' as const,
    level: 2,
    xp: 10,
  };

  const visitorMemoryFrog = {
    id: 7,
    tokenId: 77,
    name: '好友蛙',
    ownerAddress: '0xfriend',
    birthday: '2025-01-01T00:00:00.000Z',
    totalTravels: 5,
    status: 'Idle' as const,
    level: 4,
    xp: 22,
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetByFrogId.mockReset();
    mockUseMyFrog.mockReset();
    mockGetMessages.mockReset();
    mockGetGifts.mockReset();
    mockGetGarden.mockReset();
    mockUseGardenWebSocket.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToastInfo.mockReset();
    mockUseMyFrog.mockReturnValue({
      frog: ownerFrog,
      loading: false,
      hasFrog: true,
      isConnected: true,
    });
    mockGetMessages.mockResolvedValue([]);
    mockGetGifts.mockResolvedValue({ gifts: [], total: 0 });
    mockGetGarden.mockResolvedValue({
      ownerId: ownerFrog.id,
      ownerFrog,
      background: 'pond',
      decorations: [],
      currentVisitors: [{ id: 1, guestFrogId: 5, guestFrog: { id: 5, tokenId: 55, name: '访客蛙' }, hostFrogId: ownerFrog.id, status: 'Active', startedAt: new Date('2025-01-01T00:00:00.000Z') }],
      pendingRequests: [{ id: 2, guestFrogId: 6, guestFrog: { id: 6, tokenId: 66, name: '申请蛙' }, hostFrogId: ownerFrog.id, requestedAt: new Date('2025-01-01T00:00:00.000Z') }],
      todayVisitCount: 1,
      totalVisitCount: 3,
    });
    mockUseGardenWebSocket.mockReturnValue({
      isConnected: true,
    });
  });

  it('loads the owner memory palace and merged scene sections', async () => {
    mockGetByFrogId.mockResolvedValue({
      id: 'memory-9',
      frogId: 9,
      frog: memoryFrog,
      title: 'Memory Title',
      summary: 'Memory summary',
      highlights: ['a', 'b'],
    });

    render(
      <MemoryRouter initialEntries={['/memory-palace/9']}>
        <Routes>
          <Route path="/memory-palace/:frogId" element={<MemoryPalacePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetByFrogId).toHaveBeenCalledWith(9);
      expect(mockGetGarden).toHaveBeenCalledWith(11);
    });

    expect(await screen.findByText('Memory Title')).toBeInTheDocument();
    expect(screen.getByText(/空间场景|Space Scene/)).toBeInTheDocument();
    expect(screen.getByText(/访客与见证|Visitors & Witness/)).toBeInTheDocument();
    expect(screen.getByText('Garden Scene 主蛙-9-false-false')).toBeInTheDocument();
    expect(screen.getByText('Visitors 1-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /邀请好友|Invite Friends/ })).toBeInTheDocument();
  });

  it('shows invalid frog id error', async () => {
    render(
      <MemoryRouter initialEntries={['/memory-palace/abc']}>
        <Routes>
          <Route path="/memory-palace/:frogId" element={<MemoryPalacePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/无效的青蛙 ID|Invalid frog ID/)).toBeInTheDocument();
    expect(mockGetByFrogId).not.toHaveBeenCalled();
  });

  it('opens migrated space panels directly inside memory palace', async () => {
    mockGetByFrogId.mockResolvedValue({
      id: 'memory-9',
      frogId: 9,
      frog: memoryFrog,
      title: 'Memory Title',
      summary: 'Memory summary',
      highlights: [],
    });

    render(
      <MemoryRouter initialEntries={['/memory-palace/9']}>
        <Routes>
          <Route path="/memory-palace/:frogId" element={<MemoryPalacePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Memory Title')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /留言板|Messages/ }));
    expect(screen.getByText('Message Board 9-9-true')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /相册|Photos/ }));
    expect(screen.getByText('Photo Album 9-true')).toBeInTheDocument();
  });

  it('renders a public visitor view for another frog memory palace', async () => {
    mockUseMyFrog.mockReturnValue({
      frog: ownerFrog,
      loading: false,
      hasFrog: true,
      isConnected: true,
    });
    mockGetGarden.mockResolvedValue({
      ownerId: visitorMemoryFrog.id,
      ownerFrog: {
        id: visitorMemoryFrog.id,
        tokenId: visitorMemoryFrog.tokenId,
        name: visitorMemoryFrog.name,
        ownerAddress: visitorMemoryFrog.ownerAddress,
        birthday: new Date(visitorMemoryFrog.birthday),
        totalTravels: visitorMemoryFrog.totalTravels,
        status: visitorMemoryFrog.status,
        level: visitorMemoryFrog.level,
        xp: visitorMemoryFrog.xp,
      },
      background: 'pond',
      decorations: [],
      currentVisitors: [],
      pendingRequests: [],
      todayVisitCount: 0,
      totalVisitCount: 1,
    });
    mockGetByFrogId.mockResolvedValue({
      id: 'memory-7',
      frogId: 7,
      frog: visitorMemoryFrog,
      title: 'Friend Memory',
      summary: 'Friend summary',
      highlights: [],
    });

    render(
      <MemoryRouter initialEntries={['/memory-palace/7']}>
        <Routes>
          <Route path="/memory-palace/:frogId" element={<MemoryPalacePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetGarden).toHaveBeenCalledWith(77);
    });

    expect(await screen.findByText('Friend Memory')).toBeInTheDocument();
    expect(screen.getByText('Garden Scene 好友蛙-9-false-false')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /礼物记录|Gift History/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /邀请好友|Invite Friends/ })).not.toBeInTheDocument();
  });
});
