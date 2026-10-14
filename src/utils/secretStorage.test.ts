import { afterEach, describe, expect, it, vi } from 'vitest';
import { protectSecret, revealSecret } from './secretStorage';

const CIPHERTEXT = 'ab'.repeat(120);

function stubElectron(api: Record<string, unknown> | undefined) {
    vi.stubGlobal('window', { electronAPI: api });
}

afterEach(() => vi.unstubAllGlobals());

describe('protectSecret', () => {
    it('stores the encrypted value when the keystore works', async () => {
        stubElectron({ encryptString: vi.fn().mockResolvedValue(CIPHERTEXT) });
        expect(await protectSecret('sk-live-123')).toBe(CIPHERTEXT);
    });

    it('keeps the key (marked plain) instead of wiping it when the keystore is unavailable', async () => {
        stubElectron({ encryptString: vi.fn().mockResolvedValue(null) });
        expect(await protectSecret('sk-live-123')).toBe('plain:sk-live-123');
    });

    it('stores as-is in a plain browser and returns empty for empty input', async () => {
        stubElectron(undefined);
        expect(await protectSecret('sk-live-123')).toBe('sk-live-123');
        expect(await protectSecret('')).toBe('');
    });
});

describe('revealSecret', () => {
    it('decrypts stored ciphertext', async () => {
        const decryptString = vi.fn().mockResolvedValue('sk-live-123');
        stubElectron({ decryptString });
        expect(await revealSecret(CIPHERTEXT)).toBe('sk-live-123');
        expect(decryptString).toHaveBeenCalledWith(CIPHERTEXT);
    });

    it('unwraps plain-marked values without calling the keystore', async () => {
        const decryptString = vi.fn();
        stubElectron({ decryptString });
        expect(await revealSecret('plain:sk-live-123')).toBe('sk-live-123');
        expect(decryptString).not.toHaveBeenCalled();
    });

    it('returns legacy plaintext keys untouched, including short hex-only ones', async () => {
        const decryptString = vi.fn();
        stubElectron({ decryptString });
        expect(await revealSecret('sk-ant-api03-xyz')).toBe('sk-ant-api03-xyz');
        expect(await revealSecret('0123456789abcdef0123456789abcdef')).toBe('0123456789abcdef0123456789abcdef');
        expect(decryptString).not.toHaveBeenCalled();
    });

    it('returns empty when real ciphertext cannot be decrypted', async () => {
        stubElectron({ decryptString: vi.fn().mockResolvedValue(null) });
        expect(await revealSecret(CIPHERTEXT)).toBe('');
    });
});
