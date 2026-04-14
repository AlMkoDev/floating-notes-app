const log = require('electron-log');
const { app, BrowserWindow, Tray, Menu, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;
let tray;

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 650,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
  win.setVisibleOnAllWorkspaces(true);

  win.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const menu = Menu.buildFromTemplate([
    { label: 'Open Notes', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip('Floating Notes');

  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show();
  });
}

function registerHotkey() {
  globalShortcut.register('Control+Alt+N', () => {
    win.isVisible() ? win.hide() : win.show();
  });
}

/* ================= AUTO UPDATER ================= */

function setupUpdater() {
  log.info("SETUP UPDATER FUNCTION CALLED");

  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Updater error:', err);
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded - will install on quit');
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
}

/* ============================================== */

app.whenReady().then(() => {
  console.log("APP STARTED - INITIALIZING UPDATER");

  createWindow();
  createTray();
  registerHotkey();
  setupUpdater();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});