import { Model } from "../../types";
import { SyncOptions, SyncCallbacks } from "./SyncTypes";
import { translateChineseModels } from "../api";

export async function runTranslation(
    models: Model[],
    options: SyncOptions,
    callbacks?: SyncCallbacks,
    completedSources: number = 0,
    totalSources: number = 0
): Promise<Model[]> {
    const { onLog, onProgress } = callbacks || {};
    let resultModels = [...models];

    try {
        if (onLog) {
            onLog('Translation: Checking for Chinese/CJK content...');
        }

        const beforeCount = resultModels.filter(m => m.tags?.includes('translated')).length;

        if (options.apiConfig) {
            if (onProgress) {
                onProgress({
                    current: completedSources,
                    total: totalSources,
                    source: 'Translating models...'
                });
            }

            resultModels = await translateChineseModels(resultModels, options.apiConfig, (msg) => {
                // Update callback with detailed progress
                if (onProgress) {
                    onProgress({
                        current: completedSources,
                        total: totalSources,
                        source: msg
                    });
                }
            });
        }

        const afterCount = resultModels.filter(m => m.tags?.includes('translated')).length;
        const translatedCount = afterCount - beforeCount;

        if (translatedCount > 0 && onLog) {
            onLog(`Translation: Translated ${translatedCount} models to English`);
        } else if (onLog) {
            onLog('Translation: No translation needed');
        }
    } catch (e: any) {
        if (onLog) {
            onLog(`[Translation] Error: ${e?.message || e}`);
        }
    }

    return resultModels;
}
