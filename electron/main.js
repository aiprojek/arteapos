
import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nonaktifkan Hardware Acceleration jika di Linux (untuk stabilitas)
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // Di production (dist), icon ada di folder dist (hasil copy dari public)
    // Di development, icon ada di folder public
    icon: path.join(__dirname, app.isPackaged ? '../dist/favicon.svg' : '../public/favicon.svg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Untuk kemudahan akses file lokal jika perlu nanti
      enableWebSQL: false,
    },
  });

  // Hapus menu default (File, Edit, View, dll) agar terlihat seperti aplikasi Kasir Pro
  mainWindow.setMenuBarVisibility(false);

  // FIX: Web Bluetooth Permission Handler
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    // Otomatis pilih perangkat pertama atau biarkan kosong agar browser memunculkan dialog native jika memungkinkan.
    // Namun di Electron, kita perlu logika custom atau mengambil device pertama yang ditemukan.
    if (deviceList && deviceList.length > 0) {
      callback(deviceList[0].deviceId);
    } else {
      // Jika tidak ada device, coba cari lagi (atau biarkan user mencoba lagi di UI)
      // callback('');
    }
  });

  // Load file hasil build React (dist/index.html)
  // Dalam production, kita load file. Dalam development, bisa load localhost
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
