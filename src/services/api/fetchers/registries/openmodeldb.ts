import { Model } from '../../../../types';
import { proxyUrl } from '../../config';
import { normalizeDate, normalizeLicenseName, determineType, determineCommercialUse } from '../../utils';
import { isModelComplete } from '../../filtering';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';

/**
 * Fetch models from OpenModelDB
 * 
 * OpenModelDB is a database of AI upscaling and image restoration models.
 * Data is fetched from their GitHub repository.
 * 
 * @returns Object containing complete and flagged models
 */
// ... imports ...
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../../sync/SyncTypes';

/**
 * OpenModelDB Fetcher Implementation
 */
export const openModelDBFetcher: Fetcher = {
    id: 'openmodeldb',
    name: 'OpenModelDB',
    isEnabled: (options: SyncOptions) => !!options.dataSources?.openmodeldb,

    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        try {
            console.log('[OpenModelDB] Fetching model list from GitHub...');

            // Get the tree of files from the GitHub repo
            const treeUrl = 'https://api.github.com/repos/OpenModelDB/open-model-database/git/trees/main?recursive=1';
            const treeResponse = await fetchWrapper(treeUrl);

            if (!treeResponse.ok) {
                console.error(`[OpenModelDB] ERROR fetching tree: ${treeResponse.status} ${treeResponse.statusText}`);
                return { complete: [], flagged: [] };
            }

            const treeData = await treeResponse.json();

            // Filter for model JSON files in data/models/
            const modelFiles = treeData.tree
                .filter((item: any) => item.path.startsWith('data/models/') && item.path.endsWith('.json'))
                .map((item: any) => item.path);

            console.log(`[OpenModelDB] Found ${modelFiles.length} model files`);

            const models: Model[] = [];
            let processed = 0;
            const batchSize = 50;

            // Process models in batches
            for (let i = 0; i < modelFiles.length; i += batchSize) {
                const batch = modelFiles.slice(i, i + batchSize);

                const batchPromises = batch.map(async (filePath: string) => {
                    try {
                        const modelId = filePath.replace('data/models/', '').replace('.json', '');
                        const rawUrl = `https://raw.githubusercontent.com/OpenModelDB/open-model-database/main/${filePath}`;

                        // Bypass global rate limiter for raw content
                        const response = await fetch(rawUrl);
                        if (!response.ok) {
                            console.warn(`[OpenModelDB] Failed to fetch ${modelId}: ${response.status}`);
                            return null;
                        }

                        const item = await response.json();

                        const modelName = item.name || modelId;

                        // Determine license information
                        const licenseName = item.license || 'Unknown';
                        const licenseType = determineType(licenseName);
                        const commercialUse = determineCommercialUse(licenseName);
                        const licenseNameLower = (licenseName || '').toLowerCase();

                        // Build tags from available metadata
                        const tags: string[] = [];
                        if (item.architecture) tags.push(item.architecture);
                        if (item.scale) tags.push(`${item.scale}x`);
                        if (item.tags && Array.isArray(item.tags)) {
                            tags.push(...item.tags);
                        }

                        // Determine domain based on model type and tags
                        let domain: Model['domain'] = 'Upscaler';
                        if (item.tags && Array.isArray(item.tags)) {
                            const tagStr = item.tags.join(' ').toLowerCase();
                            if (tagStr.includes('background')) {
                                domain = 'BackgroundRemoval';
                            } else if (tagStr.includes('restoration') || tagStr.includes('denoise') || tagStr.includes('compression')) {
                                domain = 'Other';
                            }
                        }

                        const model: Model = {
                            id: `openmodeldb-${modelId}`,
                            name: modelName,
                            description: item.description || `${modelName} - AI upscaling model`,
                            provider: String(item.author || 'OpenModelDB Community'),
                            domain: domain,
                            source: 'OpenModelDB',
                            url: `https://openmodeldb.info/models/${modelId}`,
                            repo: item.repo || null,
                            license: {
                                name: normalizeLicenseName(licenseName) || 'Unknown',
                                type: licenseType,
                                commercial_use: commercialUse,
                                attribution_required: licenseNameLower.includes('attribution'),
                                share_alike: licenseNameLower.includes('share-alike'),
                                copyleft: licenseNameLower.includes('gpl')
                            },
                            tags: tags,
                            hosting: {
                                weights_available: true,
                                api_available: false,
                                on_premise_friendly: true
                            },
                            updated_at: normalizeDate(item.date) || null,
                            release_date: normalizeDate(item.date) || null,
                            parameters: item.parameters || null,
                            context_window: null,
                            indemnity: 'None',
                            data_provenance: 'Open Source',
                            usage_restrictions: [],
                            downloads: undefined
                        };

                        return model;
                    } catch (itemError: any) {
                        console.error(`[OpenModelDB] Error processing ${filePath}:`, itemError?.message || itemError);
                        return null;
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                const validModels = batchResults.filter((m): m is Model => m !== null);
                models.push(...validModels);

                processed += batch.length;
                console.log(`[OpenModelDB] Processed ${processed}/${modelFiles.length} models...`);

                // Small delay between batches to be nice to GitHub API
                if (i + batchSize < modelFiles.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log(`[OpenModelDB] Successfully processed ${models.length} models`);

            const complete = models.filter(isModelComplete);
            const flagged = models.filter(m => !isModelComplete(m));

            console.log(`[OpenModelDB] Complete: ${complete.length}, Flagged: ${flagged.length}`);

            return { complete, flagged };
        } catch (err: any) {
            console.error('[OpenModelDB] Fetch error:', err?.message || err);
            return { complete: [], flagged: [] };
        }
    }
};

/**
 * Backward compatibility export
 */
export async function fetchOpenModelDB(): Promise<{ complete: Model[], flagged: Model[] }> {
    return openModelDBFetcher.fetch({ dataSources: { openmodeldb: true } } as any);
}
