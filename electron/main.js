
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Nonaktifkan Hardware Acceleration jika di Linux (untuk stabilitas)
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/favicon.svg'), // Pastikan ada icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Untuk kemudahan akses file lokal jika perlu nanti
    },
  });

  // Hapus menu default (File, Edit, View, dll) agar terlihat seperti aplikasi Kasir Pro
  mainWindow.setMenuBarVisibility(false);

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
