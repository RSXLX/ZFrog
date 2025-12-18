export interface ElectronStore {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

declare global {
  interface Window {
    electron?: {
      store: ElectronStore;
      // 其他 Electron API...
    };
  }
}

export {};