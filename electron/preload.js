const { contextBridge, ipcRenderer, shell } = require('electron');
const https = require('https');
const http = require('http');
const url = require('url');

// Fetch implementation for Electron main process
async function fetchExternal(targetUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'ai-model-db-pro/0.2.1',
                ...options.headers
            }
        };

        const req = protocol.request(requestOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const headers = {};
                Object.keys(res.headers).forEach(key => {
                    headers[key] = res.headers[key];
                });

                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers,
                    body
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Fetch wrapper for external APIs (bypasses CORS)
    fetchExternal: fetchExternal,

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),

    // Open external URLs in default browser
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Check if running in Electron
    isElectron: true,
});

// Log that preload script has loaded
console.log('[Electron] Preload script loaded');
