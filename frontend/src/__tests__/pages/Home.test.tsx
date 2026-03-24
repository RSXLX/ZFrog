import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '@/pages/Home';

const mockUseAccount = jest.fn();
const mockGetMyFrog = jest.fn();
const mockSetCurrentFrog = jest.fn();
let mockCurrentFrog: any = null;

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}));

jest.mock('@/components/wallet/ConnectButton', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/wallet/AccountCard', () => ({
  AccountCard: () => <div>Account Card</div>,
}));

jest.mock('@/components/frog/FrogMint', () => ({
  FrogMint: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Mint Frog</button>
  ),
}));

jest.mock('@/components/frog/FrogPet', () => ({
  FrogPet: ({ name }: { name: string }) => <div>{name}</div>,
}));

jest.mock('@/components/crosschain/CrossChainTransfer', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Cross Chain Transfer Modal</div> : null,
}));

jest.mock('@/stores/frogStore', () => ({
  useFrogStore: () => ({
    currentFrog: mockCurrentFrog,
    setCurrentFrog: mockSetCurrentFrog,
  }),
}));

jest.mock('@/features/frog/api', () => ({
  frogFeatureApi: {
    getMyFrog: (...args: unknown[]) => mockGetMyFrog(...args),
  },
}));

describe('Home page', () => {
  beforeEach(() => {
    mockCurrentFrog = null;
    mockUseAccount.mockReturnValue({
      isConnected: false,
      address: undefined,
    });
    mockGetMyFrog.mockResolvedValue(null);
  });

  it('shows wallet onboarding when disconnected', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('Connect your wallet to begin the adventure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Wallet' })).toBeInTheDocument();
  });

  it('loads command center links and cross-chain modal for frog owners', async () => {
    const frog = {
      id: 1,
      tokenId: 7,
      name: '阿蛙',
      ownerAddress: '0xabc',
      birthday: new Date('2025-01-01'),
      totalTravels: 3,
      status: 'Idle' as const,
      level: 2,
      xp: 80,
    };

    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0xAbC',
    });
    mockGetMyFrog.mockResolvedValue(frog);
    mockCurrentFrog = frog;

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetMyFrog).toHaveBeenCalledWith('0xAbC');
    });

    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Journal/i })).toHaveAttribute('href', '/travel-history');
    expect(screen.getByRole('link', { name: /Badges/i })).toHaveAttribute('href', '/badges');
    expect(screen.getByRole('link', { name: /Souvenirs/i })).toHaveAttribute('href', '/souvenirs');

    await userEvent.click(screen.getByRole('button', { name: /Cross-Chain/i }));
    expect(screen.getByText('Cross Chain Transfer Modal')).toBeInTheDocument();
  });
});
