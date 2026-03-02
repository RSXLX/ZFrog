import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x: number, y: number) => ipcRenderer.invoke('set-window-position', x, y),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Click-through control (key feature!)
  setClickThrough: (enabled: boolean) => ipcRenderer.invoke('set-click-through', enabled),
  
  // Move window
  moveWindow: (x: number, y: number) => ipcRenderer.invoke('move-window', x, y),
  
  // Menu actions
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action));
  },
  
  platform: process.platform,
});
