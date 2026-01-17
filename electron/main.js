const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, MenuItem } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Keep a global reference of the window object
let mainWindow = null;
let splashWindow = null;

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
                    mainWindow.webContents.downloadURL(params.srcURL);
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

    // When main window is ready, close splash and show main
    mainWindow.once('ready-to-show', () => {
        // Add small delay for smoother transition
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            mainWindow.show();
            mainWindow.focus();
        }, isDev ? 500 : 1500); // Shorter delay in dev mode
    });

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

// Handle translation request from renderer
// Handle translation request from renderer
ipcMain.handle('translate-text', async (event, text, targetLang = 'en') => {
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

        if (isDev) {
            console.log(`[Proxy] ${method} ${url}`);
        }
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Proxy] Error ${response.status}: ${text.substring(0, 200)}`);
            throw new Error(`Request failed: ${response.status}`);
        }

        // Check content type to determine how to parse response
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Return as text for HTML and other content types
            data = await response.text();
        }

        return { success: true, data };
    } catch (error) {
        console.error('[Proxy] Request error:', error.message);
        return { success: false, error: error.message };
    }
});

// Image Proxy Handler - fetches images and returns as base64 data URL
// This bypasses CDN restrictions that block browser requests
ipcMain.handle('proxy-image', async (event, imageUrl) => {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://civitasbay.org/'
            }
        });

        if (!response.ok) {
            // Only log errors, not every request
            if (isDev) console.error(`[ImageProxy] Failed: ${response.status}`);
            return { success: false, error: `HTTP ${response.status}` };
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        return { success: true, dataUrl };
    } catch (error) {
        console.error('[ImageProxy] Error:', error.message);
        return { success: false, error: error.message };
    }
});
