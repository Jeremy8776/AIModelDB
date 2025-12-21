import { Model } from '../../../types';
import { cleanId } from '../../../utils/format';
import { proxyUrl } from '../config';
import {
    normalizeDate,
    normalizeLicenseName,
    determineType,
    determineCommercialUse,
    inferLicenseFromTags,
    determineDomain,
    inferParametersFromNameTags
} from '../utils';
import { isModelComplete } from '../filtering';
import { fetchWrapper } from '../../../utils/fetch-wrapper';

/**
 * Fetch recent models from HuggingFace
 * @param limit Maximum number of models to fetch (default: 10000)
 * @returns Object containing complete and flagged models
 */
export async function fetchHuggingFaceRecent(limit = 10000): Promise<{ complete: Model[], flagged: Model[] }> {
    let complete: Model[] = [];
    let flagged: Model[] = [];

    try {
        console.log('[HuggingFace] Fetching models from API...');
        const direction = -1; // -1 = descending (most downloads first)
        const url = proxyUrl(
            `/huggingface-api/models?sort=downloads&direction=${direction}&limit=${limit}`,
            `https://huggingface.co/api/models?sort=downloads&direction=${direction}&limit=${limit}`
        );
        console.log(`[HuggingFace] Fetching from API via proxy: ${url}`);
        const response = await fetchWrapper(url);
        if (!response.ok) {
            const text = await response.text();
            console.error(`[HuggingFace] ERROR: Status ${response.status} ${response.statusText}. Response: ${text}`);
            return { complete: [], flagged: [] };
        }

        const data = await response.json();
        const models = Array.isArray(data) ? data : data.models || data.results || [];

        if (!models.length) {
            console.error('[HuggingFace] API did not return any models:', data);
            return { complete: [], flagged: [] };
        }

        // Map HuggingFace API response to Model[]
        models.forEach((item: any) => {
            // Extract provider from HuggingFace model ID (format: "organization/model-name")
            let provider = item.author || null;
            if (!provider && item.id) {
                const parts = item.id.split('/');
                if (parts.length >= 2) {
                    provider = parts[0]; // Extract "pyannote" from "pyannote/speaker-diarization-3.1"
                }
            }

            const model: Model = {
                id: item.id || cleanId(item.modelId),
                name: item.name || item.id,
                provider: provider, // Now extracts from URL structure
                domain: determineDomain(item.tags),
                source: "HuggingFace",
                url: `https://huggingface.co/${item.id}`,
                repo: `https://huggingface.co/${item.id}`,
                license: {
                    name: normalizeLicenseName(item.license || inferLicenseFromTags(item.tags)) || "Unknown",
                    type: determineType(item.license || inferLicenseFromTags(item.tags)),
                    commercial_use: determineCommercialUse(item.license || inferLicenseFromTags(item.tags)),
                    attribution_required: item.license?.toLowerCase().includes("attribution"),
                    share_alike: item.license?.toLowerCase().includes("share-alike"),
                    copyleft: item.license?.toLowerCase().includes("gpl")
                },
                downloads: item.downloads,
                updated_at: normalizeDate(item.lastModified) || normalizeDate(item.lastModifiedAt) || null,
                release_date: normalizeDate(item.createdAt) || normalizeDate(item.created) || null,
                tags: item.tags || [],
                hosting: {
                    weights_available: true,
                    api_available: true,
                    on_premise_friendly: true
                },
                parameters: item.params || inferParametersFromNameTags(item.id || item.name, item.tags) || null,
                context_window: null,
                indemnity: 'None',
                data_provenance: 'Open Source',
                usage_restrictions: [],
                pricing: [] // HuggingFace models are typically free
            };

            if (isModelComplete(model)) {
                complete.push(model);
            } else {
                flagged.push(model);
            }
        });

        console.log(`[HuggingFace] Processed ${models.length} models from API`);
        console.log(`[HuggingFace] Complete: ${complete.length}, Flagged: ${flagged.length}`);

        return { complete, flagged };
    } catch (err: any) {
        console.error('[HuggingFace] Fetch error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}
