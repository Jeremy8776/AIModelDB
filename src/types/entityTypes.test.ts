import { describe, it, expect } from 'vitest';
import {
    ENTITY_TYPES,
    type EntityType,
    type MCPServer,
    type MCPPackage,
    type MCPRemote,
    type Skill,
    type SkillType,
    type SkillOrigin,
    type SkillRedistribution,
    type SkillRuntime,
} from './index';

describe('EntityType', () => {
    it('exposes exactly three entity types in stable order', () => {
        expect(ENTITY_TYPES).toEqual(['models', 'mcp', 'skills']);
    });

    it('each entity is a valid EntityType string literal', () => {
        const assertType = (e: EntityType) => e;
        expect(assertType('models')).toBe('models');
        expect(assertType('mcp')).toBe('mcp');
        expect(assertType('skills')).toBe('skills');
    });
});

describe('MCPServer type contract', () => {
    it('accepts a minimal record with required fields only', () => {
        const server: MCPServer = {
            id: 'io.github.example/server',
            name: 'Example MCP',
            source: 'mcp-registry',
        };
        expect(server.id).toBe('io.github.example/server');
        expect(server.editedFields).toBeUndefined();
    });

    it('accepts a fully-populated record matching official registry schema', () => {
        const pkg: MCPPackage = {
            registryType: 'npm',
            identifier: '@modelcontextprotocol/server-filesystem',
            version: '1.0.0',
            runtimeHint: 'node',
        };
        const remote: MCPRemote = {
            type: 'stdio',
            headers: [{ name: 'API_KEY', isRequired: true, isSecret: true }],
        };
        const server: MCPServer = {
            id: 'io.github.modelcontextprotocol/filesystem',
            name: '@modelcontextprotocol/server-filesystem',
            description: 'Filesystem MCP server',
            version: '1.0.0',
            repository: {
                url: 'https://github.com/modelcontextprotocol/servers',
                source: 'github',
            },
            packages: [pkg],
            remotes: [remote],
            capabilities: ['tools', 'resources'],
            source: 'mcp-registry, docker',
            namespaceVerified: true,
            imageVerified: true,
            directoryVerified: false,
            license: {
                name: 'MIT',
                type: 'OSI',
                commercial_use: true,
                attribution_required: false,
                share_alike: false,
                copyleft: false,
            },
            tags: ['filesystem', 'official'],
            downloads: 12000,
            isFavorite: true,
            editedFields: ['description'],
            _meta: { 'com.docker.signed': true },
        };
        expect(server.packages?.[0].registryType).toBe('npm');
        expect(server.remotes?.[0].type).toBe('stdio');
        expect(server.namespaceVerified).toBe(true);
    });

    it('keeps verification flags independent (not one merged boolean)', () => {
        const server: MCPServer = {
            id: 'x',
            name: 'x',
            source: 's',
            namespaceVerified: false,
            imageVerified: true,
            directoryVerified: false,
        };
        // Docker-signed but not namespace-verified — valid combination
        expect(server.imageVerified).toBe(true);
        expect(server.namespaceVerified).toBe(false);
    });
});

describe('Skill type contract', () => {
    it('accepts a minimal record', () => {
        const skill: Skill = {
            id: 'anthropic/skills/canvas-design',
            name: 'canvas-design',
            type: 'skill',
            origin: 'anthropic-official',
            source: 'anthropic-skills',
            redistributable: 'yes',
        };
        expect(skill.type).toBe('skill');
        expect(skill.redistributable).toBe('yes');
    });

    it('encodes the Anthropic source-available constraint via redistributable', () => {
        // docx/pdf/pptx/xlsx skills are source-available, NOT redistributable
        const skill: Skill = {
            id: 'anthropic/skills/docx',
            name: 'docx',
            type: 'skill',
            origin: 'anthropic-official',
            source: 'anthropic-skills',
            redistributable: 'metadata-only',
        };
        expect(skill.redistributable).toBe('metadata-only');
    });

    it('supports the full SKILL.md frontmatter shape with dependencies', () => {
        const skill: Skill = {
            id: 'cowork/brand-voice/discover-brand',
            name: 'discover-brand',
            description: 'Search platforms for brand materials',
            type: 'plugin',
            origin: 'cowork-official',
            family: 'brand-voice',
            triggers: ['discover brand', 'find brand materials'],
            capabilities: ['multi-platform-search', 'document-analysis'],
            requires: {
                mcps: ['notion', 'google-drive'],
                api_keys: ['NOTION_TOKEN'],
                runtimes: ['claude-code', 'claude-ai'],
            },
            source: 'knowledge-work-plugins',
            source_repo: {
                owner: 'anthropics',
                repo: 'knowledge-work-plugins',
                path: 'brand-voice/skills/discover-brand',
            },
            redistributable: 'yes',
            license: {
                name: 'Apache-2.0',
                type: 'OSI',
                commercial_use: true,
                attribution_required: true,
                share_alike: false,
                copyleft: false,
            },
            tags: ['brand', 'discovery'],
            isFavorite: false,
            editedFields: [],
        };
        expect(skill.requires?.mcps).toContain('notion');
        expect(skill.requires?.runtimes).toContain('claude-code');
        expect(skill.source_repo?.owner).toBe('anthropics');
    });

    it('accepts all valid SkillType, SkillOrigin, SkillRuntime values', () => {
        const types: SkillType[] = ['skill', 'plugin', 'rule', 'prompt', 'recipe', 'app'];
        const origins: SkillOrigin[] = [
            'anthropic-official', 'cowork-official', 'agentskills-spec',
            'community-curated', 'open-submission', 'third-party',
        ];
        const redistribution: SkillRedistribution[] = ['yes', 'metadata-only', 'no'];
        const runtimes: SkillRuntime[] = [
            'claude-code', 'claude-ai', 'codex', 'cursor',
            'windsurf', 'roo', 'cline', 'goose', 'generic',
        ];
        expect(types).toHaveLength(6);
        expect(origins).toHaveLength(6);
        expect(redistribution).toHaveLength(3);
        expect(runtimes).toHaveLength(9);
    });
});
