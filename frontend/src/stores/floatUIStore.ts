import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DockPosition = 'left' | 'right' | 'top' | 'bottom';

interface FloatUIState {
  // 浮窗 UI 状态
  isExpanded: boolean;
  isMaximized: boolean;
  dockPosition: DockPosition;
  offset: number; // 沿着贴边方向的偏移量 (%)
  size: { width: number; height: number };
  
  // Actions
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleMaximized: () => void;
  setMaximized: (maximized: boolean) => void;
  setDockPosition: (position: DockPosition) => void;
  setOffset: (offset: number) => void;
  setSize: (size: { width: number; height: number }) => void;
}

// 尺寸常量
export const DEFAULT_SIZE = { width: 320, height: 450 };
export const MIN_SIZE = { width: 280, height: 300 };
export const MAX_SIZE = { width: 450, height: 600 };

/**
 * 浮窗 UI 状态 Store
 * 只负责 UI 相关状态，持久化到 localStorage
 */
export const useFloatUIStore = create<FloatUIState>()(
  persist(
    (set) => ({
      // 初始状态
      isExpanded: false,
      isMaximized: false,
      dockPosition: 'right',
      offset: 50, // 中间位置
      size: DEFAULT_SIZE,

      // Actions
      toggleExpanded: () => set((state) => ({ 
        isExpanded: !state.isExpanded,
        isMaximized: false // 展开/收起时取消最大化
      })),
      
      setExpanded: (expanded) => set({ isExpanded: expanded, isMaximized: false }),
      
      toggleMaximized: () => set((state) => ({ 
        isMaximized: !state.isMaximized,
        isExpanded: true // 最大化时保持展开
      })),
      
      setMaximized: (maximized) => set({ isMaximized: maximized, isExpanded: true }),
      
      setDockPosition: (position) => set({ dockPosition: position }),
      
      setOffset: (offset) => set({ offset: Math.max(0, Math.min(100, offset)) }),
      
      setSize: (size) => set({ 
        size: {
          width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, size.width)),
          height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, size.height))
        }
      }),
    }),
    {
      name: 'float-ui-storage',
      partialize: (state) => ({
        dockPosition: state.dockPosition,
        offset: state.offset,
        size: state.size,
      }),
    }
  )
);
