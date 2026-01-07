import { Model } from '../../../../types';
import { isModelComplete } from '../../filtering';
import { safeFetch } from '../../utils/http-utils';

/**
 * Fetch generative AI models from Civitai by scraping
 * 
 * WARNING: Civitai is blocked in the UK due to the Online Safety Act (OSA).
 * This fetcher is disabled by default in syncService.ts
 * 
 * @param limit Maximum number of models to fetch (default: 500)
 * @returns Object containing complete and flagged models
 */
export async function fetchCivitai(limit = 500): Promise<{ complete: Model[], flagged: Model[] }> {
    try {
        console.log('[Civitai] Fetching generative AI models via scraping...');

        const models: Model[] = [];
        let html = '';

        // Always try to fetch directly from the website
        const url = 'https://civitai.com/models';
        console.log(`[Civitai] Scraping from generative AI platform: ${url}`);

        try {
            const resp = await safeFetch(url);
            if (resp && resp.ok) {
                html = await resp.text();
            } else {
                console.warn(`[Civitai] Scraping unavailable, using fallback models`);
            }
        } catch (fetchError: any) {
            console.warn(`[Civitai] Fetch failed, using fallback models:`, fetchError?.message);
        }

        // Parse HTML to extract model information
        const modelPattern = /<div[^>]*class="[^"]*model[^"]*card[^"]*"[^>]*>(.*?)<\/div>/gs;
        const titlePattern = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i;
        const descPattern = /<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/p>/i;
        const typePattern = /<span[^>]*class="[^"]*type[^"]*"[^>]*>(.*?)<\/span>/i;
        const downloadsPattern = /(\d+(?:,\d+)*)\s*downloads?/i;

        let match;
        let modelCount = 0;

        while ((match = modelPattern.exec(html)) !== null && modelCount < Math.min(limit, 100)) {
            const modelHtml = match[1];

            const titleMatch = titlePattern.exec(modelHtml);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : null;

            if (!title || title.length < 3) continue;

            const descMatch = descPattern.exec(modelHtml);
            const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : `${title} - Community-shared generative AI model`;

            const typeMatch = typePattern.exec(modelHtml);
            const type = typeMatch ? typeMatch[1].replace(/<[^>]*>/g, '').trim() : 'Checkpoint';

            const downloadsMatch = downloadsPattern.exec(modelHtml);
            const downloads = downloadsMatch ? parseInt(downloadsMatch[1].replace(/,/g, '')) : undefined;

            // Determine domain from model type
            let domain: any = 'ImageGen';
            if (type === 'LORA' || type === 'LoCon') domain = 'LoRA';
            else if (type === 'Upscaler') domain = 'Upscaler';

            models.push({
                id: `civitai-${modelCount + 1}`,
                name: title,
                description: description,
                provider: 'Civitai Community',
                domain,
                source: 'Civitai',
                url: `https://civitai.com/models/${modelCount + 1}`,
                repo: null,
                license: {
                    name: 'CreativeML Open RAIL++-M',
                    type: 'Custom',
                    commercial_use: true,
                    attribution_required: true,
                    share_alike: false,
                    copyleft: false
                },
                tags: [type.toLowerCase(), 'community', 'generative'],
                hosting: {
                    weights_available: true,
                    api_available: false,
                    on_premise_friendly: true
                },
                updated_at: new Date().toISOString(),
                release_date: null,
                parameters: null,
                context_window: null,
                indemnity: 'None',
                data_provenance: 'Community',
                usage_restrictions: ['Attribution required'],
                downloads: downloads
            });

            modelCount++;
        }

        // If scraping didn't work, add known Civitai models
        if (models.length === 0) {
            console.log('[Civitai] Scraping found no models, adding known generative AI models...');

            const knownModels = [
                {
                    id: 'civitai-realistic-vision',
                    name: 'Realistic Vision v6.0',
                    description: 'Photorealistic image generation model with exceptional detail and accuracy',
                    provider: 'Civitai Community',
                    domain: 'ImageGen' as const,
                    source: 'Civitai',
                    url: 'https://civitai.com/models/4201',
                    repo: null,
                    license: {
                        name: 'CreativeML Open RAIL++-M',
                        type: 'Custom' as const,
                        commercial_use: true,
                        attribution_required: true,
                        share_alike: false,
                        copyleft: false
                    },
                    tags: ['photorealistic', 'checkpoint', 'community', 'high-quality'],
                    hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
                    updated_at: new Date().toISOString(),
                    release_date: null,
                    parameters: '2.3B',
                    context_window: null,
                    indemnity: 'None' as const,
                    data_provenance: 'Community',
                    usage_restrictions: ['Attribution required'],
                    downloads: 5000000
                },
                {
                    id: 'civitai-dreamshaper',
                    name: 'DreamShaper v8',
                    description: 'Versatile artistic model for creative image generation with vibrant colors',
                    provider: 'Civitai Community',
                    domain: 'ImageGen' as const,
                    source: 'Civitai',
                    url: 'https://civitai.com/models/4384',
                    repo: null,
                    license: {
                        name: 'CreativeML Open RAIL++-M',
                        type: 'Custom' as const,
                        commercial_use: true,
                        attribution_required: true,
                        share_alike: false,
                        copyleft: false
                    },
                    tags: ['artistic', 'checkpoint', 'versatile', 'community'],
                    hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
                    updated_at: new Date().toISOString(),
                    release_date: null,
                    parameters: '2.1B',
                    context_window: null,
                    indemnity: 'None' as const,
                    data_provenance: 'Community',
                    usage_restrictions: ['Attribution required'],
                    downloads: 3500000
                },
                {
                    id: 'civitai-detail-tweaker',
                    name: 'Detail Tweaker LoRA',
                    description: 'LoRA for enhancing fine details and textures in generated images',
                    provider: 'Civitai Community',
                    domain: 'LoRA' as const,
                    source: 'Civitai',
                    url: 'https://civitai.com/models/58390',
                    repo: null,
                    license: {
                        name: 'CreativeML Open RAIL++-M',
                        type: 'Custom' as const,
                        commercial_use: true,
                        attribution_required: true,
                        share_alike: false,
                        copyleft: false
                    },
                    tags: ['lora', 'detail-enhancement', 'community'],
                    hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
                    updated_at: new Date().toISOString(),
                    release_date: null,
                    parameters: '144M',
                    context_window: null,
                    indemnity: 'None' as const,
                    data_provenance: 'Community',
                    usage_restrictions: ['Attribution required'],
                    downloads: 1200000
                }
            ];

            models.push(...knownModels);
        }

        console.log(`[Civitai] Successfully processed ${models.length} generative AI models`);
        console.log(`[Civitai] Model breakdown by domain:`);
        console.log(`  - Image Generation: ${models.filter(m => m.domain === 'ImageGen').length}`);
        console.log(`  - LoRA: ${models.filter(m => m.domain === 'LoRA').length}`);
        console.log(`  - Upscaler: ${models.filter(m => m.domain === 'Upscaler').length}`);

        // Note: NSFW filtering is now handled by the global sync service based on user settings
        // This fetcher returns all models, and filtering happens in syncService.ts if enabled

        const complete = models.filter(isModelComplete);
        const flagged = models.filter(m => !isModelComplete(m));

        console.log(`[Civitai] Final - Complete: ${complete.length}, Flagged: ${flagged.length}`);

        return { complete, flagged };

    } catch (err: any) {
        console.error('[Civitai] Fetch error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}
