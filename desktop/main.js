const { app, BrowserWindow, globalShortcut, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

// Evitar múltiples instancias del Punto de Venta
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
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'Cloud POS - Terminal de Ventas & Administración',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0f172a', // Fondo obsidiana sin parpadeo blanco
    autoHideMenuBar: true,       // Elimina barras de menú de navegador
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Esperar hasta estar listo para mostrar suavemente
  });

  // Ocultar menú superior por defecto para apariencia 100% nativa
  Menu.setApplicationMenu(null);

  // URL oficial en vivo en la nube
  const POS_URL = 'https://cloud-pos-three.vercel.app/dashboard/pos';

  mainWindow.loadURL(POS_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Manejo de error de conexión / Fallback con reconexión automática
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Fallo de conexión:', errorDescription);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Atajo F11 para alternar Modo Pantalla Completa / Kiosco
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
