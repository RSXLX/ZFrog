/**
 * useQuietMode Hook
 * 安静模式管理 - 控制宠物的安静/专注模式
 */

import { useState, useCallback, useEffect } from 'react';

export type QuietModeType = 'normal' | 'focus' | 'sleep' | 'dnd';

export interface QuietModeState {
  mode: QuietModeType;
  isEnabled: boolean;
  startTime: number | null;
  endTime: number | null;
  reason: string;
}

export interface UseQuietModeReturn {
  // 当前状态
  mode: QuietModeType;
  isEnabled: boolean;
  state: QuietModeState;
  
  // 操作方法
  enableQuietMode: (mode?: QuietModeType, duration?: number, reason?: string) => void;
  disableQuietMode: () => void;
  toggleQuietMode: (mode?: QuietModeType) => void;
  
  // 预设模式
  enterFocusMode: (duration?: number) => void;
  enterSleepMode: () => void;
  enterDndMode: (duration?: number) => void;
  
  // 查询
  isQuiet: boolean;
  remainingTime: number | null;
}

const DEFAULT_STATE: QuietModeState = {
  mode: 'normal',
  isEnabled: false,
  startTime: null,
  endTime: null,
  reason: '',
};

export function useQuietMode(): UseQuietModeReturn {
  const [state, setState] = useState<QuietModeState>(DEFAULT_STATE);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // 更新剩余时间
  useEffect(() => {
    if (!state.isEnabled || !state.endTime) {
      setRemainingTime(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = state.endTime! - now;
      
      if (remaining <= 0) {
        disableQuietMode();
        setRemainingTime(null);
      } else {
        setRemainingTime(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isEnabled, state.endTime]);

  const enableQuietMode = useCallback((
    mode: QuietModeType = 'focus',
    duration?: number,
    reason: string = ''
  ) => {
    const now = Date.now();
    setState({
      mode,
      isEnabled: true,
      startTime: now,
      endTime: duration ? now + duration : null,
      reason,
    });
  }, []);

  const disableQuietMode = useCallback(() => {
    setState(DEFAULT_STATE);
    setRemainingTime(null);
  }, []);

  const toggleQuietMode = useCallback((mode?: QuietModeType) => {
    if (state.isEnabled) {
      disableQuietMode();
    } else {
      enableQuietMode(mode || 'focus');
    }
  }, [state.isEnabled, enableQuietMode, disableQuietMode]);

  // 预设模式快捷方法
  const enterFocusMode = useCallback((duration?: number) => {
    enableQuietMode('focus', duration, '专注模式');
  }, [enableQuietMode]);

  const enterSleepMode = useCallback(() => {
    enableQuietMode('sleep', undefined, '睡眠模式');
  }, [enableQuietMode]);

  const enterDndMode = useCallback((duration?: number) => {
    enableQuietMode('dnd', duration, '请勿打扰');
  }, [enableQuietMode]);

  return {
    // 状态
    mode: state.mode,
    isEnabled: state.isEnabled,
    state,
    
    // 操作方法
    enableQuietMode,
    disableQuietMode,
    toggleQuietMode,
    
    // 预设模式
    enterFocusMode,
    enterSleepMode,
    enterDndMode,
    
    // 查询
    isQuiet: state.isEnabled,
    remainingTime,
  };
}

export default useQuietMode;
