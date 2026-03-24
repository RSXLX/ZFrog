import { useCallback, useMemo } from 'react';
import { useQuietModeIntegration } from './useQuietModeIntegration';

export type QuietModeType = 'normal' | 'focus' | 'sleep' | 'dnd';

export interface QuietModeState {
  mode: QuietModeType;
  isEnabled: boolean;
  startTime: number | null;
  endTime: number | null;
  reason: string;
}

export interface UseQuietModeReturn {
  mode: QuietModeType;
  isEnabled: boolean;
  state: QuietModeState;
  enableQuietMode: (mode?: QuietModeType, duration?: number, reason?: string) => void;
  disableQuietMode: () => void;
  toggleQuietMode: (mode?: QuietModeType) => void;
  enterFocusMode: (duration?: number) => void;
  enterSleepMode: () => void;
  enterDndMode: (duration?: number) => void;
  isQuiet: boolean;
  remainingTime: number | null;
}

export function useQuietMode(): UseQuietModeReturn {
  const integration = useQuietModeIntegration();
  const isEnabled = integration.currentMode.type !== 'NORMAL';

  const state = useMemo<QuietModeState>(() => {
    const currentMode = integration.currentMode.type.toLowerCase() as QuietModeType;
    const remaining = integration.focusTimeRemaining;
    return {
      mode: currentMode,
      isEnabled,
      startTime: null,
      endTime: remaining ? Date.now() + remaining * 1000 : null,
      reason: integration.currentMode.description || '',
    };
  }, [integration, isEnabled]);

  const enableQuietMode = useCallback(
    (mode: QuietModeType = 'focus', duration?: number) => {
      if (mode === 'focus') {
        integration.enableFocusMode(duration || 25);
        return;
      }
      if (mode === 'sleep' || mode === 'dnd') {
        integration.enableNightMode();
        return;
      }
      integration.enableNormalMode();
    },
    [integration]
  );

  const disableQuietMode = useCallback(() => {
    integration.enableNormalMode();
  }, [integration]);

  return {
    mode: state.mode,
    isEnabled,
    state,
    enableQuietMode,
    disableQuietMode,
    toggleQuietMode: (mode?: QuietModeType) => {
      if (isEnabled) {
        integration.enableNormalMode();
      } else {
        enableQuietMode(mode || 'focus');
      }
    },
    enterFocusMode: (duration?: number) => {
      integration.enableFocusMode(duration || 25);
    },
    enterSleepMode: () => {
      integration.enableNightMode();
    },
    enterDndMode: (duration?: number) => {
      if (duration && duration > 0) {
        integration.enableFocusMode(duration);
      } else {
        integration.enableNightMode();
      }
    },
    isQuiet: isEnabled,
    remainingTime: integration.focusTimeRemaining ? integration.focusTimeRemaining * 1000 : null,
  };
}

export default useQuietMode;
