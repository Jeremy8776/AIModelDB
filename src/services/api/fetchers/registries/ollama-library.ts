import * as cheerio from 'cheerio';
import { Model, ApiDir } from '../../../../types';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';
import { normalizeDate } from '../../utils';

/**
 * Fetches the popular models from Ollama Library (ollama.com/library)
 * 
 * Scrapes the HTML to get the list of top models, their descriptions,
 * download counts, and tags.
 */
export async function fetchOllamaLibrary(): Promise<{ complete: Model[], flagged: Model[] }> {
    try {
        console.log('[Ollama Library] Fetching popular models...');

        // Use Electron proxy to bypass CORS
        let html: string;
        if (window.electronAPI?.proxyRequest) {
            const result = await window.electronAPI.proxyRequest({
                url: 'https://ollama.com/library',
                method: 'GET'
            });
            if (!result?.success) {
                throw new Error(`Failed to fetch Ollama library: ${result?.error || 'Unknown error'}`);
            }
            // The proxy returns data, but for HTML we need the raw text
            // If it's a string, use it directly; if object, it might have been parsed
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

        // Find all model list items
        // Based on analysis, each model is typically an <li> or <div> containing a link to /library/modelname
        // We look for the main list items. The list is usually an <ul> 

        const listItems = $('li');

        listItems.each((_, el) => {
            const $el = $(el);
            const $link = $el.find('a[href^="/library/"]');

            if ($link.length === 0) return;

            const href = $link.attr('href') || '';
            const id = href.replace('/library/', '');
            if (!id) return;

            // Name is usually in an h2 or similar inside the link
            let name = $link.find('h2').text().trim();
            if (!name) name = id; // Fallback to ID

            // Description is usually a p tag
            const description = $link.find('p').first().text().trim();

            // Stats (Pulls, Tags, Date) are usually in a flex container at the bottom
            const textContent = $el.text();

            // Extract downloads (e.g. "10M Pulls")
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

            // Extract tags count
            const tagsMatch = textContent.match(/(\d+)\s+Tags/i);

            // Extract date (Updated ...)
            let updatedAt = new Date().toISOString();
            const dateMatch = textContent.match(/Updated\s+(.+?)(?=\n|$)/);
            // Relative date parsing is hard without a library, usually just default to now 
            // or if we really need it, we can guess. But Ollama dates are like "2 months ago".
            // Implementation of relative date parser omitted for simplicity/stability, using now.

            const model: Model = {
                id: `ollama-${id}`,
                name: name,
                description: description,
                provider: 'Ollama Library',
                source: 'Ollama Library',
                url: `https://ollama.com${href}`,
                tags: ['ollama', 'gguf'], // Ollama uses GGUF/Llama.cpp under the hood usually
                downloads: Math.floor(downloads),
                domain: 'LLM', // Default, we can refine later
                context_window: '0', // Unknown from list
                parameters: '',     // Unknown from list
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
                model.domain = 'LLM'; // Specialist
                model.tags?.push('coding');
            } else if (lowerDesc.includes('embedding')) {
                model.domain = 'Other'; // Embeddings fall under "Other"
                model.tags?.push('embedding');
            }

            models.push(model);
        });

        console.log(`[Ollama Library] Found ${models.length} models`);

        return {
            complete: models,
            flagged: []
        };

    } catch (error: any) {
        console.error('[Ollama Library] Error fetching models:', error);
        return { complete: [], flagged: [] };
    }
}
