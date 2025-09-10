const { app, BrowserWindow } = require('electron');
const path = require('path');


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: path.resolve('C:/Users/elmas/Downloads/ChatGPT_Image_26_août_2025__23_29_50-removebg-preview.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false
    }
  });

  // Masquer la barre de menu
  win.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV !== 'production';
  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.resolve(__dirname, '..', 'dist', 'index.html')}`
  );

  // Ne pas ouvrir les DevTools automatiquement
  if (isDev) {
    // Optionnel: ouvrir DevTools seulement en dev si nécessaire
    // win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

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
