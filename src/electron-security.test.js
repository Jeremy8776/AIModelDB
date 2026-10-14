import { describe, expect, it } from 'vitest';
import {
  validateExternalUrl,
  validateProxyRequest,
  validateImageUrl,
  validateImportUrl,
  isPrivateHost,
  isTrustedSenderUrl,
} from '../electron/security.js';

describe('Electron security helpers', () => {
  it('rejects unsafe external URL protocols', () => {
    expect(validateExternalUrl('https://example.com')).toBe('https://example.com/');
    for (const url of ['javascript:alert(1)', 'file:///C:/Windows/System32/calc.exe']) {
      expect(validateExternalUrl(url)).toBeNull();
    }
  });

  it('rejects proxy requests to private or untrusted destinations', () => {
    expect(validateProxyRequest({ url: 'https://huggingface.co/api/models', method: 'GET' }).url).toBe('https://huggingface.co/api/models');
    for (const url of ['http://169.254.169.254/latest', 'http://127.0.0.1:8080/x', 'https://evil.example/api', 'https://[::1]/x']) {
      expect(() => validateProxyRequest({ url, method: 'GET' })).toThrow(/not allowed/);
    }
  });

  it('allows every provider host the app ships defaults for', () => {
    for (const url of [
      'https://api.deepseek.com/v1/models',
      'https://api.cohere.com/v1/models',
      'https://generativelanguage.googleapis.com/v1beta/models',
      'https://api.anthropic.com/v1/models',
      'https://openrouter.ai/api/v1/models',
    ]) {
      expect(validateProxyRequest({ url }).url).toBe(url);
    }
  });

  it('allows local Ollama only on its default port', () => {
    expect(validateProxyRequest({ url: 'http://127.0.0.1:11434/api/tags' }).url).toBe('http://127.0.0.1:11434/api/tags');
    expect(validateProxyRequest({ url: 'http://localhost:11434/api/tags' }).url).toBe('http://localhost:11434/api/tags');
    expect(() => validateProxyRequest({ url: 'http://127.0.0.1:3000/' })).toThrow(/not allowed/);
    expect(() => validateProxyRequest({ url: 'http://192.168.1.5:11434/api/tags' })).toThrow(/not allowed/);
    expect(() => validateProxyRequest({ url: 'http://user:pw@127.0.0.1:11434/' })).toThrow(/not allowed/);
  });

  it('strips headers that are not on the allowlist', () => {
    const { headers } = validateProxyRequest({
      url: 'https://api.openai.com/v1/models',
      headers: { Authorization: 'Bearer x', Cookie: 'a=b', 'X-Evil': '1' },
    });
    expect(Object.keys(headers)).toEqual(['Authorization']);
  });

  it('accepts only public https import URLs', () => {
    expect(validateImportUrl('https://example.org/data.csv')).toBe('https://example.org/data.csv');
    for (const url of ['http://example.org/x', 'https://[::1]/x', 'https://[::ffff:7f00:1]/x', 'https://u:p@example.org/x']) {
      expect(() => validateImportUrl(url)).toThrow();
    }
  });

  it('trusts IPC only from the packaged page or the dev server', () => {
    expect(isTrustedSenderUrl('file:///C:/app/dist/index.html')).toBe(true);
    expect(isTrustedSenderUrl('http://localhost:5173/', { isDev: true })).toBe(true);
    expect(isTrustedSenderUrl('http://localhost:5173/')).toBe(false);
    expect(isTrustedSenderUrl('http://localhost.evil.com/', { isDev: true })).toBe(false);
    expect(isTrustedSenderUrl('https://evil.com/')).toBe(false);
    expect(isTrustedSenderUrl(undefined)).toBe(false);
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

  it('blocks private hosts as the real URL parser reports them', () => {
    for (const raw of [
      'https://[::1]/', 'https://[::ffff:127.0.0.1]/', 'https://[::ffff:a9fe:a9fe]/', 'https://[fe80::1]/',
      'https://[fec0::1]/', 'https://[64:ff9b::7f00:1]/', 'https://0.0.0.0/', 'https://100.64.0.1/',
      'https://localhost./', 'https://127.1/', 'https://2130706433/', 'https://printer.local/', 'https://intranet/',
    ]) {
      expect(isPrivateHost(new URL(raw).hostname), raw).toBe(true);
    }
    for (const raw of ['https://huggingface.co/', 'https://8.8.8.8/', 'https://[2606:4700:4700::1111]/']) {
      expect(isPrivateHost(new URL(raw).hostname), raw).toBe(false);
    }
  });
});
