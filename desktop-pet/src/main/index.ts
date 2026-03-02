import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, desktopCapturer } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isClickThrough = false;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  const windowWidth = 220;
  const windowHeight = 240;
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 30,
    y: screenHeight - windowHeight - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Enable click-through mode initially
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    isClickThrough = true;
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5180');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[ZetaFrog] Window created with click-through');
}

function createTray() {
  const size = 16;
  const iconBuffer = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    iconBuffer[i * 4] = 74;
    iconBuffer[i * 4 + 1] = 222;
    iconBuffer[i * 4 + 2] = 128;
    iconBuffer[i * 4 + 3] = 255;
  }
  
  const trayIcon = nativeImage.createFromBuffer(iconBuffer, { width: size, height: size });
  tray = new Tray(trayIcon);
  tray.setToolTip('ZetaFrog 🐸');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => { mainWindow?.show(); mainWindow?.setIgnoreMouseEvents(false); }},
    { type: 'separator' },
    { label: '互动模式', type: 'checkbox', checked: false, click: (menuItem) => {
      if (menuItem.checked) {
        mainWindow?.setIgnoreMouseEvents(false);
      } else {
        mainWindow?.setIgnoreMouseEvents(true, { forward: true });
      }
    }},
    { type: 'separator' },
    { label: '旅行', click: () => { mainWindow?.webContents.send('menu-action', 'travel'); mainWindow?.show(); }},
    { label: '背包', click: () => { mainWindow?.webContents.send('menu-action', 'bag'); mainWindow?.show(); }},
    { label: '好友', click: () => { mainWindow?.webContents.send('menu-action', 'friends'); mainWindow?.show(); }},
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow?.show(); mainWindow?.setIgnoreMouseEvents(false); });
  
  console.log('[ZetaFrog] Tray created');
}

ipcMain.handle('get-window-position', () => mainWindow?.getPosition() || null);
ipcMain.handle('set-window-position', (_, x: number, y: number) => mainWindow?.setPosition(x, y));
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => mainWindow?.hide());

// Enable/disable click through
ipcMain.handle('set-click-through', (_, enabled: boolean) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
    isClickThrough = enabled;
    console.log(`[ZetaFrog] Click-through: ${enabled}`);
  }
});

// Move window
ipcMain.handle('move-window', (_, x: number, y: number) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => console.log('[ZetaFrog] App quitting'));
