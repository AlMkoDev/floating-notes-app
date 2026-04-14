const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const htmlDocx = require('html-docx-js');
const PDFDocument = require('pdfkit');

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

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Notes', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('Floating Notes');
  tray.setContextMenu(contextMenu);
}

function registerShortcuts() {
  globalShortcut.register('Control+Alt+N', () => {
    win.isVisible() ? win.hide() : win.show();
  });
}

/* ================= EXPORT LOGIC ================= */

// Export to Word
ipcMain.on('export-word', async (event, htmlContent) => {
  const file = await dialog.showSaveDialog({
    filters: [{ name: 'Word Document', extensions: ['docx'] }]
  });

  if (!file.canceled) {
    const converted = htmlDocx.asBlob(htmlContent);

    // Convert Blob → Buffer
    const arrayBuffer = await converted.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(file.filePath, buffer);
  }
});

// Export to PDF
ipcMain.on('export-pdf', async (event, textContent) => {
  const file = await dialog.showSaveDialog({
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (!file.canceled) {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(file.filePath));
    doc.text(textContent);
    doc.end();
  }
});

/* ================================================= */

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();
  app.setLoginItemSettings({
  openAtLogin: true
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});