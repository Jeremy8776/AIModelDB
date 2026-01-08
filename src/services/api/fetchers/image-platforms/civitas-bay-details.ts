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
 * Scrape detailed information from a CivitasBay torrent page
 * This is called on-demand when a user views a model
 * 
 * @param torrentPageUrl - The CivitasBay torrent page URL
 * @returns Detailed model information
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


        let html: string;

        // Use Electron proxy if available to bypass CORS
        if (window.electronAPI?.proxyRequest) {
            // Logic for using proxy in production
            // We use the original url, not the proxy path
            const result = await window.electronAPI.proxyRequest({
                url: torrentPageUrl,
                method: 'GET'
            });

            if (!result.success) {
                console.error(`[CivitasBay Details] Proxy error: ${result.error}`);
                return null;
            }

            html = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
        } else {
            // Fallback for dev environment or browser
            const url = proxyUrl(`/civitasbay-api/torrent/${hash}`, torrentPageUrl);
            const response = await fetchWrapper(url);
            if (!response.ok) {
                console.error(`[CivitasBay Details] ERROR: Status ${response.status}`);
                return null;
            }
            html = await response.text();
        }

        // Parse HTML to extract information
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const details: CivitasBayDetails = {};

        // Extract CivitAI source link
        const civitaiLink = doc.querySelector('a[href*="civitai.com"]');
        if (civitaiLink) {
            details.civitaiUrl = civitaiLink.getAttribute('href') || undefined;
        }

        // Extract all images (look for model images)
        // Extract all images with improved selectors for galleries/sliders
        const images: string[] = [];
        // Target specific gallery/slider classes and general images
        const selectors = [
            '.splide__slide img',        // Slider images
            '.gallery-item img',         // Gallery items
            '.model-gallery img',
            '.torrent-images img',
            '.card-img-top',
            'img[src*="civitai.com/images"]', // CivitAI hosted images
            'img.img-fluid',
            '.description img'           // Images in description
        ];

        const imageElements = doc.querySelectorAll(selectors.join(', '));

        imageElements.forEach((img) => {
            let src = img.getAttribute('src');
            // Handle lazy loading attributes if present
            if (!src && img.hasAttribute('data-src')) src = img.getAttribute('data-src');

            if (src && !images.includes(src)) {
                // Filter out common UI elements/icons
                const lowerSrc = src.toLowerCase();
                const isJunk =
                    lowerSrc.includes('logo') ||
                    lowerSrc.includes('icon') ||
                    lowerSrc.includes('avatar') ||
                    lowerSrc.includes('user') ||
                    lowerSrc.includes('placeholder');

                if (!isJunk) {
                    images.push(src);
                }
            }
        });

        details.images = images;
        // Use the first image as the main image if not already set
        if (images.length > 0) {
            details.imageUrl = images[0];
        }

        // Extract creator/author
        const creatorElement = doc.querySelector('.creator, .author, [class*="creator"], [class*="author"]');
        if (creatorElement) {
            details.creator = creatorElement.textContent?.trim();
        }

        // Extract version
        const versionElement = doc.querySelector('.version, [class*="version"]');
        if (versionElement) {
            details.version = versionElement.textContent?.trim();
        }

        // Extract base model (SD1.5, SDXL, etc.)
        const baseModelElement = doc.querySelector('.base-model, [class*="base-model"]');
        if (baseModelElement) {
            details.baseModel = baseModelElement.textContent?.trim();
        }

        // Extract file size
        const fileSizeElement = doc.querySelector('.file-size, [class*="size"]');
        if (fileSizeElement) {
            details.fileSize = fileSizeElement.textContent?.trim();
        }

        // Extract full description
        const descriptionElement = doc.querySelector('.description, .model-description, [class*="description"]');
        if (descriptionElement) {
            details.fullDescription = descriptionElement.textContent?.trim();
        }

        // Store the hash
        details.hash = hash;

        console.log(`[CivitasBay Details] Extracted:`, details);
        return details;

    } catch (err: any) {
        console.error('[CivitasBay Details] Fetch error:', err?.message || err);
        return null;
    }
}
