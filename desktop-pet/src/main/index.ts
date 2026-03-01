import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  const windowWidth = 280;
  const windowHeight = 280;
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 20,
    y: screenHeight - windowHeight - 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[ZetaFrog] Window created');
}

function createTray() {
  // Create simple 16x16 frog icon
  const size = 16;
  const iconBuffer = Buffer.alloc(size * size * 4);
  
  // Fill with green color (RGBA)
  for (let i = 0; i < size * size; i++) {
    iconBuffer[i * 4] = 74;     // R
    iconBuffer[i * 4 + 1] = 222; // G  
    iconBuffer[i * 4 + 2] = 128; // B
    iconBuffer[i * 4 + 3] = 255; // A
  }
  
  const trayIcon = nativeImage.createFromBuffer(iconBuffer, { width: size, height: size });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('ZetaFrog 🐸');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '旅行', click: () => { mainWindow?.webContents.send('menu-action', 'travel'); mainWindow?.show(); }},
    { label: '背包', click: () => { mainWindow?.webContents.send('menu-action', 'bag'); mainWindow?.show(); }},
    { label: '好友', click: () => { mainWindow?.webContents.send('menu-action', 'friends'); mainWindow?.show(); }},
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
  
  console.log('[ZetaFrog] Tray created');
}

// IPC handlers
ipcMain.handle('get-window-position', () => mainWindow?.getPosition() || null);
ipcMain.handle('set-window-position', (_, x: number, y: number) => mainWindow?.setPosition(x, y));
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => mainWindow?.hide());

// App lifecycle
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
