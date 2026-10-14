import { describe, expect, it, vi } from 'vitest';
import { safeFetch, readCapped } from '../electron/safe-fetch.js';
import { validateProxyRequest } from '../electron/security.js';

const redirect = (location, status = 302) => new Response(null, { status, headers: { location } });
const ok = (body = 'ok') => new Response(body, { status: 200 });
const validate = (url) => validateProxyRequest({ url }).url;

describe('safeFetch', () => {
  it('follows redirects only to hosts that pass validation', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(redirect('https://huggingface.co/final'))
      .mockResolvedValueOnce(ok());
    const res = await safeFetch('https://github.com/start', { validate, fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual(['https://github.com/start', 'https://huggingface.co/final']);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual');
  });

  it('refuses a redirect onto a private or non-allowlisted host', async () => {
    for (const target of ['https://169.254.169.254/latest', 'https://[::1]/', 'https://evil.example/', 'http://127.0.0.1:9/']) {
      const fetchImpl = vi.fn().mockResolvedValueOnce(redirect(target));
      await expect(safeFetch('https://github.com/start', { validate, fetchImpl }), target).rejects.toThrow(/not allowed/);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('drops credentials when a redirect changes origin', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(redirect('https://huggingface.co/x'))
      .mockResolvedValueOnce(ok());
    await safeFetch('https://github.com/start', {
      validate,
      fetchImpl,
      init: { headers: { Authorization: 'Bearer secret', Accept: 'application/json' } },
    });
    expect(fetchImpl.mock.calls[1][1].headers).toEqual({ Accept: 'application/json' });
  });

  it('stops after too many redirects', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => redirect('https://github.com/loop'));
    await expect(safeFetch('https://github.com/start', { validate, fetchImpl, maxRedirects: 3 })).rejects.toThrow(/Too many redirects/);
  });

  it('rejects hosts whose DNS resolves to private space when resolveCheck is set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok());
    const lookup = vi.fn().mockResolvedValue([{ address: '10.0.0.7', family: 4 }]);
    await expect(
      safeFetch('https://rebind.example.org/x', { validate: (u) => u, fetchImpl, lookup, resolveCheck: true }),
    ).rejects.toThrow(/not allowed/);
    expect(fetchImpl).not.toHaveBeenCalled();
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    await expect(
      safeFetch('https://example.org/x', { validate: (u) => u, fetchImpl, lookup, resolveCheck: true }),
    ).resolves.toBeDefined();
  });
});

describe('readCapped', () => {
  it('returns the body when under the cap', async () => {
    expect((await readCapped(ok('hello'), 100)).toString()).toBe('hello');
  });

  it('aborts when the streamed body exceeds the cap', async () => {
    await expect(readCapped(ok('x'.repeat(50)), 10)).rejects.toThrow(/size limit/);
  });

  it('rejects early on an oversized content-length', async () => {
    const res = new Response('x', { headers: { 'content-length': '999999' } });
    await expect(readCapped(res, 10)).rejects.toThrow(/size limit/);
  });
});

describe('safeFetch timeout', () => {
    // A server that accepts the connection and then never answers.
    const hangingFetch = (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });

    it('gives up on a stalled server with a readable error instead of hanging', async () => {
        const started = Date.now();
        await expect(safeFetch('https://example.com/slow', { validate: (u) => u, fetchImpl: hangingFetch, timeoutMs: 50 }))
            .rejects.toThrow('Request timed out after 0s');
        expect(Date.now() - started).toBeLessThan(2000);
    });

    it('does not mistake the caller\'s own abort for a timeout', async () => {
        const controller = new AbortController();
        const pending = safeFetch('https://example.com/slow', { validate: (u) => u, fetchImpl: hangingFetch, timeoutMs: 5000, init: { signal: controller.signal } });
        controller.abort(new Error('cancelled by user'));
        await expect(pending).rejects.toThrow('cancelled by user');
    });

    it('passes a signal to every redirect hop', async () => {
        const signals = [];
        const fetchImpl = vi.fn(async (url, init) => {
            signals.push(init.signal);
            return url.endsWith('/a')
                ? new Response(null, { status: 302, headers: { location: 'https://example.com/b' } })
                : new Response('ok', { status: 200 });
        });
        const response = await safeFetch('https://example.com/a', { validate: (u) => u, fetchImpl });
        expect(response.status).toBe(200);
        expect(signals).toHaveLength(2);
        expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true);
    });
});
