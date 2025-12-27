/**
 * 旅行动画状态管理 Hook
 * 管理青蛙旅行的完整动画生命周期
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TravelAnimationPhase } from '../components/frog/TravelAnimation';

interface TravelAnimationState {
  phase: TravelAnimationPhase;
  destinationChain: string;
  progress: number;
  souvenirEmoji: string;
  isAnimating: boolean;
  travelId?: number;
}

interface UseTravelAnimationOptions {
  /** 自动播放出发动画的延迟（毫秒） */
  autoPlayDelay?: number;
  /** 各阶段持续时间（毫秒） */
  phaseDurations?: {
    preparing: number;
    departing: number;
    returning: number;
    arrived: number;
    writing: number;
  };
}

const DEFAULT_DURATIONS = {
  preparing: 2000,
  departing: 2500,
  returning: 2000,
  arrived: 3000,
  writing: 4000,
};

export function useTravelAnimation(options: UseTravelAnimationOptions = {}) {
  const { 
    autoPlayDelay = 500,
    phaseDurations = DEFAULT_DURATIONS 
  } = options;

  const [state, setState] = useState<TravelAnimationState>({
    phase: 'idle',
    destinationChain: 'ethereum',
    progress: 0,
    souvenirEmoji: '🎁',
    isAnimating: false,
  });

  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeout = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  const cleanup = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (phaseTimeout.current) {
      clearTimeout(phaseTimeout.current);
      phaseTimeout.current = null;
    }
  }, []);

  // 开始旅行动画（出发序列）
  const startDepartureAnimation = useCallback((
    destinationChain: string = 'ethereum',
    travelId?: number
  ) => {
    cleanup();
    
    setState(prev => ({
      ...prev,
      phase: 'preparing',
      destinationChain,
      progress: 0,
      isAnimating: true,
      travelId,
    }));

    // 准备 -> 出发
    phaseTimeout.current = setTimeout(() => {
      setState(prev => ({ ...prev, phase: 'departing' }));
      
      // 出发 -> 旅途
      phaseTimeout.current = setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'traveling' }));
      }, phaseDurations.departing);
    }, phaseDurations.preparing);
  }, [cleanup, phaseDurations]);

  // 开始归来动画
  const startReturnAnimation = useCallback((
    souvenirEmoji: string = '🎁'
  ) => {
    cleanup();
    
    setState(prev => ({
      ...prev,
      phase: 'returning',
      souvenirEmoji,
      progress: 100,
      isAnimating: true,
    }));

    // 归来 -> 到达
    phaseTimeout.current = setTimeout(() => {
      setState(prev => ({ ...prev, phase: 'arrived' }));
      
      // 到达 -> 写日记
      phaseTimeout.current = setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'writing' }));
        
        // 写日记 -> 完成
        phaseTimeout.current = setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            phase: 'idle',
            isAnimating: false 
          }));
        }, phaseDurations.writing);
      }, phaseDurations.arrived);
    }, phaseDurations.returning);
  }, [cleanup, phaseDurations]);

  // 更新旅途进度
  const updateProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  // 模拟旅途进度
  const simulateTravelProgress = useCallback((
    durationMs: number,
    onComplete?: () => void
  ) => {
    cleanup();
    
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    progressInterval.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = (elapsed / durationMs) * 100;
      
      if (progress >= 100) {
        cleanup();
        updateProgress(100);
        onComplete?.();
      } else {
        updateProgress(progress);
      }
    }, 100);
  }, [cleanup, updateProgress]);

  // 直接设置阶段
  const setPhase = useCallback((phase: TravelAnimationPhase) => {
    cleanup();
    setState(prev => ({
      ...prev,
      phase,
      isAnimating: phase !== 'idle',
    }));
  }, [cleanup]);

  // 重置动画
  const resetAnimation = useCallback(() => {
    cleanup();
    setState({
      phase: 'idle',
      destinationChain: 'ethereum',
      progress: 0,
      souvenirEmoji: '🎁',
      isAnimating: false,
    });
  }, [cleanup]);

  // 完整的旅行动画流程
  const playFullTravelAnimation = useCallback(async (
    destinationChain: string,
    travelDurationMs: number,
    souvenirEmoji: string = '🎁'
  ): Promise<void> => {
    return new Promise((resolve) => {
      // 1. 开始出发动画
      startDepartureAnimation(destinationChain);
      
      // 2. 等待出发动画完成后开始模拟进度
      const departDelay = phaseDurations.preparing + phaseDurations.departing;
      
      setTimeout(() => {
        // 3. 模拟旅途进度
        simulateTravelProgress(travelDurationMs, () => {
          // 4. 开始归来动画
          startReturnAnimation(souvenirEmoji);
          
          // 5. 等待所有动画完成
          const returnDelay = 
            phaseDurations.returning + 
            phaseDurations.arrived + 
            phaseDurations.writing;
          
          setTimeout(resolve, returnDelay);
        });
      }, departDelay);
    });
  }, [
    startDepartureAnimation, 
    simulateTravelProgress, 
    startReturnAnimation, 
    phaseDurations
  ]);

  // 清理
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // 状态
    phase: state.phase,
    destinationChain: state.destinationChain,
    progress: state.progress,
    souvenirEmoji: state.souvenirEmoji,
    isAnimating: state.isAnimating,
    travelId: state.travelId,
    
    // 方法
    startDepartureAnimation,
    startReturnAnimation,
    updateProgress,
    simulateTravelProgress,
    setPhase,
    resetAnimation,
    playFullTravelAnimation,
  };
}

export default useTravelAnimation;
