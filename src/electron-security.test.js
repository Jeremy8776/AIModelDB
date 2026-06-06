import { describe, expect, it } from 'vitest';
import { validateExternalUrl, validateProxyRequest } from '../electron/security.js';

describe('Electron security helpers', () => {
  it('rejects unsafe external URL protocols', () => {
    expect(validateExternalUrl('https://example.com')).toBe('https://example.com/');
    for (const url of ['javascript:alert(1)', 'file:///C:/Windows/System32/calc.exe']) {
      expect(validateExternalUrl(url)).toBeNull();
    }
  });

  it('rejects proxy requests to private or untrusted destinations', () => {
    expect(validateProxyRequest({ url: 'https://huggingface.co/api/models', method: 'GET' }).url).toBe('https://huggingface.co/api/models');
    for (const url of ['http://127.0.0.1:11434/api/tags', 'https://evil.example/api']) {
      expect(() => validateProxyRequest({ url, method: 'GET' })).toThrow(/not allowed/);
    }
  });
});
