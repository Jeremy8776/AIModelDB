import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMCPServersFromGlama, GlamaAuthError, mapGlamaServerToMCPServer } from './glama';

describe('mapGlamaServerToMCPServer', () => {
    it('prefers a GitHub-derived stable id and marks directory verification', () => {
        const server = mapGlamaServerToMCPServer({
            id: 'abc',
            name: 'Filesystem',
            slug: 'filesystem',
            namespace: 'modelcontextprotocol',
            description: 'File operations',
            repository: { url: 'https://github.com/modelcontextprotocol/servers.git' },
            spdxLicense: { name: 'MIT', url: 'https://example.test/license' },
            tools: [{ name: 'read_file' }],
            attributes: ['filesystem'],
        });

        expect(server.id).toBe('io.github.modelcontextprotocol/servers');
        expect(server.source).toBe('glama');
        expect(server.directoryVerified).toBe(true);
        expect(server.capabilities).toEqual(['tools']);
        expect(server.license?.name).toBe('MIT');
    });
});

describe('fetchMCPServersFromGlama auth', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('refuses to call the API without a key, with a message that says what to do', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);
        await expect(fetchMCPServersFromGlama({})).rejects.toThrow(GlamaAuthError);
        await expect(fetchMCPServersFromGlama({ apiKey: '   ' })).rejects.toThrow(/Settings > Data Sources/);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sends the key as a bearer token', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ servers: [], pageInfo: { hasNextPage: false } }), { status: 200 }));
        vi.stubGlobal('fetch', fetchSpy);
        await fetchMCPServersFromGlama({ apiKey: 'glama_test' });
        expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer glama_test');
    });

    it('turns a 401 into an actionable error instead of "Request failed: 401"', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401, statusText: 'Unauthorized' })));
        await expect(fetchMCPServersFromGlama({ apiKey: 'bad' })).rejects.toThrow(/rejected the API key/);
    });
});

