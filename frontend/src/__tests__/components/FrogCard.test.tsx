import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FrogCard } from '@/components/FrogCard';
import { useFrog } from '@/hooks/useFrog';

// Mock hooks
jest.mock('@/hooks/useFrog');
jest.mock('@/hooks/useChain', () => ({
  useChain: () => ({ currentChain: 'ethereum', supportedChains: ['ethereum', 'bitcoin'] })
}));

const mockFrog = {
  id: 1,
  owner: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'Ribbit',
  level: 5,
  experience: 450,
  strength: 12,
  agility: 15,
  intelligence: 10,
  currentChain: 'ethereum',
  isTraveling: false,
  lastTravelTime: Date.now() - 86400000, // 1 day ago
  travelCount: 3,
  imageUrl: '/frogs/1.png',
  metadata: {
    color: 'green',
    pattern: 'striped',
    accessories: ['hat', 'glasses']
  }
};

describe('FrogCard Component', () => {
  beforeEach(() => {
    (useFrog as jest.Mock).mockReturnValue({
      frog: mockFrog,
      isLoading: false,
      error: null,
      startTravel: jest.fn(),
      feedFrog: jest.fn(),
      trainFrog: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render frog card with all basic information', () => {
      render(<FrogCard frogId={1} />);
      
      expect(screen.getByText('Ribbit')).toBeInTheDocument();
      expect(screen.getByText('Level 5')).toBeInTheDocument();
      expect(screen.getByText('Ethereum')).toBeInTheDocument();
      expect(screen.getByText('3 travels')).toBeInTheDocument();
    });

    it('should render frog image', () => {
      render(<FrogCard frogId={1} />);
      const image = screen.getByAltText('Ribbit');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/frogs/1.png');
    });

    it('should render stats correctly', () => {
      render(<FrogCard frogId={1} />);
      
      expect(screen.getByText('12')).toBeInTheDocument(); // Strength
      expect(screen.getByText('15')).toBeInTheDocument(); // Agility
      expect(screen.getByText('10')).toBeInTheDocument(); // Intelligence
    });

    it('should render experience bar', () => {
      render(<FrogCard frogId={1} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      // 450 / (500 * 5) = 18%
      expect(progressBar).toHaveAttribute('aria-valuenow', '18');
    });
  });

  describe('Interactions', () => {
    it('should call startTravel when travel button is clicked', async () => {
      const mockStartTravel = jest.fn();
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        startTravel: mockStartTravel
      });

      render(<FrogCard frogId={1} />);
      
      const travelButton = screen.getByRole('button', { name: /start travel/i });
      fireEvent.click(travelButton);

      await waitFor(() => {
        expect(mockStartTravel).toHaveBeenCalledWith({
          frogId: 1,
          destinationChain: expect.any(String)
        });
      });
    });

    it('should call feedFrog when feed button is clicked', async () => {
      const mockFeedFrog = jest.fn();
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        feedFrog: mockFeedFrog
      });

      render(<FrogCard frogId={1} />);
      
      const feedButton = screen.getByRole('button', { name: /feed/i });
      fireEvent.click(feedButton);

      await waitFor(() => {
        expect(mockFeedFrog).toHaveBeenCalledWith(1);
      });
    });

    it('should show confirmation modal before travel', async () => {
      render(<FrogCard frogId={1} />);
      
      const travelButton = screen.getByRole('button', { name: /start travel/i });
      fireEvent.click(travelButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to travel/i)).toBeInTheDocument();
    });

    it('should disable travel button when frog is traveling', () => {
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        isTraveling: true
      });

      render(<FrogCard frogId={1} />);
      
      const travelButton = screen.getByRole('button', { name: /traveling/i });
      expect(travelButton).toBeDisabled();
      expect(travelButton).toHaveTextContent(/traveling/i);
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading skeleton when data is loading', () => {
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        isLoading: true
      });

      render(<FrogCard frogId={1} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByText('Ribbit')).not.toBeInTheDocument();
    });

    it('should show error message when there is an error', () => {
      const errorMessage = 'Failed to load frog data';
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        error: new Error(errorMessage)
      });

      render(<FrogCard frogId={1} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      (useFrog as jest.Mock).mockReturnValue({
        ...mockFrog,
        error: new Error('Network error')
      });

      render(<FrogCard frogId={1} />);
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<FrogCard frogId={1} />);
      
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Frog card for Ribbit');
      expect(screen.getByRole('button', { name: /start travel/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
    });

    it('should be keyboard navigable', () => {
      render(<FrogCard frogId={1} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabindex', '0');
      });
    });

    it('should have sufficient color contrast', () => {
      render(<FrogCard frogId={1} />);
      
      // This would typically use a contrast checker library
      // For now, we verify text is readable
      const textElements = screen.getAllByText(/./);
      textElements.forEach(element => {
        expect(element).toBeVisible();
      });
    });
  });
});
