import { describe, expect, it } from 'vitest';
import { mapRepoToSkill } from './github-skills';

describe('mapRepoToSkill', () => {
    it('maps a GitHub repository to a community skill record', () => {
        const skill = mapRepoToSkill({
            full_name: 'acme/agent-skills',
            name: 'agent-skills',
            description: 'Reusable skills',
            html_url: 'https://github.com/acme/agent-skills',
            pushed_at: '2026-03-04T00:00:00Z',
            stargazers_count: 42,
            topics: ['agent-skills'],
            license: { spdx_id: 'MIT', name: 'MIT License' },
            owner: { login: 'acme' },
        });

        expect(skill.id).toBe('acme/agent-skills');
        expect(skill.source).toBe('github-skills');
        expect(skill.origin).toBe('community-curated');
        expect(skill.source_repo).toEqual({ owner: 'acme', repo: 'agent-skills', path: '' });
        expect(skill.license?.name).toBe('MIT');
        expect(skill.updated_at).toBe('2026-03-04T00:00:00Z');
    });
});

