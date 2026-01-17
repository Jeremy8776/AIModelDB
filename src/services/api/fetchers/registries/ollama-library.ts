import * as cheerio from 'cheerio';
import { Model, ApiDir } from '../../../../types';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';
import { loggers } from '../../../../utils/logger';
import { normalizeDate } from '../../utils';
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../../sync/SyncTypes';

const logger = loggers.sync;

/**
 * Ollama Library Fetcher Implementation
 */
export const ollamaLibraryFetcher: Fetcher = {
    id: 'ollamaLibrary',
    name: 'Ollama Library',
    isEnabled: (options: SyncOptions) => !!options.dataSources?.ollamaLibrary,

    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        try {
            logger.debug('[Ollama] Fetching popular models...');

            // Use Electron proxy to bypass CORS
            let html: string;
            // Check for window.electronAPI availability safely
            if ((window as any).electronAPI?.proxyRequest) {
                const result = await (window as any).electronAPI.proxyRequest({
                    url: 'https://ollama.com/library',
                    method: 'GET'
                });
                if (!result?.success) {
                    throw new Error(`Failed to fetch Ollama library: ${result?.error || 'Unknown error'}`);
                }
                html = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            } else {
                // Fallback to regular fetch (won't work due to CORS in browser)
                const response = await fetchWrapper('https://ollama.com/library');
                if (!response.ok) {
                    throw new Error(`Failed to fetch Ollama library: ${response.status}`);
                }
                html = await response.text();
            }

            const $ = cheerio.load(html);

            const models: Model[] = [];

            const listItems = $('li');

            listItems.each((_, el) => {
                const $el = $(el);
                const $link = $el.find('a[href^="/library/"]');

                if ($link.length === 0) return;

                const href = $link.attr('href') || '';
                const id = href.replace('/library/', '');
                if (!id) return;

                let name = $link.find('h2').text().trim();
                if (!name) name = id;

                const description = $link.find('p').first().text().trim();

                const textContent = $el.text();

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

                // Extract date (Updated ...)
                let updatedAt = new Date().toISOString();

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
                    context_window: '0',
                    parameters: '',
                    license: {
                        name: 'Unknown',
                        type: 'Custom',
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
                };

                // Naive domain detection
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

                models.push(model);
            });

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
