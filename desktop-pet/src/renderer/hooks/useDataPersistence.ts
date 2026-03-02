import { useEffect, useCallback } from 'react';

// Comprehensive data persistence manager
const STORAGE_KEYS = {
  PET_STATS: 'zfrog_pet_stats',
  INVENTORY: 'zfrog_inventory',
  FRIENDS: 'zfrog_friends',
  ACHIEVEMENTS: 'zfrog_achievements',
  TRAVEL: 'zfrog_travel',
  EMails: 'zfrog_emails',
  STATISTICS: 'zfrog_statistics',
  SETTINGS: 'zfrog_settings',
  THEME: 'zfrog_theme',
  AVATAR: 'zfrog_avatar',
  COINS: 'zfrog_coins',
};

export function useDataPersistence() {
  // Save data with timestamp
  const saveData = useCallback((key: string, data: any) => {
    try {
      const wrapped = {
        data,
        timestamp: Date.now(),
        version: '1.0.0',
      };
      localStorage.setItem(key, JSON.stringify(wrapped));
      return true;
    } catch (e) {
      console.error(`Failed to save ${key}:`, e);
      return false;
    }
  }, []);

  // Load data with migration support
  const loadData = useCallback((key: string, defaultValue: any = null) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      
      const wrapped = JSON.parse(raw);
      return wrapped.data ?? defaultValue;
    } catch (e) {
      console.error(`Failed to load ${key}:`, e);
      return defaultValue;
    }
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('[DataPersistence] All data cleared');
  }, []);

  // Export data as JSON
  const exportData = useCallback(() => {
    const exportObj: Record<string, any> = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key);
      if (data) {
        exportObj[name] = JSON.parse(data);
      }
    });
    return JSON.stringify(exportObj, null, 2);
  }, []);

  // Import data from JSON
  const importData = useCallback((jsonString: string) => {
    try {
      const importObj = JSON.parse(jsonString);
      Object.entries(importObj).forEach(([name, wrapped]: [string, any]) => {
        const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
        if (key && wrapped.data) {
          localStorage.setItem(key, JSON.stringify(wrapped));
        }
      });
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }, []);

  // Auto-save hook
  const useAutoSave = (key: string, data: any) => {
    useEffect(() => {
      if (data) {
        saveData(key, data);
      }
    }, [key, data, saveData]);
  };

  return {
    saveData,
    loadData,
    clearAllData,
    exportData,
    importData,
    useAutoSave,
    STORAGE_KEYS,
  };
}
