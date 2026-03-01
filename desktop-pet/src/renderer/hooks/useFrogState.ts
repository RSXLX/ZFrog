import { useState, useCallback } from 'react';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

export interface FrogStats {
  hunger: number;
  energy: number;
  happiness: number;
}

interface UseFrogStateReturn {
  currentState: FrogState;
  mood: FrogMood;
  stats: FrogStats;
  setStats: React.Dispatch<React.SetStateAction<FrogStats>>;
  interact: (action: 'pet' | 'poke' | 'feed') => void;
  setChainEvent: (event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => void;
  setMood: React.Dispatch<React.SetStateAction<FrogMood>>;
  setCurrentState: React.Dispatch<React.SetStateAction<FrogState>>;
  setHungry: () => void;
  setSleepy: () => void;
  setAngry: () => void;
  restore: () => void;
}

export function useFrogState(): UseFrogStateReturn {
  const [currentState, setCurrentState] = useState<FrogState>('idle');
  const [mood, setMood] = useState<FrogMood>('neutral');
  const [stats, setStats] = useState<FrogStats>({
    hunger: 80,
    energy: 90,
    happiness: 70,
  });

  const interact = useCallback((action: 'pet' | 'poke' | 'feed') => {
    console.log('[FrogState] Interaction:', action);
    
    switch (action) {
      case 'pet':
        setCurrentState('happy');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          happiness: Math.min(100, prev.happiness + 15),
          energy: Math.min(100, prev.energy + 5),
        }));
        setTimeout(() => {
          setCurrentState('idle');
        }, 2000);
        break;
        
      case 'poke':
        setCurrentState('scared');
        setMood('sad');
        setStats(prev => ({
          ...prev,
          happiness: Math.max(0, prev.happiness - 10),
        }));
        setTimeout(() => {
          setCurrentState('idle');
          setMood('neutral');
        }, 1500);
        break;
        
      case 'feed':
        setCurrentState('eating');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          hunger: Math.min(100, prev.hunger + 30),
          happiness: Math.min(100, prev.happiness + 5),
        }));
        setTimeout(() => {
          setCurrentState('idle');
          setMood('happy');
        }, 2000);
        break;
    }
  }, []);

  const setChainEvent = useCallback((event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => {
    console.log('[FrogState] Chain event:', event);
    
    switch (event) {
      case 'large_buy':
        setCurrentState('excited');
        setMood('very_happy');
        setTimeout(() => {
          setCurrentState('idle');
          setMood('happy');
        }, 5000);
        break;
        
      case 'large_sell':
        setCurrentState('scared');
        setMood('very_sad');
        setTimeout(() => {
          setCurrentState('idle');
          setMood('sad');
        }, 5000);
        break;
        
      case 'price_up':
        setCurrentState('dancing');
        setMood('very_happy');
        setTimeout(() => {
          setCurrentState('idle');
          setMood('happy');
        }, 5000);
        break;
        
      case 'price_down':
        setCurrentState('crying');
        setMood('sad');
        setTimeout(() => {
          setCurrentState('idle');
          setMood('neutral');
        }, 5000);
        break;
    }
  }, []);

  // Make frog hungry (after eating)
  const setHungry = useCallback(() => {
    setStats(prev => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - 30),
    }));
    if (currentState === 'idle') {
      setMood('sad');
    }
  }, [currentState]);

  // Make frog sleepy
  const setSleepy = useCallback(() => {
    setStats(prev => ({
      ...prev,
      energy: Math.max(0, prev.energy - 30),
    }));
    if (currentState === 'idle') {
      setCurrentState('sleeping');
    }
  }, [currentState]);

  // Make frog angry (after too many pokes)
  const setAngry = useCallback(() => {
    setCurrentState('angry');
    setMood('sad');
    setStats(prev => ({
      ...prev,
      happiness: Math.max(0, prev.happiness - 20),
    }));
    setTimeout(() => {
      setCurrentState('idle');
    }, 3000);
  }, []);

  // Restore normal state
  const restore = useCallback(() => {
    setCurrentState('idle');
    setMood('neutral');
  }, []);

  return {
    currentState,
    mood,
    stats,
    setStats,
    interact,
    setChainEvent,
    setMood,
    setCurrentState,
    setHungry,
    setSleepy,
    setAngry,
    restore,
  };
}
