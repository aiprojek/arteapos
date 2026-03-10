
import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nonaktifkan Hardware Acceleration jika di Linux (untuk stabilitas AppImage/GPU)
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

// Enable Web Bluetooth in Electron (Chromium)
app.commandLine.appendSwitch('enable-web-bluetooth');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Di production (dist), icon ada di folder dist (hasil copy dari public)
    // Di development, icon ada di folder public
    icon: path.join(__dirname, app.isPackaged ? '../dist/favicon.svg' : '../public/favicon.svg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Untuk kemudahan akses file lokal
      enableWebSQL: false,
    },
  });

  // Hapus menu default (File, Edit, View, dll) agar terlihat bersih
  mainWindow.setMenuBarVisibility(false);

  // FIX: Web Bluetooth Permission Handler
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    if (deviceList && deviceList.length > 0) {
      callback(deviceList[0].deviceId);
    }
  });

  const session = mainWindow.webContents.session;
  session.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'bluetooth' || permission === 'bluetoothScanning') return true;
    return false;
  });
  session.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'bluetooth' || permission === 'bluetoothScanning') return callback(true);
    callback(false);
  });

  // Load file hasil build React (dist/index.html)
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Buka debug tools di mode dev
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
