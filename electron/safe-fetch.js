/**
 * Redirect-safe, size-capped fetch for the Electron main process.
 *
 * Node's fetch follows redirects by default, which lets an allowlisted host
 * bounce a request onto a private address. Here every hop is re-validated by
 * the caller's `validate` function before it is requested, credentials are
 * dropped when the origin changes, and bodies are read with a hard byte cap.
 *
 * Invariants:
 *  - `validate(url)` must throw for any URL that must not be requested and
 *    return the URL string to request otherwise.
 *  - Every hop has a deadline (`timeoutMs`, default 45 s) that also covers reading the
 *    body, so one stalled server cannot hang a whole "Sync All" forever.
 *  - When `resolveCheck` is set, DNS results for each hop are checked against
 *    private address space. (A tiny race between this lookup and the connect
 *    remains; it cannot be closed without pinning the connection.)
 */
const dns = require('dns');
const net = require('net');
const { isPrivateAddress, normaliseHost } = require('./net-guard');

const CREDENTIAL_HEADERS = ['authorization', 'x-api-key', 'cookie'];
const DEFAULT_TIMEOUT_MS = 45000;

async function assertPublicResolution(hostname, lookup) {
    const host = normaliseHost(hostname);
    if (net.isIP(host)) return;
    const records = await lookup(host, { all: true });
    if (!records.length || records.some((r) => isPrivateAddress(r.address))) {
        throw new Error('URL host is not allowed');
    }
}

function stripCredentials(headers) {
    const out = {};
    for (const [key, value] of Object.entries(headers || {})) {
        if (!CREDENTIAL_HEADERS.includes(key.toLowerCase())) out[key] = value;
    }
    return out;
}

async function safeFetch(startUrl, options = {}) {
    const {
        validate,
        init = {},
        maxRedirects = 5,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        resolveCheck = false,
        fetchImpl = fetch,
        lookup = dns.promises.lookup,
    } = options;

    let current = validate(startUrl);
    let requestInit = { ...init };
    for (let hop = 0; hop <= maxRedirects; hop++) {
        if (resolveCheck) await assertPublicResolution(new URL(current).hostname, lookup);
        const deadline = AbortSignal.timeout(timeoutMs);
        const signal = requestInit.signal ? AbortSignal.any([requestInit.signal, deadline]) : deadline;
        let response;
        try {
            response = await fetchImpl(current, { ...requestInit, signal, redirect: 'manual' });
        } catch (error) {
            if (deadline.aborted) throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
            throw error;
        }
        const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
        if (!location) return response;

        const next = validate(new URL(location, current).toString());
        if (new URL(next).origin !== new URL(current).origin) {
            requestInit = { ...requestInit, headers: stripCredentials(requestInit.headers) };
        }
        if (response.status !== 307 && response.status !== 308) {
            requestInit = { ...requestInit, method: 'GET', body: undefined };
        }
        current = next;
    }
    throw new Error('Too many redirects');
}

/** Read a response body, aborting once `maxBytes` is exceeded. Returns a Buffer. */
async function readCapped(response, maxBytes) {
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) {
        throw new Error(`Response size limit exceeded (${Math.round(maxBytes / 1048576)}MB)`);
    }
    if (!response.body) return Buffer.alloc(0);
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel().catch(() => {});
            throw new Error(`Response size limit exceeded (${Math.round(maxBytes / 1048576)}MB)`);
        }
        chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
}

module.exports = { safeFetch, readCapped };
