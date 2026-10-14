/**
 * IPC handlers that fetch network resources on behalf of the renderer.
 *
 * proxy-request     allowlisted API hosts (and local Ollama), GET/POST
 * proxy-image       allowlisted image hosts, returns a data: URL
 * proxy-import-url  any public https URL, for CSV/JSON/XLSX imports
 *
 * All three go through safeFetch (per-hop revalidation, no blind redirects)
 * and readCapped (hard byte limits), and refuse callers that are not our own
 * page.
 */
const { ipcMain } = require('electron');
const {
    isTrustedSenderUrl,
    validateImageUrl,
    validateImportUrl,
    validateProxyRequest,
} = require('./security');
const { safeFetch, readCapped } = require('./safe-fetch');

const MAX_API_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

const SAFE_IMAGE_MIMES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/vnd.microsoft.icon',
];

function registerProxyHandlers({ isDev }) {
    const trusted = (event) => isTrustedSenderUrl(event.senderFrame && event.senderFrame.url, { isDev });
    const denied = { success: false, error: 'Untrusted sender' };

    ipcMain.handle('proxy-request', async (event, request = {}) => {
        if (!trusted(event)) return denied;
        try {
            const safe = validateProxyRequest(request);
            if (isDev) {
                const parsed = new URL(safe.url);
                console.log(`[Proxy] ${safe.method} ${parsed.protocol}//${parsed.host}/<path-redacted>`);
            }
            const response = await safeFetch(safe.url, {
                validate: (url) => validateProxyRequest({ url, method: safe.method, headers: safe.headers }).url,
                init: {
                    method: safe.method,
                    headers: safe.headers,
                    body: safe.body ? JSON.stringify(safe.body) : undefined,
                },
            });
            const buffer = await readCapped(response, MAX_API_BYTES);
            if (!response.ok) {
                console.error(`[Proxy] Error ${response.status}: ${buffer.toString('utf8', 0, 200)}`);
                throw new Error(`Request failed: ${response.status}`);
            }
            const text = buffer.toString('utf8');
            const contentType = response.headers.get('content-type') || '';
            return { success: true, data: contentType.includes('application/json') ? JSON.parse(text) : text };
        } catch (error) {
            console.error('[Proxy] Request error:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('proxy-image', async (event, imageUrl) => {
        if (!trusted(event)) return denied;
        try {
            const response = await safeFetch(validateImageUrl(imageUrl), {
                validate: validateImageUrl,
                init: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Referer': 'https://civitasbay.org/',
                    },
                },
            });
            if (!response.ok) {
                if (isDev) console.error(`[ImageProxy] Failed: ${response.status}`);
                return { success: false, error: `HTTP ${response.status}` };
            }
            const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            if (!SAFE_IMAGE_MIMES.includes(contentType)) {
                console.error(`[ImageProxy] Blocked unsafe content-type: ${contentType}`);
                return { success: false, error: `Unsafe image content-type: ${contentType}` };
            }
            const buffer = await readCapped(response, MAX_IMAGE_BYTES);
            return { success: true, dataUrl: `data:${contentType};base64,${buffer.toString('base64')}` };
        } catch (error) {
            console.error('[ImageProxy] Error:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('proxy-import-url', async (event, targetUrl) => {
        if (!trusted(event)) return denied;
        try {
            const response = await safeFetch(validateImportUrl(targetUrl), {
                validate: validateImportUrl,
                resolveCheck: true,
            });
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            const buffer = await readCapped(response, MAX_IMPORT_BYTES);
            return { success: true, base64: buffer.toString('base64'), contentType: response.headers.get('content-type') };
        } catch (error) {
            console.error('[ImportProxy] Error:', error.message);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerProxyHandlers };
