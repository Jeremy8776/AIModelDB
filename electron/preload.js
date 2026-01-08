const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),

    // Open external URLs in default browser
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Auto-updater methods
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    installUpdate: () => ipcRenderer.send('install-update'),
    downloadUpdate: () => ipcRenderer.send('download-update'),
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, data) => callback(data));
    },
    removeUpdateListener: () => {
        ipcRenderer.removeAllListeners('update-status');
    },

    // Check if running in Electron
    isElectron: true,

    // SafeStorage methods
    encryptString: (text) => ipcRenderer.invoke('encrypt-string', text),
    decryptString: (encryptedHex) => ipcRenderer.invoke('decrypt-string', encryptedHex),

    // Proxy request
    proxyRequest: (options) => ipcRenderer.invoke('proxy-request', options),

    // Proxy image - fetches images via Node.js to bypass CDN restrictions
    proxyImage: (imageUrl) => ipcRenderer.invoke('proxy-image', imageUrl),

    // Translation
    translateText: (text, targetLang) => ipcRenderer.invoke('translate-text', text, targetLang),

    // Window Controls
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
});

// Log that preload script has loaded
console.log('[Electron] Preload script loaded');
