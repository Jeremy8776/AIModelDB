/**
 * Translation Module
 *
 * Translates CJK (Chinese, Japanese, Korean) text in model names and
 * descriptions to English using Electron IPC -> Google Translate. Falls
 * back to "Keep Original Name" when the IPC bridge or Google Translate
 * is unavailable (e.g. running in the dev web shell).
 */

import { Model, ApiDir } from '../../../types';
import { containsChinese, containsOtherAsianLanguages } from './language-detection';

/**
 * Translates Chinese, Japanese, and Korean text in model names and descriptions to English.
 *
 * @param models - Array of models to translate
 * @param _apiConfig - Reserved for future LLM fallback; unused while we run on Google Translate alone
 * @returns Promise resolving to array of models with translated text
 *
 * @remarks
 * This function:
 * - Identifies models with Chinese/CJK text in name or description
 * - Uses Electron IPC -> Google Translate API (no API key required)
 * - Processes models in batches of 25 for rate-limit friendliness
 * - Falls back to "Keep Original Name" if translation is unavailable
 *   (e.g. running outside Electron, or Google Translate is unreachable)
 * - Adds 'translated' tag to successfully translated models
 */

export async function translateChineseModels(
    models: Model[],
    _apiConfig?: ApiDir,
    onProgress?: (progress: string) => void
): Promise<Model[]> {
    try {
        // Find models that need translation (Chinese, Japanese, or Korean)
        const toTranslate = models.filter(m =>
            containsChinese(m.name) ||
            containsChinese(m.description) ||
            containsOtherAsianLanguages(m.name) ||
            containsOtherAsianLanguages(m.description)
        );

        if (toTranslate.length === 0) {
            console.log('[Translation] No models with Chinese/CJK text found');
            return models;
        }

        // Translation depends on Electron's IPC to Google Translate. In web/dev
        // mode the bridge is absent — fall back to "keep original" so callers
        // still get a consistent shape rather than a thrown error mid-sync.
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.translateText) {
            console.warn('[Translation] electronAPI.translateText unavailable — skipping CJK translation (likely running outside Electron).');
            const fallbackModels = [...models];
            applyFallbackTranslation(fallbackModels);
            return fallbackModels;
        }

        console.log(`[Translation] Found ${toTranslate.length} models with Chinese/CJK text to translate`);

        // Process in smaller batches for better API success rate
        const batchSize = 25;
        const translatedModels = [...models];
        let fallbackBatchCount = 0;
        let fallbackReason: string | null = null;

        for (let i = 0; i < toTranslate.length; i += batchSize) {
            const batch = toTranslate.slice(i, i + batchSize).map(m => ({
                id: m.id,
                name: m.name || '',
                description: m.description || '',
                provider: m.provider || ''
            }));

            // Prompts removed as LLM is disabled

            try {
                // Run Google Translate per-item in parallel (rate-limit guarded by per-batch sleep below)
                const googleResults = await Promise.all(batch.map(async (item) => {
                    try {
                        let nameEn = item.name;
                        if (containsChinese(item.name) || containsOtherAsianLanguages(item.name)) {
                            const res = await electronAPI.translateText(item.name);
                            if (res.error) throw new Error(res.error);
                            nameEn = res.text;
                        }

                        let descEn = item.description;
                        if (item.description && (containsChinese(item.description) || containsOtherAsianLanguages(item.description))) {
                            // Google Translate hard limit is 5000 chars per call
                            const textToTranslate = item.description.slice(0, 4500);
                            const res = await electronAPI.translateText(textToTranslate);
                            if (res.error) throw new Error(res.error);
                            descEn = res.text;
                        }

                        return { ...item, name_en: nameEn, description_en: descEn };
                    } catch (e) {
                        return null;
                    }
                }));

                if (googleResults.every(r => r !== null)) {
                    for (let j = 0; j < translatedModels.length; j++) {
                        const t = googleResults.find(r => r && r.id === translatedModels[j].id);
                        if (t) {
                            translatedModels[j] = {
                                ...translatedModels[j],
                                name: t.name_en || translatedModels[j].name,
                                description: t.description_en || translatedModels[j].description,
                                tags: [...new Set([...(translatedModels[j].tags || []), 'translated'])]
                            };
                        }
                    }
                    console.log(`[Translation] Batch ${Math.floor(i / batchSize) + 1} translated via Google Translate`);
                    if (onProgress) {
                        onProgress(`Translating... (${i + batch.length}/${toTranslate.length})`);
                    }
                    // Rate-limit pause between batches
                    if (i + batchSize < toTranslate.length) await new Promise(r => setTimeout(r, 1000));
                } else {
                    // At least one item failed — apply "keep original" fallback for this batch
                    fallbackBatchCount++;
                    if (!fallbackReason) fallbackReason = 'Google Translate failed for one or more items in batch';
                    applyFallbackTranslation(translatedModels);
                }
            } catch (error: any) {
                console.error(`[Translation] Error in batch ${Math.floor(i / batchSize) + 1}: `, error?.message || error);
                fallbackBatchCount++;
                if (!fallbackReason) {
                    fallbackReason = `API error: ${error?.message || 'Unknown error'} `;
                }
                // Continue with next batch even if one fails
                // Apply ASCII/context fallback for this batch as well
                applyFallbackTranslation(translatedModels);
            }

            // Small delay between batches to avoid rate limiting
            if (i + batchSize < toTranslate.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const translatedCount = translatedModels.filter(m => m.tags?.includes('translated')).length;
        const totalBatches = Math.ceil(toTranslate.length / batchSize);

        if (fallbackBatchCount > 0) {
            console.warn(`[Translation] Used ASCII / context fallback for ${fallbackBatchCount} / ${totalBatches} batches.Reason: ${fallbackReason} `);
        }
        console.log(`[Translation] Completed: ${translatedCount} models translated successfully`);

        return translatedModels;
    } catch (error: any) {
        console.error('[Translation] Unexpected error:', error?.message || error);
        return models;
    }
}

/**
 * Applies fallback translation strategy when LLM translation fails.
 * Extracts ASCII characters and uses contextual English labels based on model domain.
 *
 * @param models - Array of models to apply fallback translation to
 *
 * @remarks
 * This function modifies the models array in place, applying:
 * - ASCII-only extraction from names
 * - Domain-based contextual English labels when ASCII extraction fails
 * - Generic descriptions based on model domain and provider
 */
function applyFallbackTranslation(models: Model[]): void {
    const englishFromContext = (m: Model): string => {
        switch (m.domain) {
            case 'LLM': return 'Chinese Language Model';
            case 'ImageGen': return 'Chinese Image Generation Model';
            case 'VLM': return 'Chinese Multimodal Model';
            case 'Vision': return 'Chinese Vision Model';
            case 'Audio': return 'Chinese Audio Model';
            case 'ASR': return 'Chinese Speech Recognition Model';
            case 'TTS': return 'Chinese Text-to-Speech Model';
            case 'VideoGen': return 'Chinese Video Generation Model';
            default: return 'Chinese AI Model';
        }
    };

    for (let j = 0; j < models.length; j++) {
        const m = models[j];
        if (containsChinese(m.name) || containsOtherAsianLanguages(m.name)) {
            // Per user request: Keep original name if translation fails
            // prevent "random names" from aggressive ASCII stripping (e.g. "高清.safetensors" -> "safetensors")
            const newName = m.name;

            // Only add a generic description if the current one is also unreadable/missing
            const newDesc = m.description && (containsChinese(m.description) || containsOtherAsianLanguages(m.description))
                ? `${englishFromContext(m)} from ${m.provider || m.source || 'Chinese platform'} \n\n(Original Description: ${m.description})`
                : m.description;

            models[j] = {
                ...m,
                name: newName,
                description: newDesc,
                // Mark as translated so we don't retry endlessly, even though we kept original
                tags: [...new Set([...(m.tags || []), 'translated'])]
            };
        }
    }
}
