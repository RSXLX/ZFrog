import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FrogCard } from '@/components/frog/FrogCard';

const frog = {
  id: 1,
  tokenId: 42,
  name: '小跳蛙',
  ownerAddress: '0x1234567890abcdef1234567890abcdef12345678',
  birthday: new Date('2025-01-01T00:00:00.000Z'),
  totalTravels: 7,
  status: 'Traveling' as const,
  level: 5,
  xp: 320,
};

describe('FrogCard', () => {
  it('renders frog summary and status link', () => {
    render(
      <MemoryRouter>
        <FrogCard frog={frog} />
      </MemoryRouter>
    );

    expect(screen.getByText('小跳蛙')).toBeInTheDocument();
    expect(screen.getByText('旅行中')).toBeInTheDocument();
    expect(screen.getByText('🗺️ 旅行次数: 7')).toBeInTheDocument();
    expect(screen.getByText('⭐ 等级: Lv.5 (XP: 320)')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/frog/42');
    expect(screen.getByText('查看详情 →')).toBeInTheDocument();
  });
});
