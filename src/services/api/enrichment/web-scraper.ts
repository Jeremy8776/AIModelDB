import { Model } from '../../../types';
import { determineType, determineCommercialUse } from '../utils/license-utils';

type PartialModel = Partial<Model>;

interface ScrapedData {
    author?: string;
    description?: string;
    license?: string;
    params?: string;
    ctx?: string;
    release?: string;
    tags?: string[];
}

export async function enrichFromWebScraping(
    enriched: Model,
    needsData: boolean
): Promise<PartialModel> {
    if (!needsData) {
        return enriched;
    }

    let scraped: ScrapedData | null = null;

    // First try direct URL scraping
    const targetUrl = enriched.url || enriched.repo;
    if (targetUrl && /^(https?:)\/\//.test(targetUrl)) {
        const scrapeResp = await fetch('/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
        });
        if (scrapeResp.ok) {
            scraped = await scrapeResp.json();
        }
    }

    // If still missing critical info, try web search for better sources (only when server search is available)
    const canUseLocalSearch = !import.meta.env.DEV; // Node server provides /search in prod/build:serve
    if (canUseLocalSearch && (!scraped || (!scraped.license && !scraped.params && !scraped.release && !scraped.author))) {
        const searchQueries = [
            `"${enriched.name}" AI model release announcement`,
            `"${enriched.name}" technical report specifications`,
            `"${enriched.name}" official documentation`,
            `${enriched.name} model card parameters`,
            `${enriched.name} AI model paper`
        ];

        for (const query of searchQueries.slice(0, 2)) { // Limit to 2 searches to avoid rate limits
            try {
                const searchResp = await fetch('/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query })
                });

                if (searchResp.ok) {
                    const searchData = await searchResp.json();
                    const results = searchData.organic || searchData.results || [];

                    // Try scraping the top result
                    if (results.length > 0 && results[0].link) {
                        const topUrl = results[0].link;
                        const scrapeResp = await fetch('/scrape', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: topUrl })
                        });

                        if (scrapeResp.ok) {
                            const searchScraped = await scrapeResp.json();
                            if (searchScraped && (searchScraped.license || searchScraped.params || searchScraped.release || searchScraped.author)) {
                                scraped = searchScraped;
                                break; // Found useful info, stop searching
                            }
                        }
                    }
                }
            } catch (searchError) {
                console.warn(`Search failed for query: ${query}`, searchError);
            }

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Apply scraped data and normalize pricing models
    if (scraped) {
        // Extract author/provider information
        if (scraped.author && !enriched.provider) {
            enriched.provider = scraped.author;
        }
        // Extract description
        if (scraped.description && !enriched.description) {
            enriched.description = scraped.description;
        }
        // Extract license info
        if (scraped.license && (!enriched.license?.name || enriched.license.name === 'Unknown')) {
            enriched.license.name = scraped.license;
            enriched.license.type = determineType(scraped.license);
            enriched.license.commercial_use = determineCommercialUse(scraped.license);
        }
        if (scraped.params && !enriched.parameters) enriched.parameters = scraped.params;
        if (scraped.ctx && !enriched.context_window) enriched.context_window = scraped.ctx;
        if (scraped.release && (!enriched.release_date || enriched.release_date === 'Unknown')) {
            enriched.release_date = scraped.release;
        }
        if (Array.isArray(scraped.tags) && scraped.tags.length) {
            const existing = new Set(enriched.tags || []);
            for (const t of scraped.tags) if (!existing.has(t)) existing.add(t);
            enriched.tags = Array.from(existing);
        }

        // Pricing normalization: ensure API vs Subscription split
        if (Array.isArray((enriched as any).pricing)) {
            (enriched as any).pricing = (enriched as any).pricing.map((p: any) => {
                const unit = (p.unit || '').toLowerCase();
                // If flat exists and unit is tokens, treat flat as null to avoid mixing with monthly subs
                if (p.flat != null && (unit.includes('token') || unit.includes('request') || unit.includes('call'))) {
                    return { ...p, unit: unit.includes('1m') ? '1M tokens' : (p.unit || 'tokens'), flat: null };
                }
                // If looks like subscription but unit not set, set default month
                if (p.flat != null && !unit) {
                    return { ...p, unit: 'month' };
                }
                return p;
            });
        }
    }

    return enriched;
}
