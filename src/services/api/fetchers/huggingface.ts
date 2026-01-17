import { Model } from '../../../types';
import { cleanId } from '../../../utils/format';
import { loggers } from '../../../utils/logger';
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
import { HuggingFaceResponseSchema } from '../schemas';

// ... imports remain the same ...
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../sync/SyncTypes';

const logger = loggers.sync;

/**
 * HuggingFace Fetcher Implementation
 */
export const huggingFaceFetcher: Fetcher = {
    id: 'huggingface',
    name: 'HuggingFace',
    isEnabled: (options: SyncOptions) => !!options.dataSources?.huggingface,

    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        try {
            logger.debug('Fetching models from API...');
            const limit = 10000;
            const direction = -1; // -1 = descending (most downloads first)
            const url = proxyUrl(
                `/huggingface-api/models?sort=downloads&direction=${direction}&limit=${limit}`,
                `https://huggingface.co/api/models?sort=downloads&direction=${direction}&limit=${limit}`
            );

            logger.debug(`Fetching from API via proxy: ${url}`);
            const response = await fetchWrapper(url);

            if (!response.ok) {
                const text = await response.text();
                logger.error(`ERROR: Status ${response.status} ${response.statusText}. Response: ${text}`);
                return { complete: [], flagged: [] };
            }

            const data = await response.json();

            // Validate response schema
            const parseResult = HuggingFaceResponseSchema.safeParse(data);
            const models = Array.isArray(data) ? data : data.models || data.results || [];

            if (!parseResult.success) {
                logger.warn('Response schema validation failed, using fallback parsing:', parseResult.error.issues[0]?.message);
            }

            if (!models.length) {
                logger.error('API did not return any models:', data);
                return { complete: [], flagged: [] };
            }

            const complete: Model[] = [];
            const flagged: Model[] = [];

            // Map HuggingFace API response to Model[]
            models.forEach((item: any) => {
                // Extract provider from HuggingFace model ID (format: "organization/model-name")
                let provider = item.author || null;
                if (!provider && item.id) {
                    const parts = item.id.split('/');
                    if (parts.length >= 2) {
                        provider = parts[0];
                    }
                }

                const model: Model = {
                    id: item.id || cleanId(item.modelId),
                    name: item.name || item.id,
                    provider: provider,
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
                    pricing: []
                };

                if (isModelComplete(model)) {
                    complete.push(model);
                } else {
                    flagged.push(model);
                }
            });

            logger.info(`Processed ${models.length} models from API`);
            logger.debug(`Complete: ${complete.length}, Flagged: ${flagged.length}`);

            return { complete, flagged };
        } catch (err: any) {
            logger.error('Fetch error:', err?.message || err);
            return { complete: [], flagged: [] };
        }
    }
};

/**
 * Backward compatibility export
 */
export async function fetchHuggingFaceRecent(limit = 10000): Promise<{ complete: Model[], flagged: Model[] }> {
    return huggingFaceFetcher.fetch({ dataSources: { huggingface: true } } as any);
}
