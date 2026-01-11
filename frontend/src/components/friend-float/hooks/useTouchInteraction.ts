import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTouchInteractionOptions {
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  longPressDelay?: number;
  doubleTapDelay?: number;
  enabled?: boolean;
}

interface UseTouchInteractionReturn {
  isLongPressing: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
  };
}

/**
 * 触摸交互 Hook
 * 提供长按和双击功能，替代桌面端的悬停和右键
 * 
 * - 长按 500ms: 触发预览（替代 hover）
 * - 双击 300ms: 触发最大化（替代双击）
 */
export function useTouchInteraction({
  onLongPress,
  onDoubleTap,
  longPressDelay = 500,
  doubleTapDelay = 300,
  enabled = true,
}: UseTouchInteractionOptions): UseTouchInteractionReturn {
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  const longPressTimerRef = useRef<number>();
  const lastTapRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
    setIsLongPressing(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;
    
    // 长按计时器
    longPressTimerRef.current = window.setTimeout(() => {
      if (!hasMovedRef.current) {
        setIsLongPressing(true);
        onLongPress?.();
      }
    }, longPressDelay);
  }, [enabled, longPressDelay, onLongPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPress();
    
    if (!enabled || hasMovedRef.current) return;
    
    // 双击检测
    const now = Date.now();
    if (now - lastTapRef.current < doubleTapDelay) {
      onDoubleTap?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [enabled, doubleTapDelay, onDoubleTap, clearLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // 移动超过 10px 视为拖拽，取消长按
    if (dx > 10 || dy > 10) {
      hasMovedRef.current = true;
      clearLongPress();
    }
  }, [clearLongPress]);

  const handleTouchCancel = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  // 清理
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    isLongPressing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      onTouchMove: handleTouchMove,
    },
  };
}

/**
 * 检测是否为触摸设备
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    const check = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };
    check();
    window.addEventListener('touchstart', () => setIsTouchDevice(true), { once: true });
  }, []);
  
  return isTouchDevice;
}
