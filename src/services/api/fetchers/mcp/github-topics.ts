/**
 * GitHub Topics MCP fetcher.
 *
 * Searches repositories tagged with `mcp-server` or `modelcontextprotocol`.
 * Useful for catching servers that haven't (yet) been listed in the official
 * registry — typically community work or unofficial implementations.
 *
 * GitHub search API returns ~1000 matches max per query. We fetch the most
 * recently updated batch — fresh, less spammy than star-sorted.
 */

import { MCPServer, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';
import { proxyUrl } from '../../config';

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

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
    'topic:mcp-server',
    'topic:modelcontextprotocol',
    'topic:model-context-protocol',
];

async function fetchSearchPage(query: string, token?: string): Promise<GitHubRepo[]> {
    const url = proxyUrl(
        `/github-api/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100`,
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=100`
    );
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ai-model-db-pro',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url, headers });
        if (!res.success) throw new Error(res.error || 'GitHub search failed');
        const data = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as GitHubSearchResponse;
        return data.items || [];
    }
    response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`GitHub search failed: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as GitHubSearchResponse;
    return data.items || [];
}

function repoToMCPServer(repo: GitHubRepo): MCPServer {
    const owner = repo.owner?.login ?? repo.full_name.split('/')[0] ?? 'unknown';
    const repoName = repo.name || repo.full_name.split('/')[1] || 'unknown';
    const id = `io.github.${owner}/${repoName}`.toLowerCase();
    const licenseName = repo.license?.spdx_id || repo.license?.name || 'Unknown';

    return {
        id,
        name: repoName,
        description: repo.description ?? null,
        version: null,
        repository: { url: repo.html_url, source: 'github' },
        websiteUrl: repo.homepage ?? null,
        packages: undefined,
        remotes: undefined,
        capabilities: undefined,
        source: 'github-topics',
        publishedAt: repo.created_at ?? null,
        updatedAt: repo.pushed_at ?? null,
        namespaceVerified: false,
        imageVerified: false,
        directoryVerified: false,
        license: licenseName === 'Unknown'
            ? DEFAULT_LICENSE
            : { ...DEFAULT_LICENSE, name: licenseName },
        tags: repo.topics ?? [],
        downloads: repo.stargazers_count ?? null,
        isFavorite: false,
        editedFields: [],
        _meta: {
            'io.github': {
                full_name: repo.full_name,
                stars: repo.stargazers_count,
                homepage: repo.homepage,
            },
        },
    };
}

export interface GitHubTopicsFetchOptions {
    /** Optional GitHub PAT — without it you're limited to 60 req/hr. */
    gitHubToken?: string;
    /** Called with the merged batch of servers found across all topic queries. */
    onPage?: (servers: MCPServer[]) => void;
    abortSignal?: AbortSignal;
}

/**
 * Search GitHub for repositories tagged with MCP-related topics. Deduped by
 * `owner/repo` before returning so multi-topic repos appear once.
 */
export async function fetchMCPServersFromGitHubTopics(
    options: GitHubTopicsFetchOptions = {}
): Promise<MCPServer[]> {
    const seen = new Map<string, MCPServer>();

    for (const query of TOPIC_QUERIES) {
        if (options.abortSignal?.aborted) {
            throw new DOMException('GitHub topics fetch aborted', 'AbortError');
        }
        try {
            const repos = await fetchSearchPage(query, options.gitHubToken);
            for (const repo of repos) {
                const server = repoToMCPServer(repo);
                if (!seen.has(server.id)) {
                    seen.set(server.id, server);
                }
            }
        } catch (err) {
            console.warn(`[MCP/GitHub] Query "${query}" failed:`, err);
            // continue with other queries
        }
    }

    const all = Array.from(seen.values());
    if (options.onPage && all.length > 0) options.onPage(all);
    return all;
}
