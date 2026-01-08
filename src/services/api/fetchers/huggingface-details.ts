
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
        const url = proxyUrl(
            `/huggingface-api/models/${modelId}`,
            `https://huggingface.co/api/models/${modelId}`
        );

        const response = await fetchWrapper(url);
        if (!response.ok) {
            console.error(`[HuggingFace Details] ERROR: Status ${response.status}`);
            return null;
        }

        const data = await response.json();
        const images: string[] = [];

        // Check siblings for image files
        if (data.siblings && Array.isArray(data.siblings)) {
            data.siblings.forEach((file: any) => {
                const filename = file.rfilename;
                if (filename && /\.(png|jpg|jpeg|webp|gif)$/i.test(filename)) {
                    // Construct raw URL using SHA if available for stability, otherwise fallback to main
                    const ref = data.sha || 'main';
                    images.push(`https://huggingface.co/${modelId}/resolve/${ref}/${filename}`);
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
