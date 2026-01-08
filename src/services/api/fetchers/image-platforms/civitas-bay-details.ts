import { proxyUrl } from '../../config';
import { fetchWrapper } from '../../../../utils/fetch-wrapper';

export interface CivitasBayDetails {
    civitaiUrl?: string;
    imageUrl?: string;
    fullDescription?: string;
    creator?: string;
    version?: string;
    baseModel?: string;
    fileSize?: string;
    hash?: string;
    images?: string[];
}

/**
 * CivitasBay API response structure (partial)
 */
interface CivitasBayApiResponse {
    name?: string;
    description?: string;
    civitai_url?: string;
    civitai_model_id?: number;
    civitai_version_id?: number;
    base_model?: string;
    creator?: string;
    media?: Array<{
        url: string;
        type?: string;
        width?: number;
        height?: number;
    }>;
}

/**
 * Fetch detailed information from CivitasBay's JSON API
 * 
 * CivitasBay has a hidden JSON API at /api/torrents/{BTIH_HASH}
 * This returns full model details including image URLs from imagecache.civitai.com
 * which is accessible even in regions where CivitAI is blocked.
 * 
 * @param torrentPageUrl - The CivitasBay torrent page URL
 * @returns Detailed model information including images
 */
export async function fetchCivitasBayDetails(torrentPageUrl: string): Promise<CivitasBayDetails | null> {
    try {
        console.log(`[CivitasBay Details] Fetching: ${torrentPageUrl}`);

        // Extract the hash from the URL
        const hashMatch = torrentPageUrl.match(/torrents\/([A-F0-9]+)/i);
        if (!hashMatch) {
            console.error('[CivitasBay Details] Invalid URL format');
            return null;
        }

        const hash = hashMatch[1];
        const apiUrl = `https://civitasbay.org/api/torrents/${hash}`;

        console.log(`[CivitasBay Details] Using API: ${apiUrl}`);

        let data: CivitasBayApiResponse;

        // Use Electron proxy if available to bypass CORS
        if (window.electronAPI?.proxyRequest) {
            const result = await window.electronAPI.proxyRequest({
                url: apiUrl,
                method: 'GET'
            });

            if (!result.success) {
                console.error(`[CivitasBay Details] Proxy error: ${result.error}`);
                return null;
            }

            data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        } else {
            // Fallback for dev environment or browser
            const url = proxyUrl(`/civitasbay-api/api/torrents/${hash}`, apiUrl);
            const response = await fetchWrapper(url);
            if (!response.ok) {
                console.error(`[CivitasBay Details] ERROR: Status ${response.status}`);
                return null;
            }
            data = await response.json();
        }

        // Extract details from API response
        const details: CivitasBayDetails = {
            hash,
            civitaiUrl: data.civitai_url || undefined,
            fullDescription: data.description || undefined,
            creator: data.creator || undefined,
            baseModel: data.base_model || undefined,
        };

        // Extract images from media array
        const images: string[] = [];
        if (data.media && Array.isArray(data.media)) {
            data.media.forEach((item) => {
                if (item.url && !images.includes(item.url)) {
                    images.push(item.url);
                }
            });
        }

        // Limit to 10 images to avoid memory issues
        details.images = images.slice(0, 10);

        // Use first image as main image
        if (details.images.length > 0) {
            details.imageUrl = details.images[0];
        }

        console.log(`[CivitasBay Details] Found ${details.images?.length || 0} images from API`);
        console.log(`[CivitasBay Details] Extracted:`, details);
        return details;

    } catch (err: any) {
        console.error('[CivitasBay Details] Fetch error:', err?.message || err);
        return null;
    }
}
