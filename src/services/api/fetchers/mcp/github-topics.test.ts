import { describe, expect, it } from 'vitest';
import { repoToMCPServer } from './github-topics';
import { validateMCPServers } from '../../schemas';

describe('GitHub Topics MCP Fetcher mapping & security', () => {
    const rawRepo = {
        full_name: 'test-owner/test-server',
        name: 'test-server',
        description: 'Test MCP Server description',
        html_url: 'https://github.com/test-owner/test-server',
        homepage: 'https://test-server.example',
        pushed_at: '2026-06-07T12:00:00Z',
        created_at: '2026-06-05T10:00:00Z',
        stargazers_count: 42,
        topics: ['mcp-server', 'typescript'],
        license: { spdx_id: 'MIT', name: 'MIT License' },
        owner: { login: 'test-owner' },
    };

    it('should correctly map standard GitHub repository details', () => {
        const mapped = repoToMCPServer(rawRepo);

        expect(mapped.id).toBe('io.github.test-owner/test-server');
        expect(mapped.name).toBe('test-server');
        expect(mapped.description).toBe('Test MCP Server description');
        expect(mapped.repository?.url).toBe('https://github.com/test-owner/test-server');
        expect(mapped.websiteUrl).toBe('https://test-server.example');
        expect(mapped.license?.name).toBe('MIT');
        expect(mapped.tags).toEqual(['mcp-server', 'typescript']);
        expect(mapped.downloads).toBe(42);
        expect(mapped.source).toBe('github-topics');
    });

    it('should strip out malicious and unexpected fields when passing through Zod schema validation', () => {
        const mapped = repoToMCPServer({
            ...rawRepo,
            // Inject unexpected properties into the repository object
            ...({
                maliciousField: 'exploit-payload',
                __proto__: { polluted: 'yes' },
            } as any),
        });

        // Run through MCPServerSchema validator
        const validated = validateMCPServers([mapped]);

        expect(validated).toHaveLength(1);
        const server = validated[0];

        // Verify unexpected fields are stripped and prototype is not polluted
        expect((server as any).maliciousField).toBeUndefined();
        expect((server as any).polluted).toBeUndefined();
        expect(Object.getPrototypeOf(server)).toBe(Object.prototype);
    });
});
