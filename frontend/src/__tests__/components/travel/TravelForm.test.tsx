import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelForm } from '@/components/travel/TravelForm';

const mockWriteContract = jest.fn();
const mockUseWriteContract = jest.fn();
const mockUseWaitForTransactionReceipt = jest.fn();

jest.mock('wagmi', () => ({
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: (...args: unknown[]) => mockUseWaitForTransactionReceipt(...args),
}));

jest.mock('@/config/contracts', () => ({
  TRAVEL_ADDRESS: '0x00000000000000000000000000000000000000aa',
  TRAVEL_ABI: ['mock-abi'],
}));

jest.mock('@/services/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('TravelForm', () => {
  beforeEach(() => {
    mockUseWriteContract.mockReturnValue({
      data: '0xtxhash',
      writeContract: mockWriteContract,
      isPending: false,
      error: undefined,
    });
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    });
  });

  it('starts a random local exploration with the expected contract args', async () => {
    render(<TravelForm frogId={11} frogName="测试蛙" />);

    await userEvent.click(screen.getByRole('button', { name: '🚀 开始随机探险' }));

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: '0x00000000000000000000000000000000000000aa',
      abi: ['mock-abi'],
      functionName: 'startTravel',
      args: [
        BigInt(11),
        '0x0000000000000000000000000000000000000000',
        BigInt(3600),
        BigInt(7001),
      ],
    });

    expect(screen.getByText('✨ 测试蛙 已出发去 ZetaChain Athens！')).toBeInTheDocument();
  });
});
