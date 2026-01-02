/**
 * Translation Module
 *
 * Handles translation of Chinese, Japanese, and Korean text to English
 * for AI model names and descriptions. Uses LLM providers for translation
 * with fallback strategies for when translation APIs are unavailable.
 */

import { Model, ApiDir, ProviderKey, ProviderCfg } from '../../../types';
import { containsChinese, containsOtherAsianLanguages } from './language-detection';
import { callProviderText } from '../providers/provider-calls';
import { safeJsonFromText } from '../../../utils/format';

/**
 * Translates Chinese, Japanese, and Korean text in model names and descriptions to English.
 *
 * @param models - Array of models to translate
 * @param apiConfig - API configuration directory containing provider settings
 * @returns Promise resolving to array of models with translated text
 *
 * @remarks
 * This function:
 * - Identifies models with Chinese/CJK text in name or description
 * - Uses the first enabled LLM provider with an API key for translation
 * - Processes models in batches of 25 for better API success rate
 * - Falls back to ASCII extraction and contextual English labels if translation fails
 * - Adds 'translated' tag to successfully translated models
 * - Preserves original models if no translation is needed or possible
 */

export async function translateChineseModels(
    models: Model[],
    apiConfig: ApiDir,
    onProgress?: (progress: string) => void
): Promise<Model[]> {
    try {
        // LLM Translation removed per user request. 
        // We now rely solely on Google Translate with "Keep Original Name" fallback.
        const providerKey = null;
        const providerCfg = null;

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

        console.log(`[Translation] Found ${toTranslate.length} models with Chinese/CJK text to translate`);

        // Process in smaller batches for better API success rate
        const batchSize = 25;
        const translatedModels = [...models];
        let fallbackBatchCount = 0;
        let fallbackReason: string | null = null;

        // Check upfront if we have a provider
        if (!providerKey || !providerCfg) {
            fallbackReason = 'No LLM provider configured';
        }

        for (let i = 0; i < toTranslate.length; i += batchSize) {
            const batch = toTranslate.slice(i, i + batchSize).map(m => ({
                id: m.id,
                name: m.name || '',
                description: m.description || '',
                provider: m.provider || ''
            }));

            // Prompts removed as LLM is disabled

            try {
                let googleTranslated = false;

                // 1. Try Google Translate first (Faster, Free)
                try {
                    // Process in parallel with limit to avoid rate limits
                    const googleResults = await Promise.all(batch.map(async (item) => {
                        try {
                            // Translate name
                            let nameEn = item.name;
                            if (containsChinese(item.name) || containsOtherAsianLanguages(item.name)) {
                                const res = await (window as any).electronAPI.translateText(item.name);
                                if (res.error) throw new Error(res.error);
                                nameEn = res.text;
                            }

                            // Translate description
                            let descEn = item.description;
                            if (item.description && (containsChinese(item.description) || containsOtherAsianLanguages(item.description))) {
                                // Truncate very long descriptions to avoid 5000 char limit
                                const textToTranslate = item.description.slice(0, 4500);
                                const res = await (window as any).electronAPI.translateText(textToTranslate);
                                if (res.error) throw new Error(res.error);
                                descEn = res.text;
                            }

                            return { ...item, name_en: nameEn, description_en: descEn };
                        } catch (e) {
                            return null; // Should fall back to LLM for this item or batch
                        }
                    }));

                    // Check if we got valid results
                    if (googleResults.every(r => r !== null)) {
                        // Apply Google Translations
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
                        googleTranslated = true;
                        console.log(`[Translation] Batch ${Math.floor(i / batchSize) + 1
                            } translated via Google Translate`);
                        // Keep delay for rate limiting
                        if (i + batchSize < toTranslate.length) await new Promise(r => setTimeout(r, 1000));
                        continue; // Skip LLM logic
                    }
                } catch (googleError) {
                    console.warn('[Translation] Google Translate failed, falling back to LLM:', googleError);
                    // Fall through to LLM
                }

                let translated: any = null;
                // 2. Fallback to LLM - REMOVED per user request
                // We now strictly use Google Translate -> Fallback (Original Name)

                if (Array.isArray(translated)) {
                    const byId = new Map<string, { name_en?: string; description_en?: string }>();
                    translated.forEach((r: any) => {
                        if (r && r.id) {
                            byId.set(String(r.id), {
                                name_en: r.name_en,
                                description_en: r.description_en
                            });
                        }
                    });

                    // Apply translations to the models
                    for (let j = 0; j < translatedModels.length; j++) {
                        const t = byId.get(translatedModels[j].id);
                        if (t) {
                            const originalName = translatedModels[j].name;
                            const originalDesc = translatedModels[j].description;

                            translatedModels[j] = {
                                ...translatedModels[j],
                                name: t.name_en && t.name_en.trim() ? t.name_en : translatedModels[j].name,
                                description: t.description_en && t.description_en.trim() ? t.description_en : translatedModels[j].description,
                                tags: [...new Set([...(translatedModels[j].tags || []), 'translated'])]
                            };

                            if (originalName !== translatedModels[j].name || originalDesc !== translatedModels[j].description) {
                                console.log(`[Translation] Translated: "${originalName}" → "${translatedModels[j].name}"`);
                            }
                        }
                    }

                    console.log(`[Translation] Successfully processed batch ${Math.floor(i / batchSize) + 1} /${Math.ceil(toTranslate.length / batchSize)
                        }`);
                    if (onProgress) {
                        onProgress(`Translating... (${i + batch.length}/${toTranslate.length})`);
                    }
                } else {
                    // Track fallback usage with reason
                    fallbackBatchCount++;
                    if (!fallbackReason) {
                        fallbackReason = 'LLM returned invalid JSON (not an array)';
                    }
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
