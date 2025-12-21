/**
 * Fetch wrapper that works in both Electron and browser contexts
 * Uses regular fetch - Electron will use its built-in network handling
 */

/**
 * Fetch wrapper that automatically handles proxy routes
 * @param url URL to fetch (can be relative like '/aa-api/...' or absolute)
 * @param options Fetch options
 * @returns Promise<Response>
 */
export async function fetchWrapper(url: string, options?: RequestInit): Promise<Response> {
    // Map proxy routes to actual API URLs when not in dev mode with proxy
    const proxyMappings: Record<string, string> = {
        '/aa-api/': 'https://api.artificialanalysis.ai/',
        '/hf-api/': 'https://huggingface.co/api/',
        '/civitai-api/': 'https://civitai.com/api/v1/'
    };

    // Convert relative proxy URLs to absolute API URLs
    let targetUrl = url;
    if (url.startsWith('/')) {
        for (const [prefix, baseUrl] of Object.entries(proxyMappings)) {
            if (url.startsWith(prefix)) {
                targetUrl = url.replace(prefix, baseUrl);
                break;
            }
        }
    }

    // Use regular fetch
    return fetch(targetUrl, options);
}
