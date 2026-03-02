import { useState, useEffect, useCallback } from 'react';

export interface Widget {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

const defaultWidgets: Widget[] = [
  { id: 'clock', name: '时钟', icon: '🕐', enabled: true },
  { id: 'weather', name: '天气', icon: '🌤️', enabled: true },
  { id: 'calendar', name: '日历', icon: '📅', enabled: false },
  { id: 'notes', name: '备忘录', icon: '📝', enabled: false },
  { id: 'calculator', name: '计算器', icon: '🧮', enabled: false },
];

export function useWidget() {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_widgets');
      if (saved) setWidgets(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load widgets:', e);
    }
  }, []);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem('zfrog_widgets', JSON.stringify(widgets));
    } catch (e) {
      console.warn('Failed to save widgets:', e);
    }
  }, [widgets]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }, []);

  const getEnabledWidgets = useCallback(() => {
    return widgets.filter(w => w.enabled);
  }, [widgets]);

  return { widgets, toggleWidget, getEnabledWidgets };
}
