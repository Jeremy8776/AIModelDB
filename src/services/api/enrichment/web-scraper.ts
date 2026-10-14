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

    // /scrape is served by the optional Node server (npm run serve). The packaged desktop
    // app loads from file:// and has no such endpoint, so skip instead of failing every model.
    const hasScrapeServer = typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol);
    const targetUrl = enriched.url || enriched.repo;
    if (hasScrapeServer && targetUrl && /^(https?:)\/\//.test(targetUrl)) {
        try {
            const scrapeResp = await fetch('/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl })
            });
            if (scrapeResp.ok) {
                scraped = await scrapeResp.json();
            }
        } catch (scrapeError) {
            console.warn(`Scrape failed for ${targetUrl}`, scrapeError);
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
            if (!enriched.license) {
                enriched.license = {
                    name: 'Unknown',
                    type: 'Custom',
                    commercial_use: false,
                    attribution_required: false,
                    share_alike: false,
                    copyleft: false,
                };
            }
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
