const { app, BrowserWindow, ipcMain, session, shell, dialog, safeStorage, Menu, MenuItem } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { pathToFileURL } = require('url');
const { validateExternalUrl, validateImageUrl, isTrustedSenderUrl } = require('./security');
const { registerProxyHandlers } = require('./ipc-proxy');

// Longest we wait for the renderer to report it has mounted before showing the window anyway.
const RENDERER_READY_TIMEOUT_MS = 6000;

// Keep a global reference of the window object
let mainWindow = null;
let splashWindow = null;
let revealState = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Configure auto-updater
autoUpdater.autoDownload = true; // Download automatically to fix black screen issues
autoUpdater.autoInstallOnAppQuit = true;

// Logging for auto-updater
autoUpdater.logger = require('electron').app.isPackaged ? null : console;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        transparent: false,
        resizable: false,
        center: true,
        backgroundColor: '#0a0a0b',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        skipTaskbar: true,
        alwaysOnTop: true,
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));

    // Inject version number dynamically
    splashWindow.webContents.on('did-finish-load', () => {
        const version = app.getVersion();
        splashWindow.webContents.executeJavaScript(`
            const versionEl = document.querySelector('.version');
            if (versionEl) {
                versionEl.textContent = 'v${version}';
            }
        `);
    });

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

function revealMainWindow(force = false) {
    const state = revealState;
    if (!state || state.shown || !mainWindow || mainWindow.isDestroyed()) return;
    if (!force && !(state.painted && state.mounted)) return;
    state.shown = true;
    clearTimeout(state.timer);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
    mainWindow.focus();
}

function createWindow() {
    // Create the browser window with themed title bar
    mainWindow = new BrowserWindow({
        width: 1662,
        height: 1070,
        minWidth: 1000,
        minHeight: 700,
        title: 'AI Model DB',
        icon: path.join(__dirname, '../public/favicon.svg'),
        backgroundColor: '#0a0a0b',
        show: false, // Don't show until ready
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        // Use hidden title bar with NO overlay to allow custom controls
        titleBarStyle: 'hidden',
        titleBarOverlay: false,
        autoHideMenuBar: true,
        trafficLightPosition: { x: -100, y: -100 }, // Push traffic lights off-screen just in case
    });

    // Hide traffic lights on macOS to use custom controls
    if (process.platform === 'darwin') {
        mainWindow.setWindowButtonVisibility(false);
    }

    // Context Menu Handler
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();

        // Add Save Image option if right-clicked on an image
        if (params.mediaType === 'image') {
            menu.append(new MenuItem({
                label: 'Save Image As...',
                click: () => {
                    try {
                        const safeUrl = validateImageUrl(params.srcURL);
                        mainWindow.webContents.downloadURL(safeUrl);
                    } catch (err) {
                        console.error('[ContextMenu] Blocked download of invalid image URL:', err.message);
                        dialog.showErrorBox('Download Blocked', 'The image URL is invalid or unsafe.');
                    }
                }
            }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // Standard Text Editing Actions
        if (params.isEditable) {
            menu.append(new MenuItem({ role: 'undo' }));
            menu.append(new MenuItem({ role: 'redo' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ role: 'cut' }));
            menu.append(new MenuItem({ role: 'copy' }));
            menu.append(new MenuItem({ role: 'paste' }));
            menu.append(new MenuItem({ role: 'selectAll' }));
        } else {
            // Allow copy if text is selected
            if (params.selectionText) {
                menu.append(new MenuItem({ role: 'copy' }));
            }
        }

        // DevTools (only in dev or if explicitly requested)
        if (isDev) {
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({
                label: 'Inspect Element',
                click: () => mainWindow.webContents.inspectElement(params.x, params.y)
            }));
        }

        if (menu.items.length > 0) {
            menu.popup(mainWindow, params.x, params.y);
        }
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

    // Show the window once Chromium has painted AND the renderer reports React has
    // mounted, so the user never sees an empty page. A timeout covers a renderer
    // that never reports (crash, script error).
    revealState = { painted: false, mounted: false, shown: false, timer: null };
    revealState.timer = setTimeout(() => revealMainWindow(true), RENDERER_READY_TIMEOUT_MS);
    mainWindow.once('ready-to-show', () => {
        revealState.painted = true;
        revealMainWindow();
    });

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const safeUrl = validateExternalUrl(url, { allowHttp: isDev });
        if (safeUrl) shell.openExternal(safeUrl);
        return { action: 'deny' };
    });

    // Handle link clicks that should open externally
    // The app window never navigates away from its own page; anything else opens externally.
    const appPage = isDev ? 'http://localhost:5173/' : pathToFileURL(path.join(__dirname, '../dist/index.html')).toString();
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url.split('#')[0] === appPage.split('#')[0]) return;
        event.preventDefault();
        const safeUrl = validateExternalUrl(url, { allowHttp: isDev });
        if (safeUrl) shell.openExternal(safeUrl);
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
    // The app needs no browser permissions (camera, mic, geolocation, notifications...).
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    registerProxyHandlers({ isDev });

    // Show splash in production, skip in dev for faster iteration
    if (!isDev) {
        createSplashWindow();
    }

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

