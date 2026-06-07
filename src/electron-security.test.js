import { describe, expect, it } from 'vitest';
import { validateExternalUrl, validateProxyRequest, validateImageUrl, isPrivateHost } from '../electron/security.js';

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

  it('validates image URLs correctly', () => {
    expect(validateImageUrl('https://huggingface.co/logo.png')).toBe('https://huggingface.co/logo.png');
    expect(() => validateImageUrl('https://evil.com/logo.png')).toThrow(/Image host is not allowed/);
    expect(() => validateImageUrl('http://huggingface.co/logo.png')).toThrow(/URL protocol is not allowed/);
  });

  it('identifies private hosts correctly', () => {
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('10.0.0.1')).toBe(true);
    expect(isPrivateHost('192.168.1.5')).toBe(true);
    expect(isPrivateHost('huggingface.co')).toBe(false);
  });
});
