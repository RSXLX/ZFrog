import { render, screen } from '@testing-library/react';
import { HibernationBadge } from '@/components/frog/HibernationBadge';

describe('HibernationBadge', () => {
  it('renders sleeping state copy', () => {
    render(<HibernationBadge status="SLEEPING" />);

    expect(screen.getByText('沉睡')).toBeInTheDocument();
    expect(screen.getByText('点击唤醒')).toBeInTheDocument();
  });

  it('does not crash or render for unknown status', () => {
    render(<HibernationBadge status={'broken' as any} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
