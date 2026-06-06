import { describe, expect, it } from 'vitest';
import { buildDatabaseExportBundle } from './exportBundle';
import { Model, MCPServer, Skill } from '../types';

const model: Model = {
    id: 'model-1',
    name: 'Model One',
    provider: 'Provider',
    domain: 'LLM',
    source: 'Import',
    license: {
        name: 'MIT',
        type: 'OSI',
        commercial_use: true,
        attribution_required: false,
        share_alike: false,
        copyleft: false,
    },
    hosting: {
        weights_available: true,
        api_available: true,
        on_premise_friendly: true,
    },
};

const server: MCPServer = {
    id: 'server-1',
    name: 'Server One',
    source: 'mcp-registry',
    editedFields: [],
};

const skill: Skill = {
    id: 'skill-1',
    name: 'Skill One',
    type: 'skill',
    origin: 'community-curated',
    source: 'Claude Plugins',
    redistributable: 'yes',
    editedFields: [],
};

describe('buildDatabaseExportBundle', () => {
    it('exports all entity collections with counts', () => {
        const bundle = buildDatabaseExportBundle([model], [server], [skill], '2026-06-05T12:00:00.000Z');

        expect(bundle.counts).toEqual({ models: 1, mcpServers: 1, skills: 1 });
        expect(bundle.models).toEqual([model]);
        expect(bundle.mcpServers).toEqual([server]);
        expect(bundle.skills).toEqual([skill]);
    });
});
