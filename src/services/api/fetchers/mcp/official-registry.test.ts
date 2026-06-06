import { describe, it, expect } from 'vitest';
import { mapRegistryEntryToMCPServer } from './official-registry';

describe('mapRegistryEntryToMCPServer', () => {
    it('maps a minimal entry (remote-only, no packages) into the canonical shape', () => {
        const raw = {
            server: {
                name: 'ac.inference.sh/mcp',
                title: 'inference.sh',
                description: 'Run AI apps via MCP',
                version: '1.0.1',
                remotes: [
                    { type: 'streamable-http', url: 'https://sh.inference.ac' },
                    { type: 'streamable-http', url: 'https://api.inference.sh/mcp' },
                ],
            },
            _meta: {
                'io.modelcontextprotocol.registry/official': {
                    status: 'active' as const,
                    publishedAt: '2026-04-13T17:33:26.613537Z',
                    updatedAt: '2026-04-13T17:33:26.613537Z',
                    isLatest: true,
                },
            },
        };

        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.id).toBe('ac.inference.sh/mcp');
        expect(result.name).toBe('inference.sh'); // title preferred for display
        expect(result.version).toBe('1.0.1');
        expect(result.remotes).toHaveLength(2);
        expect(result.remotes?.[0].type).toBe('streamable-http');
        expect(result.packages).toBeUndefined();
        expect(result.namespaceVerified).toBe(true); // active status -> verified
        expect(result.source).toBe('mcp-registry');
        expect(result.editedFields).toEqual([]);
    });

    it('maps a full entry with packages, environmentVariables, repository', () => {
        const raw = {
            server: {
                name: 'com.pulsemcp/remote-filesystem',
                description: 'MCP server for remote filesystem operations.',
                version: '0.1.2',
                repository: {
                    url: 'https://github.com/pulsemcp/mcp-servers',
                    source: 'github',
                    subfolder: 'experimental/remote-filesystem',
                },
                packages: [
                    {
                        registryType: 'npm',
                        registryBaseUrl: 'https://registry.npmjs.org',
                        identifier: 'remote-filesystem-mcp-server',
                        version: '0.1.2',
                        runtimeHint: 'npx',
                        transport: { type: 'stdio' },
                        runtimeArguments: [{ value: '-y', type: 'positional' }],
                        environmentVariables: [
                            { name: 'GCS_BUCKET', isRequired: true },
                        ],
                    },
                ],
            },
            _meta: {
                'io.modelcontextprotocol.registry/official': {
                    status: 'active' as const,
                    publishedAt: '2026-01-01T00:00:00Z',
                },
            },
        };

        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.id).toBe('com.pulsemcp/remote-filesystem');
        // No title -> name field used as display name
        expect(result.name).toBe('com.pulsemcp/remote-filesystem');
        expect(result.repository).toEqual({
            url: 'https://github.com/pulsemcp/mcp-servers',
            source: 'github',
        });
        expect(result.packages?.[0].registryType).toBe('npm');
        expect(result.packages?.[0].runtimeHint).toBe('node'); // npx -> node
        expect(result.packages?.[0].runtimeArguments).toHaveLength(1);
        expect(result.packages?.[0].transport).toEqual({ type: 'stdio' });
        expect(result.packages?.[0].environmentVariables).toEqual([
            { name: 'GCS_BUCKET', isRequired: true },
        ]);
    });

    it('treats deleted status as not-verified', () => {
        const raw = {
            server: { name: 'x/y', description: 'gone' },
            _meta: {
                'io.modelcontextprotocol.registry/official': {
                    status: 'deleted' as const,
                },
            },
        };
        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.namespaceVerified).toBe(false);
    });

    it('normalizes legacy http/https transport names to streamable-http', () => {
        const raw = {
            server: {
                name: 'x/y',
                remotes: [{ type: 'http', url: 'https://example.com' }],
            },
        };
        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.remotes?.[0].type).toBe('streamable-http');
    });

    it('normalizes runtimeHint values for python and docker', () => {
        const raw = {
            server: {
                name: 'x/y',
                packages: [
                    { registryType: 'pypi', identifier: 'foo', runtimeHint: 'uvx' },
                    { registryType: 'oci', identifier: 'foo/bar', runtimeHint: 'docker' },
                ],
            },
        };
        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.packages?.[0].runtimeHint).toBe('python');
        expect(result.packages?.[1].runtimeHint).toBe('docker');
    });

    it('falls back to "other" for unknown registry types', () => {
        const raw = {
            server: {
                name: 'x/y',
                packages: [{ registryType: 'crates', identifier: 'foo' }],
            },
        };
        const result = mapRegistryEntryToMCPServer(raw);
        expect(result.packages?.[0].registryType).toBe('other');
    });
});
