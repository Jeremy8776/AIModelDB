/**
 * URL and request validation for the Electron main process.
 *
 * Everything the renderer asks the main process to fetch or open passes
 * through here first. Hosts are matched exactly (no suffix matching), https is
 * required except for the explicit local Ollama exception, and private address
 * space is rejected via net-guard.
 */
const { isPrivateHost, normaliseHost } = require('./net-guard');

const ALLOWED_PROXY_HOSTS = new Set([
    'api.anthropic.com', 'api.github.com', 'api.openai.com', 'api.mistral.ai',
    'api.groq.com', 'api.x.ai', 'api.cerebras.ai', 'api.perplexity.ai',
    'api.together.xyz', 'api.fireworks.ai', 'api.deepinfra.com',
    'api.deepseek.com', 'api.cohere.com', 'generativelanguage.googleapis.com',
    'artificialanalysis.ai', 'civitai.com',
    'civitasbay.org', 'github.com', 'huggingface.co', 'raw.githubusercontent.com',
    'registry.modelcontextprotocol.io', 'registry.npmjs.org', 'ollama.com', 'openrouter.ai',
    'pypi.org', 'glama.ai', 'www.googleapis.com', 'openmodeldb.info',
]);

const ALLOWED_IMAGE_HOSTS = new Set([
    'civitasbay.org', 'civitai.com', 'image.civitai.com', 'huggingface.co', 'raw.githubusercontent.com',
]);

// A locally running Ollama is the one plain-http, loopback destination we allow.
const OLLAMA_LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const OLLAMA_PORT = '11434';

const ALLOWED_METHODS = new Set(['GET', 'POST']);
const ALLOWED_HEADERS = new Set([
    'accept',
    'anthropic-version',
    'authorization',
    'content-type',
    'user-agent',
    'x-api-key',
    'x-github-api-version',
]);

function parseHttpsUrl(rawUrl) {
    const parsed = new URL(String(rawUrl || ''));
    if (parsed.protocol !== 'https:') throw new Error('URL protocol is not allowed');
    if (parsed.username || parsed.password) throw new Error('URL credentials are not allowed');
    if (isPrivateHost(parsed.hostname)) throw new Error('URL host is not allowed');
    return parsed;
}

function isLocalOllama(parsed) {
    return parsed.protocol === 'http:'
        && !parsed.username && !parsed.password
        && parsed.port === OLLAMA_PORT
        && OLLAMA_LOOPBACK_HOSTS.has(normaliseHost(parsed.hostname));
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
    const raw = new URL(String(url || ''));
    const local = isLocalOllama(raw);
    const parsed = local ? raw : parseHttpsUrl(url);
    if (!local && !ALLOWED_PROXY_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error('URL host is not allowed');

    const normalizedMethod = String(method || 'GET').toUpperCase();
    if (!ALLOWED_METHODS.has(normalizedMethod)) throw new Error('HTTP method is not allowed');

    const safeHeaders = {};
    for (const [key, value] of Object.entries(headers || {})) {
        if (ALLOWED_HEADERS.has(key.toLowerCase())) safeHeaders[key] = value;
    }

    return { url: parsed.toString(), method: normalizedMethod, headers: safeHeaders, body };
}

function validateImageUrl(rawUrl) {
    const parsed = parseHttpsUrl(rawUrl);
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error('Image host is not allowed');
    return parsed.toString();
}

/** User-supplied import URLs: any public https host. */
function validateImportUrl(rawUrl) {
    return parseHttpsUrl(rawUrl).toString();
}

/**
 * Only our own pages may call privileged IPC: the packaged file:// app, or the
 * Vite dev server in development. Rejects frames navigated to anything else.
 */
function isTrustedSenderUrl(rawUrl, { isDev = false } = {}) {
    try {
        const parsed = new URL(String(rawUrl || ''));
        if (parsed.protocol === 'file:') return true;
        return isDev && parsed.origin === 'http://localhost:5173';
    } catch {
        return false;
    }
}

module.exports = {
    ALLOWED_PROXY_HOSTS,
    isPrivateHost,
    isTrustedSenderUrl,
    validateExternalUrl,
    validateImageUrl,
    validateImportUrl,
    validateProxyRequest,
};
