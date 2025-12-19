import { Model } from '../../../types';
import { proxyUrl } from '../config';
import { parseGitHubRepo, mapSpdxToType } from '../utils';

type PartialModel = Partial<Model>;

export async function enrichFromGitHub(model: Model): Promise<PartialModel | null> {
    const repoInfo = parseGitHubRepo(model.repo || model.url || null);
    if (!repoInfo) return null;
    const { owner, name } = repoInfo;
    const ghToken = import.meta.env.VITE_GITHUB_TOKEN || '';
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ai-model-db-pro',
        ...(ghToken ? { 'Authorization': `Bearer ${ghToken}` } : {})
    };
    try {
        const resp = await fetch(proxyUrl(`/github-api/repos/${owner}/${name}`, `https://api.github.com/repos/${owner}/${name}`), { headers });
        if (!resp.ok) return null;
        const repo = await resp.json();
        const topics = Array.isArray(repo.topics) ? repo.topics : [];
        const licName = repo.license?.spdx_id || repo.license?.name || model.license?.name;
        const enriched: PartialModel = {
            id: model.id,
            name: model.name,
            provider: model.provider || repo.owner?.login || repo.organization?.login || null, // Extract actual author/org
            domain: model.domain,
            source: model.source,
            hosting: model.hosting,
            license: {
                name: licName || model.license?.name || 'Unknown',
                type: mapSpdxToType(repo.license?.spdx_id || repo.license?.name),
                commercial_use: model.license?.commercial_use ?? true,
                attribution_required: model.license?.attribution_required ?? false,
                share_alike: model.license?.share_alike ?? false,
                copyleft: model.license?.copyleft ?? (/(gpl|agpl|lgpl)/i.test(licName || '')),
                url: repo.license?.url || model.license?.url || undefined
            },
            tags: model.tags && model.tags.length ? model.tags : topics,
            updated_at: model.updated_at || repo.updated_at,
            release_date: model.release_date || repo.created_at,
            description: model.description || repo.description || null
        };
        return enriched;
    } catch {
        return null;
    }
}
