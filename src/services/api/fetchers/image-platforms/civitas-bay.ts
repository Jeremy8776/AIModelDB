import { Model } from '../../../../types';
import { proxyUrl } from '../../config';
import { applyCorporateFiltering, isModelComplete } from '../../filtering';
import { normalizeDate, normalizeLicenseName, determineType, determineCommercialUse } from '../../utils';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';

/**
 * Strict NSFW filtering for CivitasBay - blocks obvious explicit content
 * Returns true if content should be BLOCKED
 */
function isObviouslyNSFW(title: string, description: string): boolean {
    const combined = `${title} ${description}`.toLowerCase();

    // Explicit anatomical terms
    const explicitTerms = [
        'penis', 'vagina', 'pussy', 'cock', 'dick', 'boob', 'tit', 'nipple',
        'nude', 'naked', 'nsfw', 'xxx', 'porn', 'hentai', 'sex', 'sexual',
        'erotic', 'fetish', 'bdsm', 'kink', 'orgasm', 'cum', 'ejaculation',
        'masturbat', 'penetrat', 'anal', 'oral', 'blowjob', 'handjob',
        'lingerie', 'underwear', 'panties', 'bra', 'bikini',
        'tentacle', 'ahegao', 'ecchi', 'lewd', 'r18', 'rule34', 'yiff',
    ];

    // Check for explicit terms
    for (const term of explicitTerms) {
        if (combined.includes(term)) {
            return true;
        }
    }

    return false;
}

/**
 * Fetch preserved AI models from CivitasBay torrent platform
 * 
 * CivitasBay is a preservation platform for AI models via torrents.
 * Uses RSS feed for discovery with STRICT NSFW filtering.
 * Fetches multiple pages to get comprehensive model list.
 * 
 * @returns Object containing complete and flagged models
 */
