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
        // Pick the first enabled text provider. Prefer Ollama for local/speed.
        let providerEntry = Object.entries(apiConfig).find(([k, cfg]) =>
            (cfg as any)?.enabled && ((k === 'ollama' || (cfg as any)?.protocol === 'ollama'))
        );

        // If no Ollama, look for others with API keys
        if (!providerEntry) {
            providerEntry = Object.entries(apiConfig).find(([, cfg]) => (cfg as any)?.enabled && (cfg as any)?.apiKey);
        }

        const providerKey = (providerEntry?.[0] as ProviderKey) || null;
        const providerCfg = (providerEntry?.[1] as ProviderCfg) || null;
        if (!providerKey || !providerCfg) {
            console.log('[Translation] No LLM provider configured - using ASCII fallback for Chinese names');
        }

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

            const system = `You are a professional translator specializing in AI/ML technical content. 
Translate Chinese, Japanese, or Korean text to clear, professional English suitable for technical documentation.
- Preserve technical terms and model names when appropriate
- Keep translations concise but descriptive
- Maintain the professional tone for product catalogs
- If text is already in English or mixed language, improve clarity without changing meaning
Return ONLY a JSON array of objects with: id, name_en, description_en`;

            const user = `Translate the following AI model information to English. Focus on accuracy and professional terminology:\n${JSON.stringify(batch, null, 2)}`;

            try {
                let translated: any = null;
                if (providerKey && providerCfg) {
                    const text = await callProviderText(providerKey, providerCfg, system, user);
                    translated = safeJsonFromText(text);
                }

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

                    console.log(`[Translation] Successfully processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toTranslate.length / batchSize)}`);
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
                console.error(`[Translation] Error in batch ${Math.floor(i / batchSize) + 1}:`, error?.message || error);
                fallbackBatchCount++;
                if (!fallbackReason) {
                    fallbackReason = `API error: ${error?.message || 'Unknown error'}`;
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
            console.warn(`[Translation] Used ASCII/context fallback for ${fallbackBatchCount}/${totalBatches} batches. Reason: ${fallbackReason}`);
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
    const asciiOnly = (s: string): string => {
        const cleaned = (s || '')
            .replace(/[^\x20-\x7E]+/g, ' ') // drop non-ASCII
            .replace(/\s+/g, ' ') // collapse whitespace
            .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '') // trim non-alnum ends
            .trim();
        // If result still empty, keep original to avoid losing name entirely
        return cleaned;
    };

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
            const before = m.name;
            const ascii = asciiOnly(m.name);
            const newName = ascii && ascii.length >= 2 ? ascii : englishFromContext(m);
            const newDesc = m.description && (containsChinese(m.description) || containsOtherAsianLanguages(m.description))
                ? `${englishFromContext(m)} from ${m.provider || m.source || 'Chinese platform'}`
                : m.description;
            models[j] = { ...m, name: newName, description: newDesc, tags: [...new Set([...(m.tags || []), 'translated'])] };
            if (before !== models[j].name) {
                console.log(`[Translation:Fallback] "${before}" → "${models[j].name}"`);
            }
        }
    }
}
