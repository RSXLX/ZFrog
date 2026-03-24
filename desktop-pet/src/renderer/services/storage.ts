// Local Storage Service for Desktop Pet

const STORAGE_KEYS = {
  WALLET_ADDRESS: 'zfrog_wallet_address',
  AUTH_TOKEN: 'zfrog_auth_token',
  ACTIVE_FROG_ID: 'zfrog_active_frog_id',
  DESKTOP_NOTIFICATIONS: 'zfrog_desktop_notifications',
  FROG_STATS: 'zfrog_frog_stats',
  LAST_SAVE: 'zfrog_last_save',
  SETTINGS: 'zfrog_settings',
};

export interface StoredSettings {
  apiUrl: string;
  notifications: boolean;
  relationshipAwareReminders: boolean;
  relationshipReminderThrottleMs: number;
  councilBriefNotifications: boolean;
  councilBriefThrottleMs: number;
  startWithSystem: boolean;
  alwaysOnTop: boolean;
}

interface DesktopNotificationCacheItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
}

const defaultSettings: StoredSettings = {
  apiUrl: 'http://localhost:3001/api',
  notifications: true,
  relationshipAwareReminders: true,
  relationshipReminderThrottleMs: 10 * 60 * 1000,
  councilBriefNotifications: true,
  councilBriefThrottleMs: 15 * 60 * 1000,
  startWithSystem: false,
  alwaysOnTop: true,
};

export const storage = {
  getStorageKeys: () => STORAGE_KEYS,

  // Wallet
  getWalletAddress: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
  },
  
  setWalletAddress: (address: string) => {
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);
  },

  getAuthToken: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  setAuthToken: (token: string) => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  clearAuthToken: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  getActiveFrogId: (): number | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_FROG_ID);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  },

  setActiveFrogId: (frogId: number) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_FROG_ID, String(frogId));
  },

  clearActiveFrogId: () => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_FROG_ID);
  },

  getDesktopNotifications: (): DesktopNotificationCacheItem[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.DESKTOP_NOTIFICATIONS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setDesktopNotifications: (items: DesktopNotificationCacheItem[]) => {
    localStorage.setItem(STORAGE_KEYS.DESKTOP_NOTIFICATIONS, JSON.stringify(items.slice(0, 200)));
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
      authToken: storage.getAuthToken(),
      activeFrogId: storage.getActiveFrogId(),
      frogStats: storage.getFrogStats(),
      desktopNotifications: storage.getDesktopNotifications(),
      settings: storage.getSettings(),
      exportTime: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.walletAddress) storage.setWalletAddress(data.walletAddress);
      if (data.authToken) storage.setAuthToken(data.authToken);
      if (typeof data.activeFrogId === 'number') storage.setActiveFrogId(data.activeFrogId);
      if (data.frogStats) storage.setFrogStats(data.frogStats);
      if (Array.isArray(data.desktopNotifications)) storage.setDesktopNotifications(data.desktopNotifications);
      if (data.settings) storage.setSettings(data.settings);
      return true;
    } catch (e) {
      console.error('[Storage] Import failed:', e);
      return false;
    }
  },
};

export default storage;
