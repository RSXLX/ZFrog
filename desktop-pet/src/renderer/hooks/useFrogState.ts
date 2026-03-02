import { useState, useCallback, useEffect, useRef } from 'react';

type FrogState = 'idle' | 'sleeping' | 'eating' | 'happy' | 'excited' | 'scared' | 'dancing' | 'crying' | 'traveling' | 'thinking' | 'angry' | 'greeting' | 'stretching' | 'yawning' | 'looking' | 'walking' | 'patrolling';
type FrogMood = 'very_happy' | 'happy' | 'neutral' | 'sad' | 'very_sad';

export interface FrogStats {
  hunger: number;
  energy: number;
  happiness: number;
}

export interface UseFrogStateReturn {
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
  startPatrol: () => void;
  stopPatrol: () => void;
  position: { x: number; y: number };
  setPosition: (x: number, y: number) => void;
}

export function useFrogState(): UseFrogStateReturn {
  const [currentState, setCurrentState] = useState<FrogState>('idle');
  const [mood, setMood] = useState<FrogMood>('neutral');
  const [stats, setStats] = useState<FrogStats>({
    hunger: 70,
    energy: 80,
    happiness: 60,
  });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isPatrolling, setIsPatrolling] = useState(false);
  
  const autoActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const patrolTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  // Desktop patrol logic
  const startPatrol = useCallback(() => {
    if (isPatrolling) return;
    setIsPatrolling(true);
    setCurrentState('walking');
    
    const patrol = () => {
      // Random movement within screen bounds
      const screenWidth = window.innerWidth - 220;
      const screenHeight = window.innerHeight - 240;
      
      const newX = Math.random() * screenWidth;
      const newY = Math.random() * screenHeight;
      
      setPosition({ x: newX, y: newY });
      
      // Move window
      window.electronAPI?.moveWindow(newX, newY);
    };
    
    // Patrol every 5-10 seconds
    patrolTimerRef.current = setInterval(patrol, 5000 + Math.random() * 5000);
  }, [isPatrolling]);

  const stopPatrol = useCallback(() => {
    setIsPatrolling(false);
    if (patrolTimerRef.current) {
      clearInterval(patrolTimerRef.current);
      patrolTimerRef.current = null;
    }
    if (currentState === 'walking') {
      setCurrentState('idle');
    }
  }, [currentState]);

  // Random auto actions when idle
  useEffect(() => {
    const triggerRandomAction = () => {
      const now = Date.now();
      const idleTime = now - lastInteractionRef.current;
      
      if (idleTime > 15000 && currentState === 'idle' && !isPatrolling) {
        const random = Math.random();
        
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
        
        // 20% chance to start patrolling
        if (random > 0.7) {
          startPatrol();
        }
      }
      
      autoActionTimerRef.current = setTimeout(triggerRandomAction, 8000 + Math.random() * 12000);
    };
    
    triggerRandomAction();
    
    return () => {
      if (autoActionTimerRef.current) {
        clearTimeout(autoActionTimerRef.current);
      }
    };
  }, [currentState, isPatrolling, startPatrol]);

  // Stop patrolling on user interaction
  useEffect(() => {
    if (isPatrolling && currentState !== 'walking') {
      stopPatrol();
    }
  }, [currentState, isPatrolling, stopPatrol]);

  const interact = useCallback((action: 'pet' | 'poke' | 'feed' | 'greet' | 'stretch' | 'look') => {
    lastInteractionRef.current = Date.now();
    
    // Stop patrolling on interaction
    if (isPatrolling) {
      stopPatrol();
    }
    
    switch (action) {
      case 'greet':
        setCurrentState('greeting');
        setMood('happy');
        setStats(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 8) }));
        setTimeout(() => { setCurrentState('idle'); setMood('neutral'); }, 2500);
        break;
      case 'stretch':
        setCurrentState('stretching');
        setStats(prev => ({ ...prev, energy: Math.min(100, prev.energy + 5) }));
        setTimeout(() => setCurrentState('idle'), 2500);
        break;
      case 'look':
        setCurrentState('looking');
        setTimeout(() => setCurrentState('idle'), 2500);
        break;
      case 'pet':
        setCurrentState('happy');
        setMood('happy');
        setStats(prev => ({ ...prev, happiness: Math.min(100, prev.happiness + 10), energy: Math.min(100, prev.energy + 2) }));
        setTimeout(() => setCurrentState('idle'), 1500);
        break;
      case 'poke':
        setCurrentState('scared');
        setMood('sad');
        setStats(prev => ({ ...prev, happiness: Math.max(0, prev.happiness - 6) }));
        setTimeout(() => { setCurrentState('idle'); setMood('neutral'); }, 1200);
        break;
      case 'feed':
        setCurrentState('eating');
        setMood('happy');
        setStats(prev => ({ ...prev, hunger: Math.min(100, prev.hunger + 20), happiness: Math.min(100, prev.happiness + 3) }));
        setTimeout(() => { setCurrentState('happy'); setTimeout(() => setCurrentState('idle'), 1500); }, 1800);
        break;
    }
  }, [isPatrolling, stopPatrol]);

  const setChainEvent = useCallback((event: 'large_buy' | 'large_sell' | 'price_up' | 'price_down') => {
    lastInteractionRef.current = Date.now();
    if (isPatrolling) stopPatrol();
    
    switch (event) {
      case 'large_buy':
      case 'price_up':
        setCurrentState('excited');
        setMood('very_happy');
        setTimeout(() => { setCurrentState('dancing'); setTimeout(() => { setCurrentState('happy'); setTimeout(() => setCurrentState('idle'), 3000); }, 4000); }, 3000);
        break;
      case 'large_sell':
      case 'price_down':
        setCurrentState('scared');
        setMood('very_sad');
        setTimeout(() => { setCurrentState('crying'); setTimeout(() => { setCurrentState('sad'); setTimeout(() => setCurrentState('idle'), 4000); }, 3000); }, 2000);
        break;
    }
  }, [isPatrolling, stopPatrol]);

  const setHungry = useCallback(() => {
    setStats(prev => ({ ...prev, hunger: Math.max(0, prev.hunger - 20) }));
    if (currentState === 'idle') setMood('sad');
  }, [currentState]);

  const setSleepy = useCallback(() => {
    setStats(prev => ({ ...prev, energy: Math.max(0, prev.energy - 20) }));
    if (currentState === 'idle') { setCurrentState('yawning'); setTimeout(() => setCurrentState('sleeping'), 3500); }
  }, [currentState]);

  const setAngry = useCallback(() => {
    if (isPatrolling) stopPatrol();
    setCurrentState('angry');
    setMood('sad');
    setStats(prev => ({ ...prev, happiness: Math.max(0, prev.happiness - 12) }));
    setTimeout(() => setCurrentState('idle'), 3000);
  }, [isPatrolling, stopPatrol]);

  const restore = useCallback(() => {
    setCurrentState('idle');
    setMood('neutral');
  }, []);

  const triggerAutoAction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (isPatrolling) { stopPatrol(); return; }
    
    const actions: FrogState[] = ['looking', 'stretching', 'yawning'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    if (action === 'stretching') { setCurrentState('stretching'); setTimeout(() => setCurrentState('idle'), 2500); }
    else if (action === 'yawning') { setCurrentState('yawning'); setTimeout(() => setCurrentState('idle'), 3500); }
    else { setCurrentState('looking'); setTimeout(() => setCurrentState('idle'), 2500); }
  }, [isPatrolling, stopPatrol]);

  return {
    currentState, mood, stats, setStats, interact, setChainEvent,
    setMood, setCurrentState, setHungry, setSleepy, setAngry, restore,
    triggerAutoAction, startPatrol, stopPatrol, position, setPosition
  };
}
