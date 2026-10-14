/**
 * Persistence helpers for API keys and tokens held in localStorage.
 *
 * In Electron the key is encrypted with the OS keystore (safeStorage) and stored
 * as hex. Two situations used to silently destroy keys and are handled here:
 *  - the OS keystore is unavailable (e.g. Linux without a keyring): the key is
 *    kept with a `plain:` marker instead of being replaced with an empty string;
 *  - the stored value pre-dates encryption (legacy plaintext): it is returned
 *    as-is instead of failing to decrypt and being blanked.
 * In a plain browser there is no keystore, so values are stored unchanged.
 */
const PLAIN_PREFIX = 'plain:';
const HEX = /^(?:[0-9a-f]{2})+$/i;
// Real safeStorage blobs are far longer than any API key, even a hex-only one.
const MIN_CIPHERTEXT_HEX_LENGTH = 64;

export async function protectSecret(value: string): Promise<string> {
    if (!value) return '';
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    if (!api?.encryptString) return value;
    const encrypted = await api.encryptString(value);
    return encrypted || PLAIN_PREFIX + value;
}

export async function revealSecret(stored: string): Promise<string> {
    if (!stored) return '';
    if (stored.startsWith(PLAIN_PREFIX)) return stored.slice(PLAIN_PREFIX.length);
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    if (!api?.decryptString) return stored;
    if (!HEX.test(stored) || stored.length < MIN_CIPHERTEXT_HEX_LENGTH) return stored;
    return (await api.decryptString(stored)) ?? '';
}
