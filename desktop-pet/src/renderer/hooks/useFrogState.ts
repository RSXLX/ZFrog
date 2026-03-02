import { useState, useCallback } from 'react';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting' | 'walking';
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
  interact: (action: 'pet' | 'poke' | 'feed' | 'greet') => void;
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
    hunger: 75,
    energy: 85,
    happiness: 65,
  });

  const interact = useCallback((action: 'pet' | 'poke' | 'feed' | 'greet') => {
    console.log('[FrogState] Interaction:', action);
    
    switch (action) {
      case 'greet':
      case 'pet':
        setCurrentState(action === 'greet' ? 'greeting' : 'happy');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          happiness: Math.min(100, prev.happiness + 12),
          energy: Math.min(100, prev.energy + 3),
        }));
        setTimeout(() => {
          setCurrentState('idle');
        }, action === 'greet' ? 2500 : 1500);
        break;
        
      case 'poke':
        setCurrentState('scared');
        setMood('sad');
        setStats(prev => ({
          ...prev,
          happiness: Math.max(0, prev.happiness - 8),
        }));
        setTimeout(() => {
          setCurrentState('idle');
          setMood('neutral');
        }, 1200);
        break;
        
      case 'feed':
        setCurrentState('eating');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          hunger: Math.min(100, prev.hunger + 25),
          happiness: Math.min(100, prev.happiness + 5),
        }));
        setTimeout(() => {
          setCurrentState('happy');
          setTimeout(() => {
            setCurrentState('idle');
          }, 1500);
        }, 1800);
        break;
    }
  }, []);

  const setChainEvent = useCallback((event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => {
    console.log('[FrogState] Chain event:', event);
    
    switch (event) {
      case 'large_buy':
      case 'price_up':
        setCurrentState('excited');
        setMood('very_happy');
        setTimeout(() => {
          setCurrentState('dancing');
          setTimeout(() => {
            setCurrentState('happy');
            setTimeout(() => {
              setCurrentState('idle');
            }, 3000);
          }, 4000);
        }, 3000);
        break;
        
      case 'large_sell':
      case 'price_down':
        setCurrentState('scared');
        setMood('very_sad');
        setTimeout(() => {
          setCurrentState('crying');
          setTimeout(() => {
            setCurrentState('sad');
            setTimeout(() => {
              setCurrentState('idle');
            }, 4000);
          }, 3000);
        }, 2000);
        break;
    }
  }, []);

  const setHungry = useCallback(() => {
    setStats(prev => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - 25),
    }));
    if (currentState === 'idle') {
      setMood('sad');
    }
  }, [currentState]);

  const setSleepy = useCallback(() => {
    setStats(prev => ({
      ...prev,
      energy: Math.max(0, prev.energy - 25),
    }));
    if (currentState === 'idle') {
      setCurrentState('sleeping');
    }
  }, [currentState]);

  const setAngry = useCallback(() => {
    setCurrentState('angry');
    setMood('sad');
    setStats(prev => ({
      ...prev,
      happiness: Math.max(0, prev.happiness - 15),
    }));
    setTimeout(() => {
      setCurrentState('idle');
    }, 3000);
  }, []);

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
