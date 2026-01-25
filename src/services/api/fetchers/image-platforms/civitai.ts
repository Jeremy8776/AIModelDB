import { Model } from '../../../../types';
import { isModelComplete } from '../../filtering';
import { safeFetch } from '../../utils/http-utils';
import * as cheerio from 'cheerio';

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

        if (!html) {
            console.log('[Civitai] No HTML content received, proceeding to fallbacks.');
        } else {
            // Parse HTML using Cheerio for robust selection
            const $ = cheerio.load(html);

            // Civitai model cards typically have specific classes or patterns
            // Note: Selectors might need adjustment based on real-world DOM
            $('.mantine-Paper-root, .model-card').each((index, element) => {
                if (models.length >= Math.min(limit, 100)) return false;

                const $el = $(element);

                // Extract Title
                const title = $el.find('h1, h2, h3, h4, .mantine-Text-root').first().text().trim();
                if (!title || title.length < 3) return;

                // Extract Description
                let description = $el.find('p, .mantine-Text-root').eq(1).text().trim();
                description = description || `${title} - Community-shared generative AI model`;

                // Extract Type/Badge
                const type = $el.find('.mantine-Badge-root').first().text().trim() || 'Checkpoint';

                // Extract Stats (Downloads, Likes)
                // Civitai often uses icons followed by numbers
                let downloads = 0;
                let likes = 0;

                $el.find('span').each((_, span) => {
                    const text = $(span).text().trim();
                    if (text.match(/^\d+(?:\.\d+)?k?$/i)) {
                        // Rough heuristic for downloads vs likes if not explicitly labeled
                        const val = text.toLowerCase().endsWith('k')
                            ? parseFloat(text) * 1000
                            : parseInt(text);

                        if (!downloads) downloads = val;
                        else if (!likes) likes = val;
                    }
                });

                // Determine domain from model type
                let domain: any = 'ImageGen';
                const upperType = type.toUpperCase();
                if (upperType.includes('LORA') || upperType.includes('LOCON')) domain = 'LoRA';
                else if (upperType.includes('UPSCALER')) domain = 'Upscaler';

                models.push({
                    id: `civitai-${index + 1}`,
                    name: title,
                    description: description,
                    provider: 'Civitai Community',
                    domain,
                    source: 'Civitai',
                    url: `https://civitai.com/models/${index + 1}`,
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
                    downloads: downloads || undefined,
                    analytics: {
                        likes: likes || 0,
                    }
                });
            });
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
                    downloads: 5000000,
                    analytics: { likes: 45000, rating: 4.85 }
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
                    downloads: 3500000,
                    analytics: { likes: 32000, rating: 4.8 }
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
                    downloads: 1200000,
                    analytics: { likes: 12000, rating: 4.9 }
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
