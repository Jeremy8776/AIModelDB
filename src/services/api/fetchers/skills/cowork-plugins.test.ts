import { describe, expect, it } from 'vitest';
import { mapCoworkPluginToSkill } from './cowork-plugins';

describe('mapCoworkPluginToSkill', () => {
    it('maps a knowledge-work plugin to a Skill plugin record', () => {
        const skill = mapCoworkPluginToSkill({
            name: 'sales',
            displayName: 'Sales',
            description: 'Prospect and prep calls.',
            source: './sales',
            skills: ['./skills/outreach', './skills/account-research'],
            keywords: ['sales', 'gtm'],
        }, '2026-02-03T00:00:00Z');

        expect(skill.id).toBe('cowork-plugins/sales');
        expect(skill.name).toBe('Sales');
        expect(skill.type).toBe('plugin');
        expect(skill.origin).toBe('cowork-official');
        expect(skill.source).toBe('cowork-plugins');
        expect(skill.source_repo).toEqual({ owner: 'anthropics', repo: 'knowledge-work-plugins', path: 'sales' });
        expect(skill.capabilities).toEqual(['2 skills']);
    });
});

