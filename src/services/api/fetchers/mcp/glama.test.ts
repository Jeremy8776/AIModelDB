import { describe, expect, it } from 'vitest';
import { mapGlamaServerToMCPServer } from './glama';

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

