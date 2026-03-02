import { useState, useCallback, useEffect, useRef } from 'react';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting' | 'stretching' | 'yawning' | 'looking' | 'walking' | 'wave';
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
  interact: (action: 'pet' | 'poke' | 'feed' | 'greet' | 'stretch' | 'look') => void;
  setChainEvent: (event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => void;
  setMood: React.Dispatch<React.SetStateAction<FrogMood>>;
  setCurrentState: React.Dispatch<React.SetStateAction<FrogState>>;
  setHungry: () => void;
  setSleepy: () => void;
  setAngry: () => void;
  restore: () => void;
  triggerAutoAction: () => void;
}

export function useFrogState(): UseFrogStateReturn {
  const [currentState, setCurrentState] = useState<FrogState>('idle');
  const [mood, setMood] = useState<FrogMood>('neutral');
  const [stats, setStats] = useState<FrogStats>({
    hunger: 70,
    energy: 80,
    happiness: 60,
  });
  
  const autoActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Random auto actions when idle
  useEffect(() => {
    const triggerRandomAction = () => {
      const now = Date.now();
      const idleTime = now - lastInteractionRef.current;
      
      // Only trigger if idle for a while and not in critical state
      if (idleTime > 15000 && currentState === 'idle') {
        const random = Math.random();
        
        // 30% chance to do something
        if (random < 0.3) {
          const actions: FrogState[] = ['looking', 'stretching', 'yawning', 'greeting'];
          const action = actions[Math.floor(Math.random() * actions.length)];
          
          if (action === 'stretching') {
            setCurrentState('stretching');
            setTimeout(() => setCurrentState('idle'), 2500);
          } else if (action === 'yawning') {
            setCurrentState('yawning');
            setTimeout(() => setCurrentState('idle'), 3500);
          } else if (action === 'looking') {
            setCurrentState('looking');
            setTimeout(() => setCurrentState('idle'), 2500);
          } else if (action === 'greeting') {
            setCurrentState('greeting');
            setMood('happy');
            setTimeout(() => {
              setCurrentState('idle');
              setMood('neutral');
            }, 2000);
          }
        }
      }
      
      // Schedule next check
      autoActionTimerRef.current = setTimeout(triggerRandomAction, 8000 + Math.random() * 12000);
    };
    
    triggerRandomAction();
    
    return () => {
      if (autoActionTimerRef.current) {
        clearTimeout(autoActionTimerRef.current);
      }
    };
  }, [currentState]);

  const interact = useCallback((action: 'pet' | 'poke' | 'feed' | 'greet' | 'stretch' | 'look') => {
    lastInteractionRef.current = Date.now();
    console.log('[FrogState] Interaction:', action);
    
    switch (action) {
      case 'greet':
        setCurrentState('greeting');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          happiness: Math.min(100, prev.happiness + 8),
        }));
        setTimeout(() => {
          setCurrentState('idle');
          setMood('neutral');
        }, 2500);
        break;
        
      case 'stretch':
        setCurrentState('stretching');
        setStats(prev => ({
          ...prev,
          energy: Math.min(100, prev.energy + 5),
        }));
        setTimeout(() => setCurrentState('idle'), 2500);
        break;
        
      case 'look':
        setCurrentState('looking');
        setTimeout(() => setCurrentState('idle'), 2500);
        break;
        
      case 'pet':
        setCurrentState('happy');
        setMood('happy');
        setStats(prev => ({
          ...prev,
          happiness: Math.min(100, prev.happiness + 10),
          energy: Math.min(100, prev.energy + 2),
        }));
        setTimeout(() => {
          setCurrentState('idle');
        }, 1500);
        break;
        
      case 'poke':
        setCurrentState('scared');
        setMood('sad');
        setStats(prev => ({
          ...prev,
          happiness: Math.max(0, prev.happiness - 6),
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
          hunger: Math.min(100, prev.hunger + 20),
          happiness: Math.min(100, prev.happiness + 3),
        }));
        setTimeout(() => {
          setCurrentState('happy');
          setTimeout(() => setCurrentState('idle'), 1500);
        }, 1800);
        break;
    }
  }, []);

  const setChainEvent = useCallback((event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => {
    lastInteractionRef.current = Date.now();
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
      hunger: Math.max(0, prev.hunger - 20),
    }));
    if (currentState === 'idle') {
      setMood('sad');
    }
  }, [currentState]);

  const setSleepy = useCallback(() => {
    setStats(prev => ({
      ...prev,
      energy: Math.max(0, prev.energy - 20),
    }));
    if (currentState === 'idle') {
      setCurrentState('yawning');
      setTimeout(() => setCurrentState('sleeping'), 3500);
    }
  }, [currentState]);

  const setAngry = useCallback(() => {
    setCurrentState('angry');
    setMood('sad');
    setStats(prev => ({
      ...prev,
      happiness: Math.max(0, prev.happiness - 12),
    }));
    setTimeout(() => setCurrentState('idle'), 3000);
  }, []);

  const restore = useCallback(() => {
    setCurrentState('idle');
    setMood('neutral');
  }, []);

  const triggerAutoAction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    const actions: FrogState[] = ['looking', 'stretching', 'yawning'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    if (action === 'stretching') {
      setCurrentState('stretching');
      setTimeout(() => setCurrentState('idle'), 2500);
    } else if (action === 'yawning') {
      setCurrentState('yawning');
      setTimeout(() => setCurrentState('idle'), 3500);
    } else {
      setCurrentState('looking');
      setTimeout(() => setCurrentState('idle'), 2500);
    }
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
    triggerAutoAction,
  };
}
