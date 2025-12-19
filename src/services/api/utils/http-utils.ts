/**
 * HTTP utility functions for safe fetching with timeout and error handling
 */

/**
 * Safe fetch with timeout and error handling
 * Returns null on error instead of throwing
 */
export async function safeFetch(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.warn(`Fetch timeout after ${timeoutMs}ms: ${url}`);
        } else {
            console.warn(`Fetch error for ${url}:`, error.message);
        }
        return null;
    }
}
