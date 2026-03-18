// Local Storage Service for Desktop Pet

const STORAGE_KEYS = {
  WALLET_ADDRESS: 'zfrog_wallet_address',
  FROG_STATS: 'zfrog_frog_stats',
  LAST_SAVE: 'zfrog_last_save',
  SETTINGS: 'zfrog_settings',
};

export interface StoredSettings {
  apiUrl: string;
  notifications: boolean;
  startWithSystem: boolean;
  alwaysOnTop: boolean;
}

const defaultSettings: StoredSettings = {
  apiUrl: 'http://localhost:3001/api',
  notifications: true,
  startWithSystem: false,
  alwaysOnTop: true,
};

export const storage = {
  // Wallet
  getWalletAddress: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
  },
  
  setWalletAddress: (address: string) => {
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);
  },

  // Frog Stats
  getFrogStats: (): any => {
    const stats = localStorage.getItem(STORAGE_KEYS.FROG_STATS);
    return stats ? JSON.parse(stats) : null;
  },
  
  setFrogStats: (stats: any) => {
    localStorage.setItem(STORAGE_KEYS.FROG_STATS, JSON.stringify(stats));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVE, Date.now().toString());
  },

  // Settings
  getSettings: (): StoredSettings => {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? { ...defaultSettings, ...JSON.parse(settings) } : defaultSettings;
  },
  
  setSettings: (settings: Partial<StoredSettings>) => {
    const current = storage.getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
  },

  // Clear all
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Export/Import
  exportData: (): string => {
    const data = {
      walletAddress: storage.getWalletAddress(),
      frogStats: storage.getFrogStats(),
      settings: storage.getSettings(),
      exportTime: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.walletAddress) storage.setWalletAddress(data.walletAddress);
      if (data.frogStats) storage.setFrogStats(data.frogStats);
      if (data.settings) storage.setSettings(data.settings);
      return true;
    } catch (e) {
      console.error('[Storage] Import failed:', e);
      return false;
    }
  },
};

export default storage;