export async function fetchCivitasBay(): Promise<{ complete: Model[], flagged: Model[] }> {
    try {
        console.log('[CivitasBay] Fetching models from RSS feed...');

        const models: Model[] = [];
        const seenIds = new Set<string>();

        // Fetch all pages until we reach the end
        let page = 1;
        while (true) {
            console.log(`[CivitasBay] Fetching page ${page}...`);

            const url = proxyUrl(
                `/civitasbay-api/rss/page${page}`,
                `https://civitasbay.org/rss/torrents?sort_by=recent&page=${page}`
            );

            const response = await fetchWrapper(url);
            if (!response.ok) {
                console.error(`[CivitasBay] ERROR on page ${page}: Status ${response.status} ${response.statusText}`);
                break; // Stop if we hit an error
            }

            const xmlText = await response.text();

            // Parse RSS XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                console.error(`[CivitasBay] XML parsing error on page ${page}:`, parserError.textContent);
                break;
            }

            const items = xmlDoc.querySelectorAll('item');
            console.log(`[CivitasBay] Found ${items.length} items on page ${page}`);

            // If no items, we've reached the end
            if (items.length === 0) {
                console.log(`[CivitasBay] No more items found, stopping at page ${page}`);
                break;
            }

            let newItemsCount = 0;

            items.forEach((item, index) => {
                try {
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    const description = item.querySelector('description')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';
                    const guid = item.querySelector('guid')?.textContent || '';

                    // Extract torrent health data (seeds/peers) as popularity metric
                    let downloads: number | undefined = undefined;
                    let seeds = 0;
                    let peers = 0;

                    const seedsField = item.querySelector('torrent\\:seeds');
                    if (seedsField?.textContent) {
                        seeds = parseInt(seedsField.textContent, 10) || 0;
                    }

                    const peersField = item.querySelector('torrent\\:peers');
                    if (peersField?.textContent) {
                        peers = parseInt(peersField.textContent, 10) || 0;
                    }

                    // Note: CivitasBay doesn't provide original CivitAI download counts
                    // We keep downloads as undefined since it's not available

                    if (!title || !link) {
                        console.warn('[CivitasBay] Skipping item with missing title/link');
                        return;
                    }

                    // STRICT NSFW pre-filter - block obviously explicit content immediately
                    if (isObviouslyNSFW(title, description)) {
                        console.log(`[CivitasBay] Blocked explicit content: ${title}`);
                        return;
                    }

                    // Extract model ID from link or guid
                    const modelId = guid || link.split('/').pop() || `civitasbay-${page}-${index}`;

                    // Skip duplicates
                    if (seenIds.has(modelId)) {
                        return;
                    }
                    seenIds.add(modelId);
                    newItemsCount++;

                    // Parse title to extract model name and metadata
                    // Typical format: "Model Name v1.0 - Category"
                    let modelName = title;
                    let version = '';

                    // Extract version if present (look for v1.0, v2, etc.)
                    const versionMatch = title.match(/\bv(\d+(?:\.\d+)*)\b/i);
                    if (versionMatch) {
                        version = versionMatch[1];
                        // Remove version from model name
                        modelName = title.replace(/\s*v\d+(?:\.\d+)*\b/i, '').trim();
                    }

                    // Clean up model name - remove trailing category after dash if present
                    modelName = modelName.replace(/\s*-\s*[^-]+$/, '').trim();

                    // Determine license from description or default
                    let licenseName = 'Unknown';
                    const licenseMatch = description.match(/license[:\s]+([^\n,]+)/i);
                    if (licenseMatch) {
                        licenseName = licenseMatch[1].trim();
                    }

                    // Extract tags intelligently from title and description
                    const tags = new Set<string>(['preserved', 'torrent', 'community-archive']);
                    if (version) tags.add(`v${version}`);

                    const combinedText = `${title} ${description}`.toLowerCase();

                    // Model type categories
                    const modelTypes = [
                        'checkpoint', 'lora', 'lycoris', 'embedding', 'textual-inversion',
                        'hypernetwork', 'aesthetic-gradient', 'controlnet', 'vae', 'upscaler'
                    ];
                    modelTypes.forEach(type => {
                        if (combinedText.includes(type) || combinedText.includes(type.replace('-', ' '))) {
                            tags.add(type);
                        }
                    });

                    // Style categories
                    const styles = [
                        'realistic', 'anime', 'cartoon', 'semi-realistic', '2.5d', '3d',
                        'photorealistic', 'illustration', 'artistic', 'fantasy', 'sci-fi'
                    ];
                    styles.forEach(style => {
                        if (combinedText.includes(style) || combinedText.includes(style.replace('-', ' '))) {
                            tags.add(style);
                        }
                    });

                    // Base model categories
                    const baseModels = [
                        'sd1.5', 'sd2.1', 'sdxl', 'sd3', 'flux', 'pony', 'illustrious'
                    ];
                    baseModels.forEach(base => {
                        if (combinedText.includes(base) || combinedText.includes(base.replace('.', ' '))) {
                            tags.add(base);
                        }
                    });

                    // Content categories
                    const contentTypes = [
                        'character', 'style', 'concept', 'clothing', 'pose', 'background',
                        'object', 'effect', 'lighting', 'tool'
                    ];
                    contentTypes.forEach(content => {
                        if (combinedText.includes(content)) {
                            tags.add(content);
                        }
                    });

                    // Determine domain based on description content
                    let domain: Model['domain'] = 'ImageGen';
                    const descLower = description.toLowerCase();
                    const titleLower = title.toLowerCase();

                    if (descLower.includes('lora') || titleLower.includes('lora')) {
                        domain = 'LoRA';
                    } else if (descLower.includes('video') || titleLower.includes('video')) {
                        domain = 'VideoGen';
                    }

                    // Construct CivitAI search URL for finding the original model
                    // Add torrent health tags
                    if (seeds > 0) tags.add('seeded');
                    if (seeds >= 5) tags.add('well-seeded');

                    const model: Model = {
                        id: `civitasbay-${modelId}`,
                        name: modelName,
                        description: description || `${modelName} - Preserved AI model via torrent`,
                        provider: 'CivitasBay Community',
                        domain: domain,
                        source: 'CivitasBay',
                        url: link, // CivitasBay torrent page
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
                        downloads: downloads
                    };

                    models.push(model);
                } catch (itemError: any) {
                    console.error(`[CivitasBay] Error processing item:`, itemError?.message || itemError);
                }
            });

            const withDownloads = models.filter(m => m.downloads !== undefined).length;
            console.log(`[CivitasBay] Page ${page}: ${newItemsCount} new models (${models.length} total, ${withDownloads} with download data)`);

            // If we got fewer than 20 items or no new items, probably the last page
            if (items.length < 20 || newItemsCount === 0) {
                console.log(`[CivitasBay] Reached end of feed at page ${page}`);
                break;
            }

            // Small delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 500));

            page++;
        }

        console.log(`[CivitasBay] Processed ${models.length} total models from RSS feed`);

        // Apply corporate NSFW filtering
        // This will catch explicit names/tags but allow general-purpose models
        const corporateFiltered = applyCorporateFiltering(models, true, true);
        console.log(`[CivitasBay] NSFW filter: ${corporateFiltered.complete.length} safe, ${corporateFiltered.flagged.length} blocked`);

        const complete = corporateFiltered.complete.filter(isModelComplete);
        const flagged = corporateFiltered.complete.filter(m => !isModelComplete(m))
            .concat(corporateFiltered.flagged);

        console.log(`[CivitasBay] Final - Complete: ${complete.length}, Flagged: ${flagged.length}`);

        return { complete, flagged };
    } catch (err: any) {
        console.error('[CivitasBay] Fetch error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}
