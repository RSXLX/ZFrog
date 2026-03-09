/**
 * 安静模式 Hook
 * 管理青蛙的安静模式状态和行为
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QuietModeType,
  QuietModeConfig,
  quietModeManager,
} from '../config/quietMode';

// Hook 返回类型
interface UseQuietModeReturn {
  // 当前模式
  currentMode: QuietModeConfig;
  
  // 设置模式
  setMode: (type: QuietModeType, customConfig?: Partial<QuietModeConfig>) => void;
  
  // 快捷操作
  enableNormalMode: () => void;
  enableWorkHoursMode: () => void;
  enableNightMode: () => void;
  enableFocusMode: (duration?: number) => void;
  enableCustomMode: (config: Partial<QuietModeConfig>) => void;
  
  // 专注模式控制
  isFocusMode: boolean;
  focusTimeRemaining: number | null; // 秒
  cancelFocusMode: () => void;
  
  // 当前行为配置
  behavior: {
    showAnimations: boolean;
    playSounds: boolean;
    showNotifications: boolean;
    allowInteraction: boolean;
    frogState: string;
  };
  
  // 时间检查
  isWorkHours: boolean;
  isNightTime: boolean;
}

export function useQuietMode(): UseQuietModeReturn {
  // 当前模式状态
  const [currentMode, setCurrentModeState] = useState<QuietModeConfig>(
    quietModeManager.getCurrentMode()
  );
  
  // 专注模式计时
  const [focusTimeRemaining, setFocusTimeRemaining] = useState<number | null>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 时间状态
  const [isWorkHours, setIsWorkHours] = useState(false);
  const [isNightTime, setIsNightTime] = useState(false);
  
  // 订阅模式变化
  useEffect(() => {
    const unsubscribe = quietModeManager.addListener((mode) => {
      setCurrentModeState(mode);
      
      // 如果是专注模式，启动计时器
      if (mode.type === QuietModeType.FOCUS && mode.duration) {
        startFocusTimer(mode.duration * 60); // 转换为秒
      }
    });
    
    return unsubscribe;
  }, []);
  
  // 启动专注计时器
  const startFocusTimer = useCallback((seconds: number) => {
    // 清除现有计时器
    if (focusTimerRef.current) {
      clearInterval(focusTimerRef.current);
    }
    
    setFocusTimeRemaining(seconds);
    
    // 启动倒计时
    focusTimerRef.current = setInterval(() => {
      setFocusTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // 计时结束
          if (focusTimerRef.current) {
            clearInterval(focusTimerRef.current);
            focusTimerRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);
  
  // 取消专注模式
  const cancelFocusMode = useCallback(() => {
    if (focusTimerRef.current) {
      clearInterval(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    setFocusTimeRemaining(null);
    quietModeManager.setMode(QuietModeType.NORMAL);
  }, []);
  
  // 时间检查器
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // 检查工作时间 (9:00 - 18:00)
      setIsWorkHours(currentTime >= '09:00' && currentTime <= '18:00');
      
      // 检查夜间时间 (22:00 - 08:00)
      setIsNightTime(currentTime >= '22:00' || currentTime <= '08:00');
    };
    
    // 立即检查一次
    checkTime();
    
    // 每分钟检查一次
    const timer = setInterval(checkTime, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 设置模式
  const setMode = useCallback((type: QuietModeType, customConfig?: Partial<QuietModeConfig>) => {
    quietModeManager.setMode(type, customConfig);
  }, []);
  
  // 快捷操作
  const enableNormalMode = useCallback(() => {
    quietModeManager.setMode(QuietModeType.NORMAL);
  }, []);
  
  const enableWorkHoursMode = useCallback(() => {
    quietModeManager.setMode(QuietModeType.WORK_HOURS);
  }, []);
  
  const enableNightMode = useCallback(() => {
    quietModeManager.setMode(QuietModeType.NIGHT);
  }, []);
  
  const enableFocusMode = useCallback((duration: number = 25) => {
    quietModeManager.setMode(QuietModeType.FOCUS, { duration });
  }, []);
  
  const enableCustomMode = useCallback((config: Partial<QuietModeConfig>) => {
    quietModeManager.setMode(QuietModeType.CUSTOM, config);
  }, []);
  
  // 计算当前行为配置
  const behavior = {
    showAnimations: currentMode.behavior.showAnimations,
    playSounds: currentMode.behavior.playSounds,
    showNotifications: currentMode.behavior.showNotifications,
    allowInteraction: currentMode.behavior.allowInteraction,
    frogState: currentMode.behavior.frogState,
  };
  
  return {
    currentMode,
    setMode,
    enableNormalMode,
    enableWorkHoursMode,
    enableNightMode,
    enableFocusMode,
    enableCustomMode,
    isFocusMode: currentMode.type === QuietModeType.FOCUS,
    focusTimeRemaining,
    cancelFocusMode,
    behavior,
    isWorkHours,
    isNightTime,
  };
}

export default useQuietMode;
