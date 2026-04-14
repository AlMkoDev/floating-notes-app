const log = require('electron-log');
const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;
let tray;
let licenseValid = false;

function sendToRenderer(channel, data) {
  if (win && win.webContents) {
    win.webContents.send(channel, data);
  }
}

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
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);

    sendToRenderer('update-status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate || null
    });

    sendToRenderer('update-meta', {
      version: info.version,
      releaseNotes: info.releaseNotes || "No release notes provided."
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
    sendToRenderer('update-status', { status: 'none' });
  });

  autoUpdater.on('error', (err) => {
    log.error('Updater error:', err);
    sendToRenderer('update-status', {
      status: 'error',
      message: err == null ? "unknown" : (err.message || err.toString())
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${progress.percent}%`);

    sendToRenderer('update-download', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded - ready to install');

    sendToRenderer('update-status', {
      status: 'downloaded',
      version: info.version
    });

    ipcMain.on('restart-app', () => {
      autoUpdater.quitAndInstall();
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
}

const { ipcMain } = require('electron');
const fs = require('fs');

const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');

/* ================= LICENSE SYSTEM ================= */

function validateLicenseKey(key) {
  // SIMPLE OFFLINE RULE (replace later with API call)
  const validKeys = [
    "FLOATING-2026-PRO",
    "ALMKO-DEV-UNLOCK",
    "NOTES-PREMIUM-KEY"
  ];

  return validKeys.includes(key);
}

function saveLicense(key) {
  fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key, valid: true }));
}

function loadLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      const data = JSON.parse(fs.readFileSync(LICENSE_FILE));
      return data.valid;
    }
  } catch (e) {
    log.error("License load error", e);
  }
  return false;
}

ipcMain.on('validate-license', (event, key) => {
  const valid = validateLicenseKey(key);

  if (valid) {
    saveLicense(key);
    licenseValid = true;
  }

  event.reply('license-result', {
    valid
  });
});

ipcMain.on('check-license', (event) => {
  const valid = loadLicense();
  licenseValid = valid;

  event.reply('license-status', {
    valid
  });
});

/* ============================================== */

app.whenReady().then(() => {
   createWindow();
  createTray();
  registerHotkey();
  setupUpdater();

  // license check
  licenseValid = loadLicense();

  if (!licenseValid) {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('license-status', { valid: false });
    });
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});