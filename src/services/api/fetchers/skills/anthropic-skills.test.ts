import { describe, it, expect } from 'vitest';
import { mapAnthropicSkill, mapAnthropicMarketplace } from './anthropic-skills';

const examplePlugin = {
    name: 'example-skills',
    description: 'Skill creation, MCP building, visual design, algorithmic art.',
    category: 'examples',
    source: './',
    strict: false,
    skills: ['./skills/skill-creator', './skills/algorithmic-art'],
};

const documentPlugin = {
    name: 'document-skills',
    description: 'Document processing suite including Excel, Word, PowerPoint, and PDF.',
    source: './',
    skills: ['./skills/xlsx', './skills/docx', './skills/pptx', './skills/pdf'],
};

describe('mapAnthropicSkill', () => {
    it('maps a bundled SKILL.md path into a per-skill record', () => {
        const skill = mapAnthropicSkill(examplePlugin, './skills/skill-creator', '2026-05-29T00:00:00Z');
        expect(skill.id).toBe('anthropics/skills/skills/skill-creator');
        expect(skill.name).toBe('skill-creator');
        expect(skill.type).toBe('skill');
        expect(skill.origin).toBe('anthropic-official');
        expect(skill.family).toBe('example-skills');
        expect(skill.source).toBe('anthropic-skills');
        expect(skill.source_repo).toEqual({ owner: 'anthropics', repo: 'skills', path: 'skills/skill-creator' });
        expect(skill.updated_at).toBe('2026-05-29T00:00:00Z');
        expect(skill.editedFields).toEqual([]);
    });

    it('keeps a single key in source (merge layer accumulates, fetcher does not)', () => {
        const skill = mapAnthropicSkill(examplePlugin, './skills/algorithmic-art');
        expect(skill.source).toBe('anthropic-skills');
        expect(skill.source.includes(',')).toBe(false);
    });

    it('normalizes a SKILL.md-suffixed path to the skill directory', () => {
        const skill = mapAnthropicSkill(examplePlugin, 'skills/canvas-design/SKILL.md');
        expect(skill.id).toBe('anthropics/skills/skills/canvas-design');
        expect(skill.name).toBe('canvas-design');
        expect(skill.source_repo?.path).toBe('skills/canvas-design');
    });

    it('flags the source-available document skills as metadata-only / non-commercial', () => {
        const docx = mapAnthropicSkill(documentPlugin, './skills/docx');
        expect(docx.redistributable).toBe('metadata-only');
        expect(docx.license?.commercial_use).toBe(false);
        expect(docx.license?.type).toBe('Custom');
    });

    it('treats non-document skills as redistributable Apache-2.0', () => {
        const skill = mapAnthropicSkill(examplePlugin, './skills/skill-creator');
        expect(skill.redistributable).toBe('yes');
        expect(skill.license?.name).toBe('Apache-2.0');
        expect(skill.license?.type).toBe('OSI');
    });
});

describe('mapAnthropicMarketplace', () => {
    it('expands every plugin skills[] path into a distinct Skill, deduped by id', () => {
        const skills = mapAnthropicMarketplace(
            { plugins: [examplePlugin, documentPlugin] },
            '2026-05-29T00:00:00Z'
        );
        expect(skills).toHaveLength(6);
        const ids = skills.map(s => s.id);
        expect(new Set(ids).size).toBe(6);
        expect(ids).toContain('anthropics/skills/skills/skill-creator');
        expect(ids).toContain('anthropics/skills/skills/pdf');
        expect(skills.every(s => s.updated_at === '2026-05-29T00:00:00Z')).toBe(true);
    });

    it('falls back to a bundle-level plugin record when a plugin has no skills[]', () => {
        const skills = mapAnthropicMarketplace({
            plugins: [{ name: 'claude-api', displayName: 'Claude API', description: 'API docs.' }],
        });
        expect(skills).toHaveLength(1);
        expect(skills[0].id).toBe('anthropics/skills/claude-api');
        expect(skills[0].type).toBe('plugin');
        expect(skills[0].name).toBe('Claude API');
    });

    it('handles an empty / missing plugins array gracefully', () => {
        expect(mapAnthropicMarketplace({ plugins: [] })).toEqual([]);
        expect(mapAnthropicMarketplace({} as { plugins: [] })).toEqual([]);
    });
});
