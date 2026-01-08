
import { proxyUrl } from '../config';
import { fetchWrapper } from '../../../utils/fetch-wrapper';

export interface ModelGalleryDetails {
    images?: string[];
    description?: string;
}

/**
 * Fetch detailed information (images) from HuggingFace API
 * 
 * @param modelId - The HuggingFace model ID (e.g. "meta-llama/Llama-2-7b")
 * @returns Detailed model information including images
 */
export async function fetchHuggingFaceDetails(modelId: string): Promise<ModelGalleryDetails | null> {
    try {
        console.log(`[HuggingFace Details] Fetching: ${modelId}`);

        const prodUrl = `https://huggingface.co/api/models/${modelId}`;
        let data: any;

        // Use Electron proxy if available to bypass CORS
        if (window.electronAPI?.proxyRequest) {
            // Use the Electron proxy for production
            const result = await window.electronAPI.proxyRequest({
                url: prodUrl,
                method: 'GET'
            });

            if (!result.success) {
                console.error(`[HuggingFace Details] Proxy error: ${result.error}`);
                return null;
            }

            data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        } else {
            // Fallback for dev environment or browser
            const url = proxyUrl(
                `/huggingface-api/models/${modelId}`,
                prodUrl
            );

            const response = await fetchWrapper(url);
            if (!response.ok) {
                console.error(`[HuggingFace Details] ERROR: Status ${response.status}`);
                return null;
            }

            data = await response.json();
        }
        const images: string[] = [];

        // Check siblings for image files (including in subdirectories)
        if (data.siblings && Array.isArray(data.siblings)) {
            data.siblings.forEach((file: any) => {
                const filename = file.rfilename;
                if (filename) {
                    // Match images anywhere in the path (e.g., assets/image.png, samples/test.jpg)
                    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
                        // Skip common non-preview images
                        const lowerName = filename.toLowerCase();
                        if (lowerName.includes('thumbnail') ||
                            lowerName.includes('logo') ||
                            lowerName.includes('icon') ||
                            lowerName.includes('badge')) {
                            return;
                        }
                        // Construct raw URL using SHA if available for stability
                        const ref = data.sha || 'main';
                        images.push(`https://huggingface.co/${modelId}/resolve/${ref}/${filename}`);
                    }
                }
            });
        }

        // Limit to reasonable amount
        const limitedImages = images.slice(0, 10);

        return {
            images: limitedImages,
            description: data.cardData?.description // Sometimes present in cardData
        };

    } catch (err: any) {
        console.error('[HuggingFace Details] Fetch error:', err?.message || err);
        return null;
    }
}
