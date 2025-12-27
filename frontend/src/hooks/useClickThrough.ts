/**
 * 桌面宠物点击穿透 Hook
 * 
 * 实现逻辑：
 * - 当鼠标在青蛙 SVG 上时：禁用点击穿透（可以交互）
 * - 当鼠标在透明区域时：启用点击穿透（鼠标穿过窗口）
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  isTauriEnvironment, 
  setClickThrough, 
  checkClickThroughSupport 
} from '../utils/tauriNative';

interface UseClickThroughOptions {
  /** 是否启用点击穿透功能 */
  enabled?: boolean;
  /** 防抖延迟（毫秒） */
  debounceMs?: number;
}

interface UseClickThroughReturn {
  /** 是否在 Tauri 环境中 */
  isTauri: boolean;
  /** 是否支持点击穿透 */
  isSupported: boolean;
  /** 当前点击穿透状态 */
  isClickThrough: boolean;
  /** 处理鼠标进入 SVG 区域 */
  handleMouseEnterFrog: () => void;
  /** 处理鼠标离开 SVG 区域 */
  handleMouseLeaveFrog: () => void;
  /** 手动设置点击穿透状态 */
  setClickThroughState: (enabled: boolean) => Promise<void>;
}

export function useClickThrough(
  options: UseClickThroughOptions = {}
): UseClickThroughReturn {
  const { enabled = true, debounceMs = 50 } = options;
  
  const [isTauri, setIsTauri] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastState = useRef<boolean | null>(null);

  // 初始化检测
  useEffect(() => {
    const init = async () => {
      const tauri = isTauriEnvironment();
      setIsTauri(tauri);
      
      if (tauri) {
        const supported = await checkClickThroughSupport();
        setIsSupported(supported);
        
        // 默认启用点击穿透（让透明区域可穿透）
        if (supported && enabled) {
          await setClickThrough(true);
          setIsClickThrough(true);
        }
      }
    };
    
    init();
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [enabled]);

  // 防抖设置点击穿透
  const debouncedSetClickThrough = useCallback(async (value: boolean) => {
    // 避免重复设置相同状态
    if (lastState.current === value) return;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(async () => {
      try {
        await setClickThrough(value);
        lastState.current = value;
        setIsClickThrough(value);
      } catch (error) {
        console.error('Failed to set click-through:', error);
      }
    }, debounceMs);
  }, [debounceMs]);

  // 鼠标进入青蛙区域 - 禁用点击穿透以允许交互
  const handleMouseEnterFrog = useCallback(() => {
    if (!isSupported || !enabled) return;
    debouncedSetClickThrough(false);
  }, [isSupported, enabled, debouncedSetClickThrough]);

  // 鼠标离开青蛙区域 - 启用点击穿透
  const handleMouseLeaveFrog = useCallback(() => {
    if (!isSupported || !enabled) return;
    debouncedSetClickThrough(true);
  }, [isSupported, enabled, debouncedSetClickThrough]);

  // 手动设置
  const setClickThroughState = useCallback(async (value: boolean) => {
    if (!isSupported) return;
    try {
      await setClickThrough(value);
      lastState.current = value;
      setIsClickThrough(value);
    } catch (error) {
      console.error('Failed to set click-through:', error);
    }
  }, [isSupported]);

  return {
    isTauri,
    isSupported,
    isClickThrough,
    handleMouseEnterFrog,
    handleMouseLeaveFrog,
    setClickThroughState,
  };
}
