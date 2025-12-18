import { useState, useEffect, useCallback } from 'react';
import { 
  FrogState, 
  FrogMood, 
  FrogAnimationState,
  AnimationConfig 
} from '../types/frogAnimation';
import { ANIMATION_CONFIGS } from '../config/animations';

const INITIAL_STATE: FrogAnimationState = {
  currentState: FrogState.IDLE,
  mood: FrogMood.NEUTRAL,
  energy: 80,
  hunger: 50,
  happiness: 70,
  lastInteraction: Date.now(),
  position: { x: 0, y: 0 },
  direction: 'right',
};

export function useFrogState(initialState: FrogState = FrogState.IDLE) {
  const [state, setState] = useState<FrogAnimationState>({
    ...INITIAL_STATE,
    currentState: initialState,
  });

  // 更新青蛙状态
  const setFrogState = useCallback((newState: FrogState) => {
    setState(prev => ({
      ...prev,
      currentState: newState,
      lastInteraction: Date.now(),
    }));
  }, []);

  // 更新心情
  const setMood = useCallback((newMood: FrogMood) => {
    setState(prev => ({
      ...prev,
      mood: newMood,
    }));
  }, []);

  // 更新精力值
  const updateEnergy = useCallback((delta: number) => {
    setState(prev => ({
      ...prev,
      energy: Math.max(0, Math.min(100, prev.energy + delta)),
    }));
  }, []);

  // 更新饥饿值
  const updateHunger = useCallback((delta: number) => {
    setState(prev => ({
      ...prev,
      hunger: Math.max(0, Math.min(100, prev.hunger + delta)),
    }));
  }, []);

  // 更新快乐值
  const updateHappiness = useCallback((delta: number) => {
    setState(prev => ({
      ...prev,
      happiness: Math.max(0, Math.min(100, prev.happiness + delta)),
    }));
  }, []);

  // 更新位置
  const setPosition = useCallback((newPosition: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      position: newPosition,
    }));
  }, []);

  // 更新方向
  const setDirection = useCallback((newDirection: 'left' | 'right') => {
    setState(prev => ({
      ...prev,
      direction: newDirection,
    }));
  }, []);

  // 随时间自动变化
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        let newState = { ...prev };
        
        // 饥饿值随时间增加
        newState.hunger = Math.min(100, prev.hunger + 1);
        
        // 精力值随时间缓慢恢复
        if (prev.currentState === FrogState.SLEEPING) {
          newState.energy = Math.min(100, prev.energy + 2);
        } else {
          newState.energy = Math.max(0, prev.energy - 0.5);
        }
        
        // 根据状态更新心情
        if (prev.hunger > 80) {
          newState.mood = FrogMood.VERY_SAD;
        } else if (prev.hunger > 60) {
          newState.mood = FrogMood.SAD;
        } else if (prev.energy < 20) {
          newState.mood = FrogMood.SAD;
        } else if (prev.happiness > 80) {
          newState.mood = FrogMood.VERY_HAPPY;
        } else if (prev.happiness > 60) {
          newState.mood = FrogMood.HAPPY;
        } else {
          newState.mood = FrogMood.NEUTRAL;
        }
        
        // 自动状态切换
        if (prev.energy < 20 && prev.currentState !== FrogState.SLEEPING) {
          newState.currentState = FrogState.SLEEPING;
        } else if (prev.energy > 80 && prev.currentState === FrogState.SLEEPING) {
          newState.currentState = FrogState.IDLE;
        }
        
        return newState;
      });
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 获取当前动画配置
  const getCurrentAnimationConfig = useCallback((): AnimationConfig => {
    return ANIMATION_CONFIGS[state.currentState] || ANIMATION_CONFIGS[FrogState.IDLE];
  }, [state.currentState]);

  // 喂食
  const feed = useCallback((foodEnergy: number, foodHappiness: number) => {
    setState(prev => ({
      ...prev,
      hunger: Math.max(0, prev.hunger - foodEnergy),
      happiness: Math.min(100, prev.happiness + foodHappiness),
      lastInteraction: Date.now(),
      currentState: FrogState.EATING,
    }));
    
    // 3秒后恢复之前的状态
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentState: FrogState.IDLE,
      }));
    }, 3000);
  }, []);

  // 互动
  const interact = useCallback((type: 'pet' | 'play' | 'talk') => {
    setState(prev => {
      let newState = { ...prev };
      
      switch (type) {
        case 'pet':
          newState.happiness = Math.min(100, prev.happiness + 5);
          newState.currentState = FrogState.HAPPY;
          break;
        case 'play':
          newState.energy = Math.max(0, prev.energy - 10);
          newState.happiness = Math.min(100, prev.happiness + 10);
          newState.currentState = FrogState.JUMPING;
          break;
        case 'talk':
          newState.currentState = FrogState.THINKING;
          break;
      }
      
      newState.lastInteraction = Date.now();
      return newState;
    });
    
    // 3秒后恢复之前的状态
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentState: FrogState.IDLE,
      }));
    }, 3000);
  }, []);

  return {
    state,
    setState: setFrogState,
    setMood,
    updateEnergy,
    updateHunger,
    updateHappiness,
    setPosition,
    setDirection,
    getCurrentAnimationConfig,
    feed,
    interact,
  };
}