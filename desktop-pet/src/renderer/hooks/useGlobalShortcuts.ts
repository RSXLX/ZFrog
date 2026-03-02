import { useEffect, useCallback } from 'react';

// Global keyboard shortcuts
export function useGlobalShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = [
        e.ctrlKey && 'Ctrl',
        e.shiftKey && 'Shift',
        e.altKey && 'Alt',
        e.key.toUpperCase()
      ].filter(Boolean).join('+');

      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

// Shortcut hints
export const SHORTCUTS = [
  { key: 'P', description: '巡逻' },
  { key: 'S', description: '睡觉' },
  { key: 'F', description: '喂食' },
  { key: 'M', description: '菜单' },
  { key: 'H', description: '隐藏' },
];