// Privileged IPC is only for our own page (never a navigated-away frame).
const isTrusted = (event) => isTrustedSenderUrl(event.senderFrame && event.senderFrame.url, { isDev });

// Renderer reports React has mounted; this is what reveals the main window.
ipcMain.on('renderer-ready', (event) => {
    if (mainWindow && event.sender === mainWindow.webContents && revealState) {
        revealState.mounted = true;
        revealMainWindow();
    }
});

// Handle opening external URLs
ipcMain.on('open-external', (event, url) => {
    if (!isTrusted(event)) return;
    const safeUrl = validateExternalUrl(url, { allowHttp: isDev });
    if (safeUrl) shell.openExternal(safeUrl);
});

// Handle update check request from renderer
ipcMain.on('check-for-updates', (event) => {
    if (!isTrusted(event)) return;
    checkForUpdates();
});

// Handle install update request
ipcMain.on('install-update', (event) => {
    if (!isTrusted(event)) return;
    autoUpdater.quitAndInstall();
});

// Handle download update request
ipcMain.on('download-update', (event) => {
    if (!isTrusted(event)) return;
    autoUpdater.downloadUpdate();
});

// Handle translation request from renderer
ipcMain.handle('translate-text', async (event, text, targetLang = 'en') => {
    if (!isTrusted(event)) return { text: null, error: 'Untrusted sender' };
    try {
        // Dynamic import for ESM package compatibility
        const { translate } = await import('@vitalets/google-translate-api');
        const res = await translate(text, { to: targetLang });
        return { text: res.text, error: null };
    } catch (error) {
        console.error('Translation error:', error);
        return { text: null, error: error.message };
    }
});

// SafeStorage IPC handlers
ipcMain.handle('encrypt-string', async (event, plainText) => {
    if (!isTrusted(event)) return null;
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[SafeStorage] Encryption is not available');
        return null;
    }
    try {
        const prefixed = `ai-model-db-secret:${plainText}`;
        const buffer = safeStorage.encryptString(prefixed);
        return buffer.toString('hex');
    } catch (error) {
        console.error('[SafeStorage] Encryption failed:', error);
        throw error;
    }
});

ipcMain.handle('decrypt-string', async (event, encryptedHex) => {
    if (!isTrusted(event)) return null;
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[SafeStorage] Encryption is not available');
        return null;
    }
    try {
        const buffer = Buffer.from(encryptedHex, 'hex');
        const decrypted = safeStorage.decryptString(buffer);
        if (decrypted.startsWith('ai-model-db-secret:')) {
            return decrypted.slice('ai-model-db-secret:'.length);
        }
        // Fallback for backward compatibility to avoid losing keys on upgrade
        return decrypted;
    } catch (error) {
        console.error('[SafeStorage] Decryption failed:', error);
        return null; // Return null on failure (e.g. wrong key, corrupted data)
    }
});
