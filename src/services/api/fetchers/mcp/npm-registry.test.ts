import { describe, expect, it } from 'vitest';
import { npmObjectToMCPServer } from './npm-registry';
import { validateMCPServers } from '../../schemas';

describe('npm Registry MCP Fetcher mapping & security', () => {
    const rawNpmObj = {
        package: {
            name: '@scope/mcp-server-test',
            version: '1.2.3',
            description: 'Test npm MCP package description',
            keywords: ['mcp-server', 'node'],
            date: '2026-06-07T12:00:00Z',
            links: {
                npm: 'https://www.npmjs.com/package/@scope/mcp-server-test',
                homepage: 'https://mcp-server.example',
                repository: 'https://github.com/scope-owner/mcp-server-test',
            },
            publisher: { username: 'publisher-user' },
            maintainers: [{ username: 'maintainer-1' }],
            license: 'Apache-2.0',
        },
        score: { final: 0.95 },
    };

    it('should correctly map standard npm registry search results', () => {
        const mapped = npmObjectToMCPServer(rawNpmObj);

        expect(mapped.id).toBe('io.npm.publisher-user/scope-mcp-server-test');
        expect(mapped.name).toBe('@scope/mcp-server-test');
        expect(mapped.description).toBe('Test npm MCP package description');
        expect(mapped.repository?.url).toBe('https://github.com/scope-owner/mcp-server-test');
        expect(mapped.websiteUrl).toBe('https://mcp-server.example');
        expect(mapped.license?.name).toBe('Apache-2.0');
        expect(mapped.tags).toEqual(['mcp-server', 'node']);
        expect(mapped.version).toBe('1.2.3');
        expect(mapped.packages).toBeDefined();
        expect(mapped.packages?.[0]?.registryType).toBe('npm');
        expect(mapped.packages?.[0]?.identifier).toBe('@scope/mcp-server-test');
        expect(mapped.source).toBe('npm');
    });

    it('should strip out malicious and unexpected fields when passing through Zod schema validation', () => {
        const mapped = npmObjectToMCPServer({
            package: {
                ...rawNpmObj.package,
                // Inject unexpected properties into the package object
                ...({
                    maliciousNpmField: 'npm-exploit',
                    __proto__: { polluted: 'yes' },
                } as any),
            },
        });

        // Run through MCPServerSchema validator
        const validated = validateMCPServers([mapped]);

        expect(validated).toHaveLength(1);
        const server = validated[0];

        // Verify unexpected fields are stripped and prototype is not polluted
        expect((server as any).maliciousNpmField).toBeUndefined();
        expect((server as any).polluted).toBeUndefined();
        expect(Object.getPrototypeOf(server)).toBe(Object.prototype);
    });
});
