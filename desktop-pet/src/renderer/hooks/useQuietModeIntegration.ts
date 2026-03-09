/**
 * Quiet Mode Integration Hook
 * Integrates new quiet mode system with existing app state
 */

import { useState, useEffect, useCallback } from 'react';
import {
  QuietModeType,
  QuietModeConfig,
  quietModeManager,
  BehaviorConfig,
} from '../../../config/quietMode';

interface UseQuietModeIntegrationReturn {
  // Current state
  currentMode: QuietModeConfig;
  isFocusMode: boolean;
  focusTimeRemaining: number | null;
  behavior: BehaviorConfig;
  
  // Time checks
  isWorkHours: boolean;
  isNightTime: boolean;
  
  // Actions
  setMode: (type: QuietModeType, customConfig?: Partial<QuietModeConfig>) => void;
  enableNormalMode: () => void;
  enableWorkHoursMode: () => void;
  enableNightMode: () => void;
  enableFocusMode: (duration?: number) => void;
  cancelFocusMode: () => void;
  
  // Frog state helper
  shouldShowAnimations: boolean;
  shouldPlaySounds: boolean;
  shouldShowNotifications: boolean;
  shouldAllowInteraction: boolean;
  getFrogStateForBehavior: () => string;
}

export function useQuietModeIntegration(): UseQuietModeIntegrationReturn {
  // Subscribe to quiet mode manager state
  const [currentMode, setCurrentMode] = useState<QuietModeConfig>(
    quietModeManager.getCurrentMode()
  );
  
  const [focusTimeRemaining, setFocusTimeRemaining] = useState<number | null>(null);
  const [isWorkHours, setIsWorkHours] = useState(false);
  const [isNightTime, setIsNightTime] = useState(false);
  
  // Subscribe to manager updates
  useEffect(() => {
    const unsubscribe = quietModeManager.addListener((mode) => {
      setCurrentMode(mode);
      
      // Update focus timer if in focus mode
      if (mode.type === QuietModeType.FOCUS && mode.duration) {
        setFocusTimeRemaining(mode.duration * 60);
      } else {
        setFocusTimeRemaining(null);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Time checker
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // Work hours: 9-18
      setIsWorkHours(currentTime >= '09:00' && currentTime <= '18:00');
      
      // Night: 22-8
      setIsNightTime(currentTime >= '22:00' || currentTime <= '08:00');
    };
    
    checkTime();
    const timer = setInterval(checkTime, 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Actions
  const setMode = useCallback((type: QuietModeType, customConfig?: Partial<QuietModeConfig>) => {
    quietModeManager.setMode(type, customConfig);
  }, []);
  
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
  
  const cancelFocusMode = useCallback(() => {
    quietModeManager.setMode(QuietModeType.NORMAL);
  }, []);
  
  // Helper functions for frog behavior
  const shouldShowAnimations = currentMode.behavior.showAnimations;
  const shouldPlaySounds = currentMode.behavior.playSounds;
  const shouldShowNotifications = currentMode.behavior.showNotifications;
  const shouldAllowInteraction = currentMode.behavior.allowInteraction;
  
  const getFrogStateForBehavior = () => {
    return currentMode.behavior.frogState;
  };
  
  return {
    currentMode,
    isFocusMode: currentMode.type === QuietModeType.FOCUS,
    focusTimeRemaining,
    behavior: currentMode.behavior,
    isWorkHours,
    isNightTime,
    setMode,
    enableNormalMode,
    enableWorkHoursMode,
    enableNightMode,
    enableFocusMode,
    cancelFocusMode,
    shouldShowAnimations,
    shouldPlaySounds,
    shouldShowNotifications,
    shouldAllowInteraction,
    getFrogStateForBehavior,
  };
}

export default useQuietModeIntegration;
