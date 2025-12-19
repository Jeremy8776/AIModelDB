/**
 * Fetch wrapper that works in both Electron and browser contexts
 * Uses Electron's fetchExternal when available to avoid CORS and file:// protocol issues
 */

declare global {
    interface Window {
        electronAPI?: {
            fetchExternal: (url: string, options?: RequestInit) => Promise<{
                ok: boolean;
                status: number;
                statusText: string;
                headers: Record<string, string>;
                body: string;
            }>;
        };
    }
}

/**
 * Fetch wrapper that automatically uses Electron's proxy when available
 * @param url URL to fetch (can be relative like '/aa-api/...' or absolute)
 * @param options Fetch options
 * @returns Promise<Response>
 */
export async function fetchWrapper(url: string, options?: RequestInit): Promise<Response> {
    // If running in Electron, use the IPC proxy
    if (typeof window !== 'undefined' && window.electronAPI?.fetchExternal) {
        // Map proxy routes to actual API URLs
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

        console.log(`[Fetch Wrapper] Using Electron proxy: ${url} -> ${targetUrl}`);

        try {
            const result = await window.electronAPI.fetchExternal(targetUrl, options);

            // Convert the result back to a Response-like object
            return new Response(result.body, {
                status: result.status,
                statusText: result.statusText,
                headers: new Headers(result.headers)
            });
        } catch (error) {
            console.error(`[Fetch Wrapper] Error fetching ${targetUrl}:`, error);
            throw error;
        }
    }

    // Fallback to regular fetch (for browser/dev mode)
    return fetch(url, options);
}
