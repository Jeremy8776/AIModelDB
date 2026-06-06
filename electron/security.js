const net = require('net');

const ALLOWED_PROXY_HOSTS = new Set([
    'api.github.com', 'api.openai.com', 'artificialanalysis.ai', 'civitai.com',
    'civitasbay.org', 'github.com', 'huggingface.co', 'raw.githubusercontent.com',
    'registry.modelcontextprotocol.io', 'registry.npmjs.org', 'ollama.com', 'pypi.org',
    'www.googleapis.com',
]);

const ALLOWED_IMAGE_HOSTS = new Set([
    'civitasbay.org', 'civitai.com', 'image.civitai.com', 'huggingface.co', 'raw.githubusercontent.com',
]);

const ALLOWED_METHODS = new Set(['GET', 'POST']);
const ALLOWED_HEADERS = new Set(['accept', 'authorization', 'content-type', 'user-agent', 'x-api-key']);

function isPrivateHost(hostname) {
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return true;
    const ipVersion = net.isIP(host);
    if (ipVersion === 4) {
        const [a, b] = host.split('.').map(Number);
        return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
    }
    if (ipVersion === 6) {
        return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80');
    }
    return false;
}

function parseHttpsUrl(rawUrl) {
    const parsed = new URL(String(rawUrl || ''));
    if (parsed.protocol !== 'https:') throw new Error('URL protocol is not allowed');
    if (parsed.username || parsed.password) throw new Error('URL credentials are not allowed');
    if (isPrivateHost(parsed.hostname)) throw new Error('URL host is not allowed');
    return parsed;
}

function validateExternalUrl(rawUrl, { allowHttp = false } = {}) {
    try {
        const parsed = new URL(String(rawUrl || ''));
        if (parsed.protocol === 'https:' || (allowHttp && parsed.protocol === 'http:')) return parsed.toString();
    } catch {
        return null;
    }
    return null;
}

function validateProxyRequest({ url, method = 'GET', headers = {}, body = null }) {
    const parsed = parseHttpsUrl(url);
    if (!ALLOWED_PROXY_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error('URL host is not allowed');

    const normalizedMethod = String(method || 'GET').toUpperCase();
    if (!ALLOWED_METHODS.has(normalizedMethod)) throw new Error('HTTP method is not allowed');

    const safeHeaders = {};
    for (const [key, value] of Object.entries(headers || {})) {
        const lowerKey = key.toLowerCase();
        if (ALLOWED_HEADERS.has(lowerKey)) safeHeaders[key] = value;
    }

    return { url: parsed.toString(), method: normalizedMethod, headers: safeHeaders, body };
}

function validateImageUrl(rawUrl) {
    const parsed = parseHttpsUrl(rawUrl);
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error('Image host is not allowed');
    return parsed.toString();
}

module.exports = {
    validateExternalUrl,
    validateProxyRequest,
    validateImageUrl,
};
