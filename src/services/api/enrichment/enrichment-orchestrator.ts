import { Model } from '../../../types';
import { enrichFromGitHub } from './github-enricher';
import { enrichFromHuggingFace } from './huggingface-enricher';
import { enrichFromWebScraping } from './web-scraper';
import {
    inferLicenseFromTags,
    determineType,
    determineCommercialUse
} from '../utils/license-utils';
import { inferParametersFromNameTags } from '../utils/parameter-utils';

type PartialModel = Partial<Model>;

function isModelComplete(model: Model): boolean {
    return Boolean(
        model.id &&
        model.name &&
        model.provider &&
        model.domain &&
        model.source
    );
}

export async function enrichModelsDeep(models: Model[], max = 120): Promise<Model[]> {
    const incomplete = models.filter(m => !isModelComplete(m)).slice(0, max);
    if (incomplete.length === 0) return models;
    const tasks = incomplete.map(async (m) => {
        const results = await Promise.all([
            enrichFromGitHub(m),
            enrichFromHuggingFace(m)
        ]);
        const parts = results.filter((p): p is PartialModel => Boolean(p));
        const enriched = parts.reduce<Model>((acc, part) => ({
            ...acc,
            ...part,
            license: { ...acc.license, ...(part.license || {}) }
        }), { ...m });
        // If license still unknown and we have tags/name hints, infer
        if (!enriched.license?.name || enriched.license.name === 'Unknown') {
            const inferred = inferLicenseFromTags(enriched.tags);
            if (inferred) {
                enriched.license.name = inferred;
                enriched.license.type = determineType(inferred);
                enriched.license.commercial_use = determineCommercialUse(inferred);
            }
        }
        // Infer parameters if still missing
        if (!enriched.parameters) {
            const inferredParams = inferParametersFromNameTags(enriched.name, enriched.tags);
            if (inferredParams) enriched.parameters = inferredParams;
        }
        // Enhanced web scraping with search fallback (more aggressive for unknown data)
        try {
            const needsData = (!enriched.license?.name || enriched.license.name === 'Unknown') ||
                !enriched.parameters ||
                !enriched.context_window ||
                !enriched.provider ||
                !enriched.description ||
                !enriched.release_date || enriched.release_date === 'Unknown';

            if (needsData) {
                await enrichFromWebScraping(enriched, needsData);
            }
        } catch (e) {
            // Scraping/search failed, not critical
            console.warn('Enhanced scraping failed:', e);
        }
        return enriched;
    });
    const enrichedModels = await Promise.all(tasks);
    // Replace incomplete models with enriched versions
    const enrichedById = new Map(enrichedModels.map(m => [m.id, m]));
    return models.map(m => enrichedById.get(m.id) || m);
}
