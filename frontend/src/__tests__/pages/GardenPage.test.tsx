import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GardenPage } from '@/pages/GardenPage';

const mockNavigate = jest.fn();
const mockUseMyFrog = jest.fn();
const mockUseFrogData = jest.fn();
const mockUseGardenWebSocket = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  };
});

jest.mock('@/hooks/useMyFrog', () => ({
  useMyFrog: () => mockUseMyFrog(),
}));

jest.mock('@/hooks/useFrogData', () => ({
  useFrogData: () => mockUseFrogData(),
}));

jest.mock('@/hooks/useGardenWebSocket', () => ({
  useGardenWebSocket: (...args: unknown[]) => mockUseGardenWebSocket(...args),
}));

jest.mock('@/components/common/ToastProvider', () => ({
  useToast: () => ({
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
    },
  }),
}));

jest.mock('@/services/api', () => ({
  apiService: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

jest.mock('@/components/garden/GardenScene', () => ({
  GardenScene: ({ onMailboxClick, onFrogClick }: any) => (
    <div>
      <div>Garden Scene</div>
      <button onClick={onMailboxClick}>Open Mailbox</button>
      <button
        onClick={() =>
          onFrogClick({
            frogId: 2,
            frog: { id: 2, tokenId: 5, name: '访客蛙' },
            position: { x: 50, y: 50 },
            activity: 'idle',
            isHost: false,
          })
        }
      >
        Select Frog
      </button>
    </div>
  ),
}));

jest.mock('@/components/garden/GardenVisitorList', () => ({
  GardenVisitorList: ({ pendingRequests, onAcceptVisit }: any) => (
    <div>
      <div>Visitors Sidebar</div>
      <div>Pending Requests: {pendingRequests.length}</div>
      {pendingRequests[0] && (
        <button onClick={() => onAcceptVisit(pendingRequests[0])}>Accept Visit</button>
      )}
    </div>
  ),
}));

jest.mock('@/components/garden/GardenDock', () => ({
  GardenDock: ({ items }: any) => (
    <div>
      {items.map((item: any) => (
        <button key={item.id} onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/garden/FrogActionMenu', () => ({
  FrogActionMenu: ({ isOpen, actions }: any) =>
    isOpen ? (
      <div>
        {actions.map((action: any) => (
          <button key={action.id} onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    ) : null,
}));

jest.mock('@/components/garden/GardenInteractionPanel', () => ({
  GardenInteractionPanel: ({ frogState }: any) => <div>Interact {frogState.frog.name}</div>,
}));

jest.mock('@/components/garden/MessageBoard', () => ({
  MessageBoard: () => <div>Message Board</div>,
}));

jest.mock('@/components/garden/GiftBox', () => ({
  GiftBox: () => <div>Gift Box</div>,
}));

jest.mock('@/components/garden/PhotoAlbum', () => ({
  PhotoAlbum: () => <div>Photo Album</div>,
}));

jest.mock('@/components/garden/AchievementWall', () => ({
  AchievementWall: () => <div>Achievement Wall</div>,
}));

jest.mock('@/components/crosschain/CrossChainTransfer', () => ({
  CrossChainTransfer: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Cross Chain Transfer</div> : null,
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

  beforeEach(() => {
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
    mockUseGardenWebSocket.mockReturnValue({
      isConnected: true,
    });
    mockApiGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/garden/11') {
        return Promise.resolve({
          success: true,
          data: {
            ownerId: myFrog.id,
            ownerFrog: myFrog,
            background: 'pond',
            decorations: [],
            currentVisitors: [],
            pendingRequests: [
              {
                id: 99,
                guestFrogId: 5,
                guestFrog: { id: 5, tokenId: 5, name: '访客蛙' },
              },
            ],
            todayVisitCount: 1,
            totalVisitCount: 3,
          },
        });
      }

      if (endpoint === '/friends/list/11') {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 2,
              tokenId: 22,
              name: '好友蛙',
              level: 4,
              status: 'Idle',
            },
          ],
        });
      }

      return Promise.resolve({ success: true, data: [] });
    });
    mockApiPost.mockResolvedValue({ success: true, data: { visitId: 101 } });
  });

  it('shows a wallet prompt instead of a not-found message when disconnected', () => {
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
    expect(screen.getByText('连接钱包后才能进入你的青蛙家园。')).toBeInTheDocument();
    expect(screen.queryByText('找不到这只青蛙')).not.toBeInTheDocument();
  });

  it('prompts connected users without a frog to mint before entering the garden', async () => {
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

    expect(screen.getByText('还没有青蛙家园')).toBeInTheDocument();
    expect(screen.getByText('先铸造一只青蛙，家园、徽章和旅行功能才会完整开启。')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '立即铸造' }));

    expect(mockNavigate).toHaveBeenCalledWith('/?mint=true');
  });

  it('loads the garden and opens feature panels from dock actions', async () => {
    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/garden/11');
    });

    expect(screen.getByText("主蛙's Garden")).toBeInTheDocument();
    expect(screen.getByText('已连接')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests: 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '留言板' }));
    expect(screen.getByText('Message Board')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '成就' }));
    expect(screen.getByText('Achievement Wall')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Select Frog' }));
    await userEvent.click(screen.getByRole('button', { name: '详情' }));
    expect(screen.getByText('Interact 访客蛙')).toBeInTheDocument();
  });

  it('invites idle friends from the invite modal', async () => {
    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/garden/11');
    });

    await userEvent.click(screen.getByRole('button', { name: /^Invite$/ }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/friends/list/11');
    });

    expect(await screen.findByText('Invite Friends')).toBeInTheDocument();
    expect(await screen.findByText('好友蛙')).toBeInTheDocument();

    const inviteButtons = screen.getAllByRole('button', { name: 'Invite' });
    await userEvent.click(inviteButtons[1]);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/garden/11/visit', {
        guestFrogId: 22,
      });
    });
  });

  it('starts group travel with an idle friend from the invite modal', async () => {
    render(
      <MemoryRouter>
        <GardenPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/garden/11');
    });

    await userEvent.click(screen.getByRole('button', { name: /^Invite$/ }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/friends/list/11');
    });

    expect(await screen.findByText('好友蛙')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Group Travel'));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/travels/group', {
        leaderId: 11,
        companionId: 22,
        duration: 3600,
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('主蛙 和 好友蛙 一起出发旅行啦！');
    expect(mockNavigate).toHaveBeenCalledWith('/frog/11');
  });
});
