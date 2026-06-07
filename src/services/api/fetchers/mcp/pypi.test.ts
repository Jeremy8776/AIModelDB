import { describe, expect, it } from 'vitest';
import { mapPyPIPackageToMCPServer } from './pypi';

describe('mapPyPIPackageToMCPServer', () => {
    it('maps PyPI metadata with package coordinates and repository identity', () => {
        const server = mapPyPIPackageToMCPServer({
            info: {
                name: 'mcp-server-demo',
                version: '1.2.3',
                summary: 'Demo MCP server',
                license_expression: 'MIT',
                keywords: 'mcp server demo',
                project_urls: { Repository: 'https://github.com/acme/mcp-server-demo' },
            },
            releases: {
                '1.2.3': [{ upload_time_iso_8601: '2026-01-02T03:04:05Z' }],
            },
        });

        expect(server.id).toBe('io.github.acme/mcp-server-demo');
        expect(server.source).toBe('pypi');
        expect(server.packages?.[0]).toMatchObject({ registryType: 'pypi', identifier: 'mcp-server-demo' });
        expect(server.updatedAt).toBe('2026-01-02T03:04:05Z');
        expect(server.license?.name).toBe('MIT');
    });
});

