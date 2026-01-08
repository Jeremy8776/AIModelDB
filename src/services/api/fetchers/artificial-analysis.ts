import { Model } from '../../../types';
import { normalizeDate } from '../utils';
import { isModelComplete } from '../filtering';
import { fetchWrapper } from '../../../utils/fetch-wrapper';

/**
 * Fetch models from ArtificialAnalysis API - all endpoints
 * @param apiKey Optional API key for ArtificialAnalysis
 * @returns Object containing complete and flagged models
 */
export async function fetchArtificialAnalysisIndex(apiKey?: string): Promise<{ complete: Model[], flagged: Model[] }> {
    try {
        // If apiKey is not provided, skip entirely to avoid 401 errors
        if (!apiKey || apiKey.trim() === '') {
            console.log('[ArtificialAnalysis] Skipping fetch: No API key provided');
            return { complete: [], flagged: [] };
        }

        // Clean the key to remove accidental whitespace
        const cleanKey = apiKey.trim();

        console.log('[ArtificialAnalysis] Fetching models from all API endpoints...');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-api-key': cleanKey
        };

        console.log(`[ArtificialAnalysis] Using API key: Yes`);

        // Fetch from all available endpoints
        // Based on Artificial Analysis API documentation: https://artificialanalysis.ai/documentation
        // API requires authentication via x-api-key header
        const baseUrl = 'https://artificialanalysis.ai/api/v2/data';
        const endpoints = [
            { url: `${baseUrl}/llms/models`, domain: 'LLM' as const, type: 'Text LLM' },
            { url: `${baseUrl}/media/image-editing`, domain: 'ImageGen' as const, type: 'Image Editing' },
            { url: `${baseUrl}/media/text-to-speech`, domain: 'TTS' as const, type: 'Text-to-Speech' },
            { url: `${baseUrl}/media/text-to-video`, domain: 'VideoGen' as const, type: 'Text-to-Video' },
            { url: `${baseUrl}/media/image-to-video`, domain: 'VideoGen' as const, type: 'Image-to-Video' },
        ];

        const allModels: Model[] = [];

        // Fetch from each endpoint
        for (const endpoint of endpoints) {
            try {
                console.log(`[ArtificialAnalysis] Fetching ${endpoint.type} models from: ${endpoint.url}`);
                // Use direct fetch instead of fetchWrapper for static deployment
                const response = await fetch(endpoint.url, {
                    headers,
                    mode: 'cors' // Enable CORS
                });

                if (!response.ok) {
                    console.error(`[ArtificialAnalysis] ${endpoint.type} error: ${response.status} ${response.statusText}`);
                    continue;
                }

                const apiData = await response.json();
                console.log(`[ArtificialAnalysis] ${endpoint.type} API response received`);

                // Parse models from API response
                const modelsData = apiData.data || [];
                console.log(`[ArtificialAnalysis] Found ${modelsData.length} ${endpoint.type} models`);

                for (const item of modelsData) {
                    if (!item.name) continue;

                    // Extract pricing information
                    const pricing = [];
                    if (item.pricing) {
                        const pricingEntry: any = {
                            model: item.name,
                            unit: '1M tokens',
                            currency: 'USD',
                            url: null
                        };

                        // Only add input/output if they have valid non-zero values
                        if (item.pricing.price_1m_input_tokens && item.pricing.price_1m_input_tokens > 0) {
                            pricingEntry.input = item.pricing.price_1m_input_tokens;
                        }
                        if (item.pricing.price_1m_output_tokens && item.pricing.price_1m_output_tokens > 0) {
                            pricingEntry.output = item.pricing.price_1m_output_tokens;
                        }
                        if (item.pricing.price_1m_blended_3_to_1 && item.pricing.price_1m_blended_3_to_1 > 0) {
                            pricingEntry.notes = `Blended 3:1 ~ ${item.pricing.price_1m_blended_3_to_1}/1M`;
                        }

                        // Only add pricing entry if it has at least one valid price field
                        if (pricingEntry.input || pricingEntry.output || pricingEntry.notes) {
                            pricing.push(pricingEntry);
                        }
                    }

                    // Try to infer/normalize release date from AA fields
                    const aaReleaseRaw = item.release_date || item.first_seen || item.published_at || item.created_at || item.date;
                    const normalizedRelease = normalizeDate(aaReleaseRaw) || null;

                    // Extract benchmarks from AA data
                    const benchmarks = [];
                    if (item.elo) {
                        benchmarks.push({ name: 'ELO Rating', score: item.elo, unit: 'elo', source: 'ArtificialAnalysis' });
                    }
                    if (item.rank) {
                        benchmarks.push({ name: 'Rank', score: item.rank, unit: 'rank', source: 'ArtificialAnalysis' });
                    }
                    if (item.quality_index) {
                        benchmarks.push({ name: 'Quality Index', score: item.quality_index, unit: 'score', source: 'ArtificialAnalysis' });
                    }
                    if (item.speed) {
                        benchmarks.push({ name: 'Speed', score: item.speed, unit: 'tokens/s', source: 'ArtificialAnalysis' });
                    }
                    if (item.price_index) {
                        benchmarks.push({ name: 'Price Index', score: item.price_index, unit: 'index', source: 'ArtificialAnalysis' });
                    }

                    // Check for future/unreleased dates
                    const tags: string[] = ['commercial', endpoint.type.toLowerCase(), 'benchmarked', item.model_creator?.slug].filter(Boolean) as string[];
                    let isFutureRelease = false;

                    if (normalizedRelease) {
                        const releaseDate = new Date(normalizedRelease);
                        // Check if release date is in the future (compared to now)
                        if (releaseDate > new Date()) {
                            isFutureRelease = true;
                            tags.push('unreleased', 'leaked', 'future-release');
                        }
                    }

                    const model: Model = {
                        id: `aa-${item.id || item.slug}`,
                        name: item.name,
                        description: `${item.name} - Artificial Analysis benchmarked ${endpoint.type} model (Rank #${item.rank}, ELO: ${item.elo})${isFutureRelease ? ' [UNRELEASED/SPECULATIVE]' : ''}`,
                        provider: item.model_creator?.name || 'Unknown',
                        domain: endpoint.domain,
                        source: 'ArtificialAnalysis',
                        url: item.slug ? `https://artificialanalysis.ai/models/${item.slug}` : 'https://artificialanalysis.ai/models',
                        repo: null,
                        license: {
                            name: 'Commercial',
                            type: 'Proprietary',
                            commercial_use: true,
                            attribution_required: true, // API requires attribution
                            share_alike: false,
                            copyleft: false
                        },
                        pricing,
                        updated_at: normalizeDate(item.updated_at) || new Date().toISOString(),
                        release_date: normalizedRelease,
                        tags,
                        parameters: null,
                        context_window: null,
                        indemnity: 'VendorProgram',
                        data_provenance: 'Commercial',
                        usage_restrictions: [],
                        hosting: {
                            weights_available: false,
                            api_available: true,
                            on_premise_friendly: false
                        },
                        downloads: undefined,
                        benchmarks: benchmarks.length > 0 ? benchmarks : undefined
                    };

                    allModels.push(model);
                }
            } catch (endpointError: any) {
                console.error(`[ArtificialAnalysis] ${endpoint.type} error:`, endpointError?.message || endpointError);
            }
        }

        console.log(`[ArtificialAnalysis] Processed ${allModels.length} total models from all endpoints`);

        // Enrich missing data minimally: try to infer release date from name/slug if still missing
        for (const m of allModels) {
            if (!m.release_date) {
                const nameYear = String(m.name || '').match(/(20\d{2})/);
                if (nameYear) m.release_date = `${nameYear[1]}-01-01`;
            }
        }

        // Separate complete vs flagged models
        const complete = allModels.filter(isModelComplete);
        const flagged = allModels.filter(m => !isModelComplete(m));

        return { complete, flagged };

    } catch (err: any) {
        console.error('[ArtificialAnalysis] API error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}
