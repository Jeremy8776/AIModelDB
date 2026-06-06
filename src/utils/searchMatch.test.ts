import { describe, expect, it } from 'vitest';
import { countQueryMatches, matchesMCP, matchesModel, matchesSkill } from './searchMatch';
import { Model, MCPServer, Skill } from '../types';

const model = (over: Partial<Model> = {}): Model => ({
    id: 'm', name: 'Llama 3', provider: 'Meta', domain: 'LLM', source: 'hf',
    license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false },
    hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
    description: 'Open weights LLM', tags: ['open-source'],
    ...over,
} as Model);

const mcp = (over: Partial<MCPServer> = {}): MCPServer => ({
    id: 'io.example/server', name: 'Filesystem', description: 'Read files from disk', source: 'mcp-registry',
    ...over,
} as MCPServer);

const skill = (over: Partial<Skill> = {}): Skill => ({
    id: 's', name: 'Algorithmic Art', description: 'p5.js art', type: 'skill', origin: 'anthropic-official', source: 'anthropic',
    tags: ['art', 'creative'],
    ...over,
} as Skill);

describe('matchesModel', () => {
    it('matches across name, provider, description, tags', () => {
        const m = model();
        expect(matchesModel(m, 'llama')).toBe(true);
        expect(matchesModel(m, 'meta')).toBe(true);
        expect(matchesModel(m, 'weights')).toBe(true);
        expect(matchesModel(m, 'open-source')).toBe(true);
        expect(matchesModel(m, 'qwen')).toBe(false);
    });

    it('returns true on empty query', () => {
        expect(matchesModel(model(), '')).toBe(true);
    });
});

describe('matchesMCP', () => {
    it('matches name / description / id', () => {
        const s = mcp();
        expect(matchesMCP(s, 'filesystem')).toBe(true);
        expect(matchesMCP(s, 'disk')).toBe(true);
        expect(matchesMCP(s, 'example')).toBe(true);
        expect(matchesMCP(s, 'github')).toBe(false);
    });
});

describe('matchesSkill', () => {
    it('matches name / description / id / tags', () => {
        const s = skill();
        expect(matchesSkill(s, 'art')).toBe(true);
        expect(matchesSkill(s, 'p5')).toBe(true);
        expect(matchesSkill(s, 'creative')).toBe(true);
        expect(matchesSkill(s, 'video')).toBe(false);
    });
});

describe('countQueryMatches', () => {
    it('returns total counts when query is empty', () => {
        const result = countQueryMatches([model(), model()], [mcp()], [skill()], '');
        expect(result).toEqual({ models: 2, mcp: 1, skills: 1 });
    });

    it('counts matches per entity for a non-empty query', () => {
        const models = [model({ name: 'Llama 3' }), model({ name: 'Qwen 2' })];
        const mcps = [mcp({ name: 'Filesystem' }), mcp({ name: 'GitHub' })];
        const skills = [skill({ name: 'Skill A' })];
        const result = countQueryMatches(models, mcps, skills, 'github');
        expect(result.models).toBe(0);
        expect(result.mcp).toBe(1);
        expect(result.skills).toBe(0);
    });

    it('counts matches in the trimmed query', () => {
        const result = countQueryMatches([model({ name: 'Llama 3' })], [], [], '   ');
        expect(result.models).toBe(1);
    });
});
