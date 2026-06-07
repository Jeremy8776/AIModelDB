/**
 * Cowork (knowledge-work) plugins marketplace fetcher.
 *
 * Source: github.com/anthropics/knowledge-work-plugins/.claude-plugin/marketplace.json
 * Same shape as anthropics/claude-plugins-official — a single JSON file, no auth,
 * no pagination. Each entry bundles the skills, connectors, slash commands and
 * sub-agents for a knowledge-work role (sales, legal, data, marketing, …).
 *
 * We map each plugin to a canonical Skill (type: "plugin", origin:
 * "cowork-official"). `source` is left to the bundle directory ("./sales") or a
 * git URL for partner plugins.
 */

import { Skill, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const SOURCE_KEY = 'cowork-plugins';
const REPO_OWNER = 'anthropics';
const REPO_NAME = 'knowledge-work-plugins';
const MARKETPLACE_URL =
    'https://raw.githubusercontent.com/anthropics/knowledge-work-plugins/main/.claude-plugin/marketplace.json';

interface RawPluginSourceObject {
    source?: string;
    url?: string;
    path?: string;
    ref?: string;
    sha?: string;
}

interface RawCoworkPlugin {
    name: string;
    displayName?: string;
    description?: string;
    category?: string;
    author?: { name?: string; email?: string; url?: string };
    version?: string;
    source?: string | RawPluginSourceObject;   // "./sales" OR a git-subdir object
    homepage?: string;
    tags?: string[];
    keywords?: string[];
    skills?: string[];
    strict?: boolean;
}

interface CoworkMarketplaceResponse {
    name?: string;
    description?: string;
    owner?: { name?: string; email?: string };
    metadata?: { description?: string; version?: string };
    plugins: RawCoworkPlugin[];
}

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'MIT',
    type: 'OSI',
    commercial_use: true,
    attribution_required: true,
    share_alike: false,
    copyleft: false,
};

/** Parse owner/repo out of a git URL like https://github.com/owner/repo.git */
function parseRepo(url?: string): { owner: string; repo: string } | null {
    if (!url) return null;
    try {
        const u = new URL(url.replace(/\.git$/, ''));
        const [owner, repo] = u.pathname.replace(/^\//, '').split('/');
        if (owner && repo) return { owner, repo };
    } catch { /* not a parseable URL */ }
    return null;
}

/**
 * Map a raw knowledge-work-plugins entry to our canonical Skill record.
 * Exported pure for unit testing.
 */
export function mapCoworkPluginToSkill(
    raw: RawCoworkPlugin,
    updatedAt: string | null = null
): Skill {
    // `source` is usually a string path within this repo; partner plugins use a
    // git-subdir object. Resolve the source_repo from whichever shape we get.
    let sourceRepo: Skill['source_repo'];
    let sourceType: string | undefined;
    if (typeof raw.source === 'object' && raw.source) {
        const repo = parseRepo(raw.source.url);
        sourceType = raw.source.source;
        sourceRepo = repo
            ? { owner: repo.owner, repo: repo.repo, path: raw.source.path ?? '', sha: raw.source.sha }
            : { owner: REPO_OWNER, repo: REPO_NAME, path: raw.source.path ?? '' };
    } else {
        const path = typeof raw.source === 'string' ? raw.source.replace(/^\.\//, '').replace(/\/$/, '') : raw.name;
        sourceRepo = { owner: REPO_OWNER, repo: REPO_NAME, path };
    }

    const capabilities: string[] = [];
    if (raw.skills && raw.skills.length) {
        capabilities.push(`${raw.skills.length} skill${raw.skills.length === 1 ? '' : 's'}`);
    }

    return {
        id: `${SOURCE_KEY}/${raw.name}`,
        name: raw.displayName || raw.name,
        description: raw.description ?? null,
        type: 'plugin',
        origin: 'cowork-official',
        family: raw.category ?? null,
        triggers: undefined,
        capabilities: capabilities.length ? capabilities : undefined,
        requires: { runtimes: ['claude-ai', 'claude-code'] },
        install_command: `/plugin install ${raw.name}@${REPO_NAME}`,
        source: SOURCE_KEY,
        source_repo: sourceRepo,
        redistributable: 'metadata-only',
        license: DEFAULT_LICENSE,
        tags: raw.keywords || raw.tags || [],
        updated_at: updatedAt,
        isFavorite: false,
        editedFields: [],
        _meta: {
            [SOURCE_KEY]: {
                author: raw.author,
                version: raw.version,
                homepage: raw.homepage,
                sourceType,
            },
        },
    };
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url, headers });
        if (!res.success) throw new Error(res.error || 'Cowork plugins proxy request failed');
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }
    const r = await fetch(url, { headers: { Accept: 'application/json', ...(headers || {}) } });
    if (!r.ok) throw new Error(`Cowork plugins request failed: ${r.status} ${r.statusText}`);
    return (await r.json()) as T;
}

/** Best-effort: the repo's latest commit date, used to fill updated_at. */
async function fetchRepoUpdatedAt(): Promise<string | null> {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`;
        const data = await fetchJson<Array<{ commit?: { committer?: { date?: string }; author?: { date?: string } } }>>(
            url,
            { 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ai-model-db-pro' }
        );
        const commit = Array.isArray(data) ? data[0]?.commit : undefined;
        return commit?.committer?.date || commit?.author?.date || null;
    } catch {
        return null;
    }
}

export interface FetchCoworkPluginsOptions {
    abortSignal?: AbortSignal;
    onPage?: (skills: Skill[], pageIndex: number) => void;
}

/**
 * Fetch all knowledge-work (Cowork) plugins from the public marketplace and map
 * to Skill records. Single manifest request (+ one optional commit-date lookup).
 */
export async function fetchCoworkPlugins(
    options: FetchCoworkPluginsOptions = {}
): Promise<Skill[]> {
    if (options.abortSignal?.aborted) {
        throw new DOMException('Cowork plugins fetch aborted', 'AbortError');
    }
    const data: CoworkMarketplaceResponse = await fetchJson(MARKETPLACE_URL);
    if (options.abortSignal?.aborted) {
        throw new DOMException('Cowork plugins fetch aborted', 'AbortError');
    }
    const updatedAt = await fetchRepoUpdatedAt();
    const skills = (data.plugins || []).map(p => mapCoworkPluginToSkill(p, updatedAt));
    if (options.onPage) options.onPage(skills, 0);
    return skills;
}
