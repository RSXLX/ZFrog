import { render, screen, waitFor } from '@testing-library/react';
import { NurturePanel } from '@/components/frog/NurturePanel';

const mockGetRuntimeState = jest.fn();

jest.mock('@/features/frog/api', () => ({
  frogFeatureApi: {
    getRuntimeState: (...args: unknown[]) => mockGetRuntimeState(...args),
  },
}));

jest.mock('@/components/frog/StatusPanel', () => () => <div>StatusPanel</div>);
jest.mock('@/components/frog/LilyWallet', () => () => <div>LilyWallet</div>);
jest.mock('@/components/frog/GuessGame', () => () => <div>GuessGame</div>);
jest.mock('@/components/frog/CatchBugGame', () => () => <div>CatchBugGame</div>);
jest.mock('@/components/frog/LilyPadGame', () => () => <div>LilyPadGame</div>);
jest.mock('@/components/frog/MemoryGame', () => () => <div>MemoryGame</div>);
jest.mock('@/components/frog/RestPanel', () => () => <div>RestPanel</div>);
jest.mock('@/components/frog/EvolutionPanel', () => () => <div>EvolutionPanel</div>);
jest.mock('@/components/frog/TaskPanel', () => () => <div>TaskPanel</div>);
jest.mock('@/components/frog/ShopPanel', () => () => <div>ShopPanel</div>);

describe('NurturePanel', () => {
  beforeEach(() => {
    mockGetRuntimeState.mockReset();
    mockGetRuntimeState.mockResolvedValue({
      level: 10,
      canEvolve: true,
      evolutionType: null,
      energy: 88,
      isResting: false,
    });
  });

  it('shows legacy status mode by default', async () => {
    render(<NurturePanel frogId={1} frogTokenId={7} ownerAddress="0xabc" />);

    await waitFor(() => {
      expect(mockGetRuntimeState).toHaveBeenCalledWith(7);
    });

    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('LilyWallet')).toBeInTheDocument();
    expect(screen.getByText('StatusPanel')).toBeInTheDocument();
  });

  it('uses detail mode without duplicate status or wallet blocks', async () => {
    render(<NurturePanel frogId={1} frogTokenId={7} ownerAddress="0xabc" mode="detail" />);

    await waitFor(() => {
      expect(mockGetRuntimeState).toHaveBeenCalledWith(7);
    });

    expect(screen.getByText('互动')).toBeInTheDocument();
    expect(screen.queryByText('状态')).not.toBeInTheDocument();
    expect(screen.queryByText('LilyWallet')).not.toBeInTheDocument();
    expect(screen.queryByText('StatusPanel')).not.toBeInTheDocument();
    expect(screen.getByText('GuessGame')).toBeInTheDocument();
    expect(screen.getByText('RestPanel')).toBeInTheDocument();
  });
});
