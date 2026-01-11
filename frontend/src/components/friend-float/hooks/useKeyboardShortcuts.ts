import { useEffect, useCallback } from 'react';

interface UseKeyboardShortcutsOptions {
  isExpanded: boolean;
  isMaximized: boolean;
  onToggleExpand: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onChangeDock?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  enabled?: boolean;
}

/**
 * 键盘快捷键 Hook
 * 
 * 快捷键：
 * - Alt + F: 切换展开/收起
 * - Alt + M: 切换最大化
 * - Esc: 收起浮窗（仅展开时）
 * - Alt + 方向键: 切换贴边方向
 */
export function useKeyboardShortcuts({
  isExpanded,
  isMaximized,
  onToggleExpand,
  onToggleMaximize,
  onClose,
  onChangeDock,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Alt + F: 切换展开/收起
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      onToggleExpand();
      return;
    }
    
    // Alt + M: 切换最大化
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      if (isExpanded) {
        onToggleMaximize();
      }
      return;
    }
    
    // Esc: 收起浮窗
    if (e.key === 'Escape' && isExpanded && !isMaximized) {
      e.preventDefault();
      onClose();
      return;
    }
    
    // Esc in maximized: 退出最大化
    if (e.key === 'Escape' && isMaximized) {
      e.preventDefault();
      onToggleMaximize();
      return;
    }
    
    // Alt + 方向键: 切换贴边方向
    if (e.altKey && isExpanded && !isMaximized && onChangeDock) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onChangeDock('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onChangeDock('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onChangeDock('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onChangeDock('right');
          break;
      }
    }
  }, [enabled, isExpanded, isMaximized, onToggleExpand, onToggleMaximize, onClose, onChangeDock]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
