const { app, BrowserWindow, globalShortcut, Menu } = require('electron');
const path = require('path');
const pkg = require('./package.json');

const APP_MODE = pkg.appMode || 'CAJA'; // 'CAJA' o 'ADMIN'
const IS_CAJA = APP_MODE === 'CAJA';

let mainWindow = null;

// Permitir que Admin y Caja corran simultáneamente, pero solo 1 instancia de cada uno
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  const iconFile = IS_CAJA ? 'icon-caja.png' : 'icon.png';
  const windowTitle = IS_CAJA
    ? 'Cloud POS - Terminal de Caja (Punto de Venta)'
    : 'Cloud POS - Panel de Administración';

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: windowTitle,
    icon: path.join(__dirname, 'assets', iconFile),
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: IS_CAJA ? 'persist:cloudpos_caja' : 'persist:cloudpos_admin',
    },
    show: false,
  });

  Menu.setApplicationMenu(null);

  // Configurar User-Agent identificando si es el ejecutable de CAJA o de ADMIN
  const defaultUA = mainWindow.webContents.getUserAgent();
  const modeTag = IS_CAJA ? 'CloudPOS-Caja/1.0' : 'CloudPOS-Admin/1.0';
  mainWindow.webContents.setUserAgent(`${defaultUA} ${modeTag}`);

  const TARGET_URL = IS_CAJA
    ? 'https://cloud-pos-three.vercel.app/dashboard/pos'
    : 'https://cloud-pos-three.vercel.app/dashboard';

  mainWindow.webContents.session.clearCache().finally(() => {
    mainWindow.loadURL(TARGET_URL, {
      extraHeaders: 'pragma: no-cache\n',
    });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    // Ignorar cancelaciones normales de redirección (-3)
    if (errorCode === -3) return;
    console.log('Fallo de conexión:', errorDescription);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  mainWindow.on('focus', () => {
    globalShortcut.register('F11', () => {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    });
  });

  mainWindow.on('blur', () => {
    globalShortcut.unregister('F11');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
