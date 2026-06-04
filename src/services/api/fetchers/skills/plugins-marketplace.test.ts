import { describe, it, expect } from 'vitest';
import { mapPluginToSkill } from './plugins-marketplace';

describe('mapPluginToSkill', () => {
    it('maps a full marketplace plugin entry into the canonical Skill shape', () => {
        const raw = {
            name: 'auth0',
            description: 'Add authentication to any app with Auth0.',
            category: 'security',
            author: { name: 'Auth0' },
            source: {
                source: 'git-subdir',
                url: 'https://github.com/auth0/agent-skills.git',
                path: 'plugins/auth0',
                ref: 'main',
                sha: '9d93554c5d91bd087a46f4d6825f80c3eb981945',
            },
            homepage: 'https://auth0.com/docs/quickstart/agent-skills',
            keywords: ['auth', 'security', 'oauth'],
        };

        const skill = mapPluginToSkill(raw);
        expect(skill.id).toBe('claude-plugins-official/auth0');
        expect(skill.name).toBe('auth0');
        expect(skill.type).toBe('plugin');
        expect(skill.origin).toBe('anthropic-official');
        expect(skill.family).toBe('security');
        expect(skill.source).toBe('claude-plugins-official');
        expect(skill.install_command).toBe('/plugin install auth0@claude-plugins-official');
        expect(skill.source_repo).toEqual({
            owner: 'auth0',
            repo: 'agent-skills',
            path: 'plugins/auth0',
            sha: '9d93554c5d91bd087a46f4d6825f80c3eb981945',
        });
        expect(skill.tags).toEqual(['auth', 'security', 'oauth']);
        expect(skill.redistributable).toBe('metadata-only');
        expect(skill.editedFields).toEqual([]);
    });

    it('prefers displayName for the visible name, keeps raw name in id', () => {
        const skill = mapPluginToSkill({ name: 'brand-voice', displayName: 'Brand Voice' });
        expect(skill.name).toBe('Brand Voice');
        expect(skill.id).toBe('claude-plugins-official/brand-voice');
    });

    it('surfaces bundled-skill count as a capability', () => {
        const skill = mapPluginToSkill({
            name: 'multi',
            skills: ['skills/a/SKILL.md', 'skills/b/SKILL.md', 'skills/c/SKILL.md'],
        });
        expect(skill.capabilities).toContain('3 skills');
    });

    it('handles a minimal entry with no source/repo gracefully', () => {
        const skill = mapPluginToSkill({ name: 'bare' });
        expect(skill.id).toBe('claude-plugins-official/bare');
        expect(skill.source_repo).toBeNull();
        expect(skill.tags).toEqual([]);
        expect(skill.capabilities).toBeUndefined();
    });

    it('falls back from keywords to tags when keywords absent', () => {
        const skill = mapPluginToSkill({ name: 'x', tags: ['community-managed'] });
        expect(skill.tags).toEqual(['community-managed']);
    });
});
