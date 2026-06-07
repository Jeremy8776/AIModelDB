/**
 * GitHub Topics Skills fetcher.
 *
 * Searches repositories tagged with Claude Code / agent skill topics. Catches
 * community SKILL.md collections that aren't published to any curated registry.
 *
 * Mirrors the MCP github-topics fetcher: uses the GitHub repo search API,
 * reuses the optional `gitHubToken` from settings for rate limits, and degrades
 * gracefully to the unauthenticated 60 req/hr tier when no token is present.
 *
 * GitHub repos are user-submitted, so origin is "community-curated" and the
 * license is whatever the repo declares (often unknown). We map each repo to a
 * Skill (type: "skill") keyed by `owner/repo`, with `updated_at` from the repo's
 * last push so the Release Date column has real dates.
 */

import { Skill, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';
import { proxyUrl } from '../../config';

const SOURCE_KEY = 'github-skills';

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

/** spdx_ids that are OSI-approved + permissive (commercial-safe, no copyleft). */
const PERMISSIVE_OSI = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD']);
const COPYLEFT = new Set(['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0']);

function licenseFromSpdx(spdx?: string | null, name?: string | null): LicenseInfo {
    const id = spdx || undefined;
    if (!id || id === 'NOASSERTION') {
        return name ? { ...DEFAULT_LICENSE, name } : DEFAULT_LICENSE;
    }
    const copyleft = COPYLEFT.has(id);
    return {
        name: id,
        type: copyleft ? 'Copyleft' : PERMISSIVE_OSI.has(id) ? 'OSI' : 'Custom',
        commercial_use: true,
        attribution_required: true,
        share_alike: copyleft,
        copyleft,
    };
}

interface GitHubRepo {
    full_name: string;
    name: string;
    description?: string | null;
    html_url: string;
    homepage?: string | null;
    pushed_at?: string;
    created_at?: string;
    stargazers_count?: number;
    topics?: string[];
    license?: { spdx_id?: string | null; name?: string | null } | null;
    owner?: { login?: string };
}

interface GitHubSearchResponse {
    total_count?: number;
    items?: GitHubRepo[];
}

const TOPIC_QUERIES = [
    'topic:claude-code-skills',
    'topic:claude-skills',
    'topic:agent-skills',
];

/**
 * Map a GitHub repository to a canonical Skill record.
 * Exported pure for unit testing.
 */
export function mapRepoToSkill(repo: GitHubRepo): Skill {
    const owner = repo.owner?.login ?? repo.full_name.split('/')[0] ?? 'unknown';
    const repoName = repo.name || repo.full_name.split('/')[1] || 'unknown';

    return {
        id: `${owner}/${repoName}`.toLowerCase(),
        name: repoName,
        description: repo.description ?? null,
        type: 'skill',
        origin: 'community-curated',
        family: null,
        triggers: undefined,
        capabilities: undefined,
        requires: { runtimes: ['claude-code'] },
        install_command: null,
        source: SOURCE_KEY,
        source_repo: { owner, repo: repoName, path: '' },
        redistributable: 'metadata-only',
        license: licenseFromSpdx(repo.license?.spdx_id, repo.license?.name),
        tags: repo.topics ?? [],
        updated_at: repo.pushed_at ?? null,
        isFavorite: false,
        editedFields: [],
        _meta: {
            [SOURCE_KEY]: {
                full_name: repo.full_name,
                stars: repo.stargazers_count,
                homepage: repo.homepage,
                created_at: repo.created_at,
                html_url: repo.html_url,
            },
        },
    };
}

async function fetchSearchPage(query: string, token?: string): Promise<GitHubRepo[]> {
    const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100`;
    const url = isElectron() ? githubUrl : proxyUrl(
        `/github-api/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100`,
        githubUrl
    );
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ai-model-db-pro',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url, headers });
        if (!res.success) throw new Error(res.error || 'GitHub skills search failed');
        const data = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as GitHubSearchResponse;
        return data.items || [];
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`GitHub skills search failed: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as GitHubSearchResponse;
    return data.items || [];
}

export interface GitHubSkillsFetchOptions {
    /** Optional GitHub PAT — without it you're limited to 60 req/hr (10 for search). */
    gitHubToken?: string;
    /** Called with the merged batch of skills found across all topic queries. */
    onPage?: (skills: Skill[], pageIndex: number) => void;
    abortSignal?: AbortSignal;
}

/**
 * Search GitHub for repositories tagged with skill-related topics. Deduped by
 * `owner/repo` before returning so multi-topic repos appear once. Per-query
 * failures (e.g. search rate limit with no token) are swallowed so a partial
 * result still merges.
 */
export async function fetchSkillsFromGitHubTopics(
    options: GitHubSkillsFetchOptions = {}
): Promise<Skill[]> {
    const seen = new Map<string, Skill>();

    for (const query of TOPIC_QUERIES) {
        if (options.abortSignal?.aborted) {
            throw new DOMException('GitHub skills fetch aborted', 'AbortError');
        }
        try {
            const repos = await fetchSearchPage(query, options.gitHubToken);
            for (const repo of repos) {
                const skill = mapRepoToSkill(repo);
                if (!seen.has(skill.id)) seen.set(skill.id, skill);
            }
        } catch (err) {
            console.warn(`[Skills/GitHub] Query "${query}" failed:`, err);
            // continue with other queries
        }
    }

    const all = Array.from(seen.values());
    if (options.onPage && all.length > 0) options.onPage(all, 0);
    return all;
}
