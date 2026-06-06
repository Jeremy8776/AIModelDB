import { describe, expect, it } from 'vitest';
import { buildSearchSuggestions } from './searchSuggestions';
import { Model, MCPServer, Skill } from '../types';

const model = (overrides: Partial<Model>): Model => ({
    id: 'model-1',
    name: 'Llama 3',
    provider: 'Meta',
    domain: 'LLM',
    source: 'HuggingFace',
    license: {
        name: 'LLAMA',
        type: 'Custom',
        commercial_use: true,
        attribution_required: false,
        share_alike: false,
        copyleft: false,
    },
    hosting: {
        weights_available: true,
        api_available: false,
        on_premise_friendly: true,
    },
    ...overrides,
});

const mcpServer = (overrides: Partial<MCPServer>): MCPServer => ({
    id: 'io.github.context/filesystem',
    name: 'Filesystem MCP',
    description: 'Access local files',
    source: 'mcp-registry',
    packages: [],
    remotes: [],
    capabilities: [],
    editedFields: [],
    ...overrides,
});

const skill = (overrides: Partial<Skill>): Skill => ({
    id: 'skill-code-review',
    name: 'Code Review',
    description: 'Review source code',
    source: 'Claude Plugins',
    tags: ['review'],
    editedFields: [],
    ...overrides,
});

describe('buildSearchSuggestions', () => {
    it('shows syntax hints before the user types', () => {
        const suggestions = buildSearchSuggestions({
            query: '',
            models: [],
            mcp: [],
            skills: [],
        });

        expect(suggestions.some(item => item.kind === 'hint' && item.value.startsWith('provider:'))).toBe(true);
        expect(suggestions.some(item => item.kind === 'hint' && item.value.startsWith('source:'))).toBe(true);
    });

    it('returns cross-entity result suggestions for a typed query', () => {
        const suggestions = buildSearchSuggestions({
            query: 'llama',
            models: [model({ name: 'Llama 3 70B' })],
            mcp: [mcpServer({ name: 'Filesystem MCP' })],
            skills: [skill({ name: 'Code Review' })],
        });

        expect(suggestions[0]).toMatchObject({
            kind: 'result',
            entity: 'models',
            label: 'Llama 3 70B',
        });
    });

    it('falls back to operator hints when no records match', () => {
        const suggestions = buildSearchSuggestions({
            query: 'provider:',
            models: [model({ provider: 'Meta' })],
            mcp: [],
            skills: [],
        });

        expect(suggestions).toContainEqual(expect.objectContaining({
            kind: 'hint',
            value: 'provider:Meta',
        }));
    });
});
