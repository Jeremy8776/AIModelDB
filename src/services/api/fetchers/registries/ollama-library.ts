import * as cheerio from 'cheerio';
import { Model, ApiDir } from '../../../../types';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';
import { loggers } from '../../../../utils/logger';
import { parseRelativeDate } from '../../../../utils';
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../../sync/SyncTypes';

const logger = loggers.sync;

/**
 * Ollama Library Fetcher Implementation
 */
export const ollamaLibraryFetcher: Fetcher = {
    id: 'ollamaLibrary',
    name: 'Ollama Library',
    isEnabled: (options: SyncOptions) => options.dataSources?.ollamaLibrary === true,

    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        try {
            logger.debug('[Ollama] Fetching popular models...');

            // Fetch main library page
            const html = await fetchHtml('https://ollama.com/library');
            const $ = cheerio.load(html);

            const initialModels: Model[] = [];
            const listItems = $('li');

            listItems.each((_, el) => {
                const $el = $(el);
                const $link = $el.find('a[href^="/library/"]');

                if ($link.length === 0) return;

                const href = $link.attr('href') || '';
                const id = href.replace('/library/', '');
                if (!id) return;

                let name = $link.find('h2').text().trim();
                // Fallback for name if h2 is empty (unlikely but safe)
                if (!name) name = id;

                const description = $link.find('p').first().text().trim();
                const textContent = $el.text();

                // Extract downloads
                let downloads = 0;
                const pullsMatch = textContent.match(/([\d.]+[KMB])\s+Pulls/i);
                if (pullsMatch) {
                    const numStr = pullsMatch[1].toUpperCase();
                    let multiplier = 1;
                    if (numStr.endsWith('K')) multiplier = 1000;
                    if (numStr.endsWith('M')) multiplier = 1000000;
                    if (numStr.endsWith('B')) multiplier = 1000000000;
                    downloads = parseFloat(numStr) * multiplier;
                }

                // Extract dates
                let updatedAt = new Date().toISOString();
                let releaseDate = null;
                const updatedText = $el.text().match(/Updated\s+.*?\s+ago/i)?.[0];
                if (updatedText) {
                    const parsed = parseRelativeDate(updatedText.replace('Updated', '').trim());
                    if (parsed) {
                        updatedAt = parsed.toISOString();
                        releaseDate = parsed.toISOString();
                    }
                }

                const model: Model = {
                    id: `ollama-${id}`,
                    name: name,
                    description: description,
                    provider: 'Ollama Library',
                    source: 'Ollama Library',
                    url: `https://ollama.com${href}`,
                    tags: ['ollama', 'gguf'],
                    downloads: Math.floor(downloads),
                    domain: 'LLM',
                    context_window: '0', // Will update in deep fetch
                    parameters: '',      // Will update in deep fetch
                    license: {
                        name: 'Open Weights',
                        type: 'OSI',
                        commercial_use: false,
                        attribution_required: false,
                        share_alike: false,
                        copyleft: false,
                        notes: 'Check Ollama model page for details'
                    },
                    hosting: {
                        weights_available: true,
                        api_available: false,
                        on_premise_friendly: true,
                        providers: ['Ollama']
                    },
                    updated_at: updatedAt,
                    release_date: releaseDate,
                    analytics: {
                        pulls: Math.floor(downloads)
                    },
                };

                // Initial domain detection
                const lowerDesc = description.toLowerCase();
                if (lowerDesc.includes('vision') || lowerDesc.includes('image')) {
                    model.domain = 'VLM';
                } else if (lowerDesc.includes('code') || lowerDesc.includes('coding')) {
                    model.domain = 'LLM';
                    model.tags?.push('coding');
                } else if (lowerDesc.includes('embedding')) {
                    model.domain = 'Other';
                    model.tags?.push('embedding');
                }

                initialModels.push(model);
            });

            logger.info(`[Ollama] Found ${initialModels.length} models. Starting deep fetch...`);

            // 2. Deep Fetch Details (Batched)
            const models: Model[] = [];
            const BATCH_SIZE = 5;

            for (let i = 0; i < initialModels.length; i += BATCH_SIZE) {
                const batch = initialModels.slice(i, i + BATCH_SIZE);

                if (callbacks?.onLog) {
                    callbacks.onLog(`[Ollama] Fetching details for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(initialModels.length / BATCH_SIZE)}`);
                }

                const enrichedBatch = await Promise.all(batch.map(async (model) => {
                    try {
                        if (!model.url) return model;

                        const detailHtml = await fetchHtml(model.url);
                        const $d = cheerio.load(detailHtml);

                        // 1. Tags/Badges (e.g. "Tools", "Thinking")
                        // Looking for small rounded badges often in the header area
                        // Based on site analysis: often spans with bg-blue-100 or similar
                        // Searching for specific text content in common badge classes
                        const potentialBadges = ['tools', 'thinking', 'vision', 'chat', 'code'];
                        potentialBadges.forEach(tag => {
                            if ($d(`span:contains("${tag}")`).length > 0 || $d(`div:contains("${tag}")`).length > 0) {
                                // Simple text check in badges isn't reliable, but let's try specific UI elements
                                // Ollama usually puts these in a flex container near title
                                const hasTag = $d('main').text().toLowerCase().includes(tag); // Too broad?
                                // Let's check the specific "Tags" area if identifiable.
                                // It's usually right under the title.
                            }
                        });

                        // Parse "Model Info" / "Models" table for Context & Size
                        // Find the table that lists variants (latest, q4_k_m, etc)
                        // It usually has columns: Name, Size, Context, Input
                        let context = model.context_window;
                        let size = model.parameters;

                        // Find table header for Context
                        const $table = $d('table').first();
                        if ($table.length) {
                            const headers = $table.find('th').map((_, th) => $d(th).text().trim().toLowerCase()).get();
                            const contextIdx = headers.findIndex(h => h.includes('context'));
                            const sizeIdx = headers.findIndex(h => h.includes('size'));

                            if (contextIdx !== -1) {
                                const val = $table.find('tbody tr').first().find('td').eq(contextIdx).text().trim();
                                if (val) context = val;
                            }
                            if (sizeIdx !== -1) {
                                const val = $table.find('tbody tr').first().find('td').eq(sizeIdx).text().trim();
                                if (val) size = val;
                            }
                        }

                        // Parse "Input" for tags
                        // "Text" -> LLM, "Vision" -> VLM, etc
                        // In the table, row 1
                        const $row = $table.find('tbody tr').first();
                        const rowText = $row.text().toLowerCase();
                        if (rowText.includes('vision') || rowText.includes('image')) {
                            model.domain = 'VLM';
                        }

                        // Extra Tags from Badges (blue pills)
                        // They are usually links or spans with specific styling
                        // <a href="/library/..." class="...">tools</a>
                        const $badges = $d('a[href*="/search?q="], a[class*="rounded"]');
                        $badges.each((_, el) => {
                            const txt = $d(el).text().trim().toLowerCase();
                            if (['tools', 'thinking', 'vision', 'embedding'].includes(txt)) {
                                if (!model.tags?.includes(txt)) model.tags?.push(txt);
                            }
                        });

                        return {
                            ...model,
                            context_window: context,
                            parameters: size
                        };

                    } catch (err) {
                        logger.warn(`[Ollama] Failed to fetch details for ${model.name}`, err);
                        return model;
                    }
                }));

                models.push(...enrichedBatch);

                // Update progress
                if (callbacks?.onProgress) {
                    callbacks.onProgress({
                        current: models.length,
                        total: initialModels.length,
                        source: 'Ollama Library',
                        statusMessage: `Fetching details...`
                    });
                }
            }

            logger.info(`[Ollama] Found ${models.length} models`);

            return {
                complete: models,
                flagged: []
            };

        } catch (error: any) {
            logger.error('[Ollama] Error fetching models:', error);
            return { complete: [], flagged: [] };
        }
    }
};

/**
 * Backward compatibility export
 */
export async function fetchOllamaLibrary(): Promise<{ complete: Model[], flagged: Model[] }> {
    return ollamaLibraryFetcher.fetch({ dataSources: { ollamaLibrary: true } } as any);
}

/**
 * Helper to fetch HTML content, handling Electron proxy if available
 */
async function fetchHtml(url: string): Promise<string> {
    if ((window as any).electronAPI?.proxyRequest) {
        const result = await (window as any).electronAPI.proxyRequest({
            url,
            method: 'GET'
        });
        if (!result?.success) {
            throw new Error(`Proxy request failed for ${url}: ${result?.error}`);
        }
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    } else {
        const response = await fetchWrapper(url);
        if (!response.ok) {
            throw new Error(`Fetch failed for ${url}: ${response.status}`);
        }
        return await response.text();
    }
}
