/**
 * Anthropic official Agent Skills fetcher.
 *
 * Source: github.com/anthropics/skills/.claude-plugin/marketplace.json
 * A single JSON file — no auth, no pagination. Unlike claude-plugins-official
 * (which lists *plugins*), this manifest groups Anthropic's example/document
 * SKILL.md packages under a few plugin bundles, each with a `skills[]` array of
 * paths like "./skills/skill-creator". We expand every path into one canonical
 * Skill record (type: "skill", origin: "anthropic-official") so each SKILL.md
 * appears individually and can merge with the same skill from other sources.
 *
 * Redistribution: the document skills (docx / pdf / pptx / xlsx) are
 * source-available for reference but NOT open source, so they are flagged
 * `metadata-only`. Everything else in this repo is Apache-2.0 (`yes`).
 */

import { Skill, LicenseInfo, SkillRedistribution } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const SOURCE_KEY = 'anthropic-skills';
const REPO_OWNER = 'anthropics';
const REPO_NAME = 'skills';
const MARKETPLACE_URL =
    'https://raw.githubusercontent.com/anthropics/skills/main/.claude-plugin/marketplace.json';

/** Skills whose bodies are source-available but not OSI-licensed. */
const SOURCE_AVAILABLE_SKILLS = new Set(['docx', 'pdf', 'pptx', 'xlsx']);

const APACHE_LICENSE: LicenseInfo = {
    name: 'Apache-2.0',
    type: 'OSI',
    commercial_use: true,
    attribution_required: true,
    share_alike: false,
    copyleft: false,
};

const SOURCE_AVAILABLE_LICENSE: LicenseInfo = {
    name: 'Source-available (Anthropic)',
    type: 'Custom',
    commercial_use: false,
    attribution_required: true,
    share_alike: false,
    copyleft: false,
    notes: 'Provided for reference; not open source. Index metadata only.',
};

interface RawAnthropicPlugin {
    name: string;
    displayName?: string;
    description?: string;
    category?: string;
    author?: { name?: string; email?: string; url?: string };
    version?: string;
    source?: string | { source?: string; url?: string; path?: string; ref?: string; sha?: string };
    homepage?: string;
    strict?: boolean;
    skills?: string[];          // file/dir paths to bundled SKILL.md packages
}

interface AnthropicMarketplaceResponse {
    name?: string;
    owner?: { name?: string; email?: string };
    metadata?: { description?: string; version?: string };
    plugins: RawAnthropicPlugin[];
}

/** "./skills/skill-creator" | "skills/skill-creator/SKILL.md" -> "skills/skill-creator" */
function normalizeSkillPath(raw: string): string {
    return raw
        .replace(/^\.\//, '')
        .replace(/\/SKILL\.md$/i, '')
        .replace(/\/$/, '');
}

/** Last path segment is the skill's slug/name. */
function skillNameFromPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || path;
}

/**
 * Map one bundled SKILL.md path (within a marketplace plugin) to a Skill.
 * Exported pure for unit testing.
 */
export function mapAnthropicSkill(
    plugin: RawAnthropicPlugin,
    rawSkillPath: string,
    updatedAt: string | null = null
): Skill {
    const path = normalizeSkillPath(rawSkillPath);
    const name = skillNameFromPath(path);
    const redistributable: SkillRedistribution = SOURCE_AVAILABLE_SKILLS.has(name)
        ? 'metadata-only'
        : 'yes';
    const license = redistributable === 'metadata-only' ? SOURCE_AVAILABLE_LICENSE : APACHE_LICENSE;

    return {
        id: `${REPO_OWNER}/${REPO_NAME}/${path}`,
        name,
        // The manifest only describes the parent bundle, not each skill — surface
        // that as context rather than fabricating a per-skill description.
        description: plugin.description ?? null,
        type: 'skill',
        origin: 'anthropic-official',
        family: plugin.name,
        triggers: undefined,
        capabilities: undefined,
        requires: { runtimes: ['claude-code', 'claude-ai'] },
        install_command: null,
        source: SOURCE_KEY,
        source_repo: { owner: REPO_OWNER, repo: REPO_NAME, path },
        redistributable,
        license,
        tags: plugin.category ? [plugin.category] : [],
        updated_at: updatedAt,
        isFavorite: false,
        editedFields: [],
        _meta: {
            [SOURCE_KEY]: {
                bundle: plugin.name,
                bundleDisplayName: plugin.displayName,
                author: plugin.author,
                version: plugin.version,
                homepage: plugin.homepage,
            },
        },
    };
}

