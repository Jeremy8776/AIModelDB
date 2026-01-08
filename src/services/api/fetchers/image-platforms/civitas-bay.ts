import { Model, ApiDir } from '../../../../types';
import { proxyUrl } from '../../config';
import { isModelComplete } from '../../filtering';
import { normalizeDate, normalizeLicenseName, determineType, determineCommercialUse } from '../../utils';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';

// Note: NSFW filtering is now handled by the global sync service based on user settings
// Individual fetchers return all models, and filtering happens in syncService.ts if enabled

/**
 * Fetch preserved AI models from CivitasBay torrent platform
 * 
 * CivitasBay is a preservation platform for AI models via torrents.
 * Uses RSS feed for discovery with STRICT NSFW filtering.
 * Fetches multiple pages to get comprehensive model list.
 * 
 * @param apiConfig - Optional API configuration for filtering
 * @param onLog - Optional callback to receive progress updates for UI display
 * @param onConfirmLLMCheck - Optional callback to confirm large LLM checks
 * @returns Object containing complete and flagged models
 */
export async function fetchCivitasBay(
    apiConfig?: ApiDir,
    onLog?: (message: string) => void,
    onConfirmLLMCheck?: (modelCount: number, estimatedTimeMs: number) => Promise<boolean>
): Promise<{ complete: Model[], flagged: Model[] }> {
    const log = (msg: string) => {
        console.log(msg);
        if (onLog) onLog(msg);
    };

    try {
        log('[CivitasBay] Fetching models from RSS feed...');

        const models: Model[] = [];
        const seenIds = new Set<string>();

        // Fetch all pages until we reach the end
        // Fetch pages concurrently in batches
        let page = 1;
        const CONCURRENT_BATCH = 5;
        let keepFetching = true;

        while (keepFetching) {
            const pagePromises = [];
            for (let i = 0; i < CONCURRENT_BATCH; i++) {
                pagePromises.push((async (p) => {
                    log(`[CivitasBay] Fetching page ${p}...`);
                    const prodUrl = `https://civitasbay.org/rss/torrents?sort_by=recent&page=${p}`;
                    const url = proxyUrl(`/civitasbay-api/rss/page${p}`, prodUrl);

                    try {
                        let xmlText: string;

                        // Use Electron proxy if available to bypass CORS
                        if (window.electronAPI?.proxyRequest) {
                            const result = await window.electronAPI.proxyRequest({
                                url: prodUrl,
                                method: 'GET'
                            });

                            if (!result.success) {
                                console.error(`[CivitasBay] Proxy error on page ${p}: ${result.error}`);
                                return { page: p, items: [] };
                            }
                            xmlText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
                        } else {
                            const response = await fetchWrapper(url);
                            if (!response.ok) return { page: p, items: [] };
                            xmlText = await response.text();
                        }

                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                        const xmlItems = xmlDoc.querySelectorAll('item');

                        return { page: p, items: Array.from(xmlItems) };
                    } catch (e) {
                        console.error(`[CivitasBay] Error on page ${p}:`, e);
                        return { page: p, items: [] };
                    }
                })(page + i));
            }

            const results = await Promise.all(pagePromises);

            // Process results in order
            for (const result of results.sort((a, b) => a.page - b.page)) {
                if (result.items.length === 0) {
                    keepFetching = false;
                    log(`[CivitasBay] Reached end at page ${result.page}`);
                    // Don't break immediately, process earlier pages in batch, but stop future batches
                } else {
                    log(`[CivitasBay] Found ${result.items.length} items on page ${result.page}`);

                    // Process items (logic extracted)
                    result.items.forEach((item, index) => {
                        // ... item processing logic ...
                        // RE-INSERT EXISTING ITEM PROCESSING LOGIC HERE
                        // Since replace_file_content replaces a block, I need to include the processing logic 
                        // or extract it to a helper function. 
                        // To keep it simple in one tool call, I will paste the logic.

                        try {
                            const title = item.querySelector('title')?.textContent || '';
                            const link = item.querySelector('link')?.textContent || '';
                            const description = item.querySelector('description')?.textContent || '';
                            const pubDate = item.querySelector('pubDate')?.textContent || '';
                            const guid = item.querySelector('guid')?.textContent || '';

                            let seeds = 0;
                            const seedsField = item.querySelector('torrent\\:seeds');
                            if (seedsField?.textContent) seeds = parseInt(seedsField.textContent, 10) || 0;

                            if (!title || !link) return;

                            // Note: NSFW filtering is now handled by the global sync service based on user settings

                            const modelId = guid || link.split('/').pop() || `civitasbay-${result.page}-${index}`;
                            if (seenIds.has(modelId)) return;
                            seenIds.add(modelId);

                            let modelName = title;
                            let version = '';
                            const versionMatch = title.match(/\bv(\d+(?:\.\d+)*)\b/i);
                            if (versionMatch) {
                                version = versionMatch[1];
                                modelName = title.replace(/\s*v\d+(?:\.\d+)*\b/i, '').trim();
                            }
                            modelName = modelName.replace(/\s*-\s*[^-]+$/, '').trim();

                            let licenseName = 'Unknown';
                            const licenseMatch = description.match(/license[:\s]+([^\n,]+)/i);
                            if (licenseMatch) licenseName = licenseMatch[1].trim();

                            const tags = new Set<string>(['preserved', 'torrent', 'community-archive']);
                            if (version) tags.add(`v${version}`);

                            const combinedText = `${title} ${description}`.toLowerCase();
                            const modelTypes = [
                                'checkpoint', 'lora', 'lycoris', 'embedding', 'textual-inversion',
                                'hypernetwork', 'aesthetic-gradient', 'controlnet', 'vae', 'upscaler'
                            ];
                            modelTypes.forEach(type => {
                                if (combinedText.includes(type) || combinedText.includes(type.replace('-', ' '))) {
                                    tags.add(type);
                                }
                            });
                            const styles = [
                                'realistic', 'anime', 'cartoon', 'semi-realistic', '2.5d', '3d',
                                'photorealistic', 'illustration', 'artistic', 'fantasy', 'sci-fi'
                            ];
                            styles.forEach(style => {
                                if (combinedText.includes(style) || combinedText.includes(style.replace('-', ' '))) {
                                    tags.add(style);
                                }
                            });
                            const baseModels = [
                                'sd1.5', 'sd2.1', 'sdxl', 'sd3', 'flux', 'pony', 'illustrious'
                            ];
                            baseModels.forEach(base => {
                                if (combinedText.includes(base) || combinedText.includes(base.replace('.', ' '))) {
                                    tags.add(base);
                                }
                            });
                            const contentTypes = [
                                'character', 'style', 'concept', 'clothing', 'pose', 'background',
                                'object', 'effect', 'lighting', 'tool'
                            ];
                            contentTypes.forEach(content => {
                                if (combinedText.includes(content)) {
                                    tags.add(content);
                                }
                            });

                            let domain: Model['domain'] = 'ImageGen';
                            if (description.toLowerCase().includes('lora') || title.toLowerCase().includes('lora')) domain = 'LoRA';
                            else if (description.toLowerCase().includes('video') || title.toLowerCase().includes('video')) domain = 'VideoGen';

                            if (seeds > 0) tags.add('seeded');
                            if (seeds >= 5) tags.add('well-seeded');

                            models.push({
                                id: `civitasbay-${modelId}`,
                                name: modelName,
                                description: description || `${modelName} - Preserved AI model via torrent`,
                                provider: 'CivitasBay Community',
                                domain: domain,
                                source: 'CivitasBay',
                                url: link,
                                repo: null,
                                license: {
                                    name: normalizeLicenseName(licenseName) || 'Unknown',
                                    type: determineType(licenseName),
                                    commercial_use: determineCommercialUse(licenseName),
                                    attribution_required: licenseName.toLowerCase().includes('attribution'),
                                    share_alike: licenseName.toLowerCase().includes('share-alike'),
                                    copyleft: licenseName.toLowerCase().includes('gpl')
                                },
                                tags: Array.from(tags),
                                hosting: {
                                    weights_available: true,
                                    api_available: false,
                                    on_premise_friendly: true
                                },
                                updated_at: normalizeDate(pubDate) || new Date().toISOString(),
                                release_date: normalizeDate(pubDate) || null,
                                parameters: null,
                                context_window: null,
                                indemnity: 'None',
                                data_provenance: 'Community Preserved',
                                usage_restrictions: ['Torrent download only', 'Archival purpose'],
                                downloads: undefined
                            });
                        } catch (e) {
                            // ignore item error
                        }
                    });
                }
            }

            if (!keepFetching) break;

            page += CONCURRENT_BATCH;
            // Short delay between batches
            await new Promise(r => setTimeout(r, 1000));
        }

        log(`[CivitasBay] Processed ${models.length} total models from RSS feed`);

        // Skip internal corporate filtering - let the global sync service handle it once at the end
        // This prevents double LLM checks and popups

        const complete = models.filter(isModelComplete);
        const flagged = models.filter(m => !isModelComplete(m));

        log(`[CivitasBay] Final - Complete: ${complete.length}, Flagged: ${flagged.length}`);

        return { complete, flagged };
    } catch (err: any) {
        console.error('[CivitasBay] Fetch error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}
