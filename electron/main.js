const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Keep a global reference of the window object
let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't download automatically, ask user first
autoUpdater.autoInstallOnAppQuit = true;

// Logging for auto-updater
autoUpdater.logger = require('electron').app.isPackaged ? null : console;

function createWindow() {
    // Create the browser window with themed title bar
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'AI Model DB Pro',
        icon: path.join(__dirname, '../public/favicon.svg'),
        backgroundColor: '#0a0a0b',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        // Use hidden title bar with NO overlay to allow custom controls
        titleBarStyle: 'hidden',
        titleBarOverlay: false,
        autoHideMenuBar: true,
    });

    // Load the app
    if (isDev) {
        // In development, load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from built files
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

        // Check for updates in production only
        setTimeout(() => {
            checkForUpdates();
        }, 3000); // Wait 3 seconds after startup
    }

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle link clicks that should open externally
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Window Controls IPC
ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
});

// Auto-updater functions
function checkForUpdates() {
    if (isDev) {
        console.log('[AutoUpdater] Skipping update check in development mode');
        return;
    }

    console.log('[AutoUpdater] Checking for updates...');
    autoUpdater.checkForUpdates().catch(err => {
        console.error('[AutoUpdater] Error checking for updates:', err);
    });
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    sendStatusToWindow('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendStatusToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Update not available');
    sendStatusToWindow('update-not-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[AutoUpdater] Download progress: ${Math.round(progressObj.percent)}%`);
    sendStatusToWindow('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded');
    sendStatusToWindow('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
    sendStatusToWindow('update-error', { message: err.message });
});

function sendStatusToWindow(status, data = {}) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-status', { status, ...data });
    }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS, re-create a window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers for renderer process communication
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-platform', () => {
    return process.platform;
});

// Handle opening external URLs
ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

// Handle update check request from renderer
ipcMain.on('check-for-updates', () => {
    checkForUpdates();
});

// Handle install update request
ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
});

// Handle download update request
ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
});

// SafeStorage IPC handlers
ipcMain.handle('encrypt-string', async (event, plainText) => {
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[SafeStorage] Encryption is not available');
        return null;
    }
    try {
        const buffer = safeStorage.encryptString(plainText);
        return buffer.toString('hex');
    } catch (error) {
        console.error('[SafeStorage] Encryption failed:', error);
        throw error;
    }
});

ipcMain.handle('decrypt-string', async (event, encryptedHex) => {
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[SafeStorage] Encryption is not available');
        return null;
    }
    try {
        const buffer = Buffer.from(encryptedHex, 'hex');
        const decrypted = safeStorage.decryptString(buffer);
        return decrypted;
    } catch (error) {
        console.error('[SafeStorage] Decryption failed:', error);
        return null; // Return null on failure (e.g. wrong key, corrupted data)
    }
});

// Proxy Request Handler to bypass CORS
ipcMain.handle('proxy-request', async (event, { url, method = 'GET', headers = {}, body = null }) => {
    try {
        const fetchOptions = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        console.log(`[Proxy] ${method} ${url}`);
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('[Proxy] Request error:', error);
        return { success: false, error: error.message };
    }
});