/**
 * Fallback when a plugin declares no `skills[]` array: index the bundle itself
 * as a single plugin-typed record so the source still yields something useful.
 */
function mapAnthropicBundle(plugin: RawAnthropicPlugin, updatedAt: string | null): Skill {
    return {
        id: `${REPO_OWNER}/${REPO_NAME}/${plugin.name}`,
        name: plugin.displayName || plugin.name,
        description: plugin.description ?? null,
        type: 'plugin',
        origin: 'anthropic-official',
        family: plugin.name,
        triggers: undefined,
        capabilities: undefined,
        requires: { runtimes: ['claude-code', 'claude-ai'] },
        install_command: null,
        source: SOURCE_KEY,
        source_repo: { owner: REPO_OWNER, repo: REPO_NAME, path: '' },
        redistributable: 'metadata-only',
        license: APACHE_LICENSE,
        tags: plugin.category ? [plugin.category] : [],
        updated_at: updatedAt,
        isFavorite: false,
        editedFields: [],
        _meta: { [SOURCE_KEY]: { bundle: plugin.name, version: plugin.version } },
    };
}

/**
 * Expand a whole marketplace response into per-skill records. Pure — exported
 * so a test can feed it a fixture without any network access.
 */
export function mapAnthropicMarketplace(
    data: AnthropicMarketplaceResponse,
    updatedAt: string | null = null
): Skill[] {
    const out: Skill[] = [];
    const seen = new Set<string>();
    for (const plugin of data.plugins || []) {
        const paths = plugin.skills || [];
        if (paths.length === 0) {
            const bundle = mapAnthropicBundle(plugin, updatedAt);
            if (!seen.has(bundle.id)) { seen.add(bundle.id); out.push(bundle); }
            continue;
        }
        for (const p of paths) {
            const skill = mapAnthropicSkill(plugin, p, updatedAt);
            if (!seen.has(skill.id)) { seen.add(skill.id); out.push(skill); }
        }
    }
    return out;
}

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url, headers });
        if (!res.success) throw new Error(res.error || 'Anthropic skills proxy request failed');
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }
    const r = await fetch(url, { headers: { Accept: 'application/json', ...(headers || {}) } });
    if (!r.ok) throw new Error(`Anthropic skills request failed: ${r.status} ${r.statusText}`);
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
        return null; // non-fatal — updated_at stays null
    }
}

export interface FetchAnthropicSkillsOptions {
    abortSignal?: AbortSignal;
    onPage?: (skills: Skill[], pageIndex: number) => void;
}

/**
 * Fetch every Anthropic Agent Skill from the public marketplace manifest and
 * map to per-skill records. Single manifest request (+ one optional commit-date
 * lookup); onPage fires once for UI-progress parity with the other fetchers.
 */
export async function fetchAnthropicSkills(
    options: FetchAnthropicSkillsOptions = {}
): Promise<Skill[]> {
    if (options.abortSignal?.aborted) {
        throw new DOMException('Anthropic skills fetch aborted', 'AbortError');
    }
    const data: AnthropicMarketplaceResponse = await fetchJson(MARKETPLACE_URL);
    if (options.abortSignal?.aborted) {
        throw new DOMException('Anthropic skills fetch aborted', 'AbortError');
    }
    const updatedAt = await fetchRepoUpdatedAt();
    const skills = mapAnthropicMarketplace(data, updatedAt);
    if (options.onPage) options.onPage(skills, 0);
    return skills;
}
