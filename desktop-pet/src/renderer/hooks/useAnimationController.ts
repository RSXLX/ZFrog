import { useState, useCallback } from 'react';

export type AnimationType = 
  | 'idle' | 'breathing' | 'blinking'
  | 'eating' | 'drinking'
  | 'happy' | 'excited' | 'sad' | 'crying'
  | 'angry' | 'scared' | 'surprised'
  | 'sleeping' | 'yawning' | 'stretching'
  | 'thinking' | 'confused' | 'love'
  | 'dancing' | 'jumping' | 'walking'
  | 'greeting' | 'waving' | 'bowing'
  | 'glowing' | 'shaking' | 'spinning';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  loop: boolean;
  speed: number;
}

const animationConfigs: Record<AnimationType, AnimationConfig> = {
  idle: { type: 'idle', duration: 4000, loop: true, speed: 1 },
  breathing: { type: 'breathing', duration: 3000, loop: true, speed: 1 },
  blinking: { type: 'blinking', duration: 200, loop: false, speed: 1 },
  eating: { type: 'eating', duration: 2000, loop: true, speed: 1 },
  drinking: { type: 'drinking', duration: 1500, loop: true, speed: 1 },
  happy: { type: 'happy', duration: 1500, loop: false, speed: 1.5 },
  excited: { type: 'excited', duration: 2000, loop: false, speed: 2 },
  sad: { type: 'sad', duration: 3000, loop: false, speed: 1 },
  crying: { type: 'crying', duration: 5000, loop: true, speed: 1 },
  angry: { type: 'angry', duration: 2000, loop: false, speed: 1 },
  scared: { type: 'scared', duration: 1000, loop: false, speed: 2 },
  surprised: { type: 'surprised', duration: 1500, loop: false, speed: 1 },
  sleeping: { type: 'sleeping', duration: 10000, loop: true, speed: 0.5 },
  yawning: { type: 'yawning', duration: 2500, loop: false, speed: 1 },
  stretching: { type: 'stretching', duration: 2000, loop: false, speed: 1 },
  thinking: { type: 'thinking', duration: 3000, loop: true, speed: 1 },
  confused: { type: 'confused', duration: 2000, loop: false, speed: 1 },
  love: { type: 'love', duration: 2000, loop: true, speed: 1.5 },
  dancing: { type: 'dancing', duration: 3000, loop: true, speed: 2 },
  jumping: { type: 'jumping', duration: 1000, loop: false, speed: 1.5 },
  walking: { type: 'walking', duration: 800, loop: true, speed: 1 },
  greeting: { type: 'greeting', duration: 1500, loop: false, speed: 1 },
  waving: { type: 'waving', duration: 2000, loop: true, speed: 1.5 },
  bowing: { type: 'bowing', duration: 1500, loop: false, speed: 1 },
  glowing: { type: 'glowing', duration: 3000, loop: true, speed: 1 },
  shaking: { type: 'shaking', duration: 500, loop: false, speed: 3 },
  spinning: { type: 'spinning', duration: 1000, loop: false, speed: 2 },
};

export function useAnimationController() {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('idle');
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const play = useCallback((type: AnimationType) => {
    const config = animationConfigs[type];
    setCurrentAnimation(type);
    setIsPlaying(true);
    return config;
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const getConfig = useCallback((type: AnimationType): AnimationConfig => {
    return animationConfigs[type] || animationConfigs.idle;
  }, []);

  return {
    currentAnimation,
    isPlaying,
    speed,
    setSpeed,
    play,
    stop,
    resume,
    getConfig,
    animationConfigs,
  };
}
