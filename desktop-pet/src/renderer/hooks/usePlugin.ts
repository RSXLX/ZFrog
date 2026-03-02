import { useState, useEffect, useCallback } from 'react';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  version: string;
}

const defaultPlugins: Plugin[] = [
  { id: 'weather', name: '天气插件', description: '显示实时天气', icon: '🌤️', enabled: true, version: '1.0.0' },
  { id: 'clock', name: '时钟插件', description: '显示时间', icon: '🕐', enabled: true, version: '1.0.0' },
  { id: 'notes', name: '备忘录', description: '快速记录', icon: '📝', enabled: false, version: '1.0.0' },
  { id: 'translate', name: '翻译', description: '快捷翻译', icon: '🌐', enabled: false, version: '1.0.0' },
  { id: 'calculator', name: '计算器', description: '快速计算', icon: '🧮', enabled: false, version: '1.0.0' },
];

export function usePlugin() {
  const [plugins, setPlugins] = useState<Plugin[]>(defaultPlugins);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zfrog_plugins');
      if (saved) setPlugins(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load plugins:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('zfrog_plugins', JSON.stringify(plugins));
    } catch (e) {
      console.warn('Failed to save plugins:', e);
    }
  }, [plugins]);

  const togglePlugin = useCallback((id: string) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  }, []);

  const getEnabledPlugins = useCallback(() => {
    return plugins.filter(p => p.enabled);
  }, [plugins]);

  return { plugins, togglePlugin, getEnabledPlugins };
}
