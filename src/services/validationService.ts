/**
 * Validation Service
 * 
 * Handles validation and enrichment of AI model data using LLM providers.
 * This service orchestrates batch or single-request validation to fill in
 * missing model metadata using AI-powered fact-checking and web search.
 * 
 * @module validationService
 */

import { Model, ApiDir } from "../types";
import { isModelIncomplete } from "../hooks/useModels";
import { createDatabaseValidationPrompt, parseCSVToModels } from "./validation";
import { callProviderText } from "./api";

/**
 * Configuration options for validation operations
 */
export interface ValidationOptions {
    batchSize?: number;
    pauseMs?: number;
    maxBatches?: number;
    apiConfig: ApiDir;
    preferredModelProvider?: string | null;
}

/**
 * Progress information for validation operations
 */
export interface ValidationProgress {
    /** Current number of models validated */
    current: number;
    /** Total number of models to validate */
    total: number;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
    /** Whether validation completed successfully */
    success: boolean;
    /** Updated models with enriched metadata (if successful) */
    updatedModels?: Model[];
    /** Error message (if failed) */
    error?: string;
}

/**
 * Callback functions for validation operation events
 */
export interface ValidationCallbacks {
    /** Called when validation progress updates */
    onProgress?: (progress: ValidationProgress) => void;
    /** Called when a log message is generated */
    onLog?: (message: string) => void;
    /** Called to check if validation should be cancelled (returns true if cancelled) */
    onCancel?: () => boolean;
}

/**
 * Check if a provider has a valid API key.
 * 
 * @param key - Provider key name
 * @param cfg - Provider configuration
 * @returns Promise resolving to true if valid key exists
 */
async function hasValidKey(key: string, cfg: any): Promise<boolean> {
    // Check if protocol allows no key (e.g. Ollama)
    if (cfg.protocol === 'ollama' || key === 'ollama') {
        return true;
    }

    // Check if has local key
    if (cfg.apiKey && cfg.apiKey.trim() !== '') {
        return true;
    }

    return false;
}

/**
 * Find an enabled API provider for validation.
 * 
 * Searches for an available LLM provider with a valid API key,
 * preferring the user's preferred provider if specified.
 * 
 * @param apiConfig - API configuration directory
 * @param preferredProvider - Optional preferred provider key
 * @param onLog - Optional logging callback
 * @returns Promise resolving to [providerKey, providerConfig] or null if none found
 */
async function findEnabledProvider(
    apiConfig: ApiDir,
    preferredProvider?: string | null,
    onLog?: (message: string) => void
): Promise<[string, any] | null> {
    // First, try to use the preferred provider if set
    if (preferredProvider) {
        const cfg = apiConfig[preferredProvider as keyof typeof apiConfig];
        if (cfg?.enabled && await hasValidKey(preferredProvider, cfg)) {
            if (onLog) {
                onLog(`[Validation] Using preferred provider: ${preferredProvider}`);
            }
            return [preferredProvider, cfg];
        }
    }

    // If no preferred provider or it's not available, find first enabled provider
    for (const [key, cfg] of Object.entries(apiConfig)) {
        if (cfg.enabled && await hasValidKey(key, cfg)) {
            if (onLog) {
                onLog(`[Validation] Using provider: ${key}`);
            }
            return [key, cfg];
        }
    }

    return null;
}

/**
 * Validate all incomplete models in the database.
 * 
 * This function identifies models with missing metadata and uses an LLM provider
 * to fill in the gaps through AI-powered fact-checking and web search.
 * 
 * Features:
 * - Automatic batch processing for large databases
 * - Single-request mode for smaller databases
 * - Progress tracking and cancellation support
 * - Data loss prevention (never drops models)
 * - Web search integration for accurate data
 * 
 * @param models - Array of models to validate
 * @param options - Validation configuration options
 * @param callbacks - Optional callback functions for progress, logging, and cancellation
 * @returns Promise resolving to validation result
 */
export async function validateAllModels(
    models: Model[],
    options: ValidationOptions,
    callbacks?: ValidationCallbacks
): Promise<ValidationResult> {
    const { onProgress, onLog, onCancel } = callbacks || {};

    if (onLog) {
        onLog('[Validation] Starting enhanced validation with progress tracking...');
    }

    try {
        // Get incomplete models to validate
        const modelsToValidate = models.filter(isModelIncomplete);

        if (modelsToValidate.length === 0) {
            if (onLog) {
                onLog('[Validation] No incomplete models found to validate');
            }
            return { success: true };
        }

        if (onLog) {
            onLog(`[Validation] Found ${modelsToValidate.length} models needing validation`);
            onLog(`[Validation] Using API configuration from settings...`);
        }

        // Find an enabled API provider
        const enabledProvider = await findEnabledProvider(
            options.apiConfig,
            options.preferredModelProvider,
            onLog
        );

        if (!enabledProvider) {
            if (onLog) {
                onLog('[Validation] ERROR: No enabled API provider found');
            }
            return {
                success: false,
                error: 'No enabled API provider found. Please configure an API provider in Settings.'
            };
        }

        const [providerKey, providerConfig] = enabledProvider;

        // Determine validation strategy based on database size
        const batchSize = Math.max(1, options.batchSize ?? 50);
        const pauseMs = Math.max(0, options.pauseMs ?? 1000);
        const maxBatches = options.maxBatches && options.maxBatches > 0 ? options.maxBatches : Infinity;

        // Import CSV conversion helper
        const { convertModelsToCSV } = await import('./validation');
        const fullCsv = convertModelsToCSV(models);
        const estimatedTokensFull = Math.ceil(fullCsv.length / 4);
        const tokenSoftLimit = 180000; // ~180k tokens to leave room for system prompt & response
        const modelCountSoftLimit = 250; // prefer batches for large model counts as well
        const shouldBatch = estimatedTokensFull > tokenSoftLimit || models.length > modelCountSoftLimit;

        if (shouldBatch) {
            return await validateInBatches(
                models,
                { batchSize, pauseMs, maxBatches, providerKey, providerConfig },
                { onProgress, onLog, onCancel }
            );
        } else {
            return await validateSingleRequest(
                models,
                { providerKey, providerConfig, estimatedTokensFull },
                { onProgress, onLog, onCancel }
            );
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
        if (onLog) {
            onLog(`[Validation] Error: ${errorMsg}`);
        }
        return { success: false, error: errorMsg };
    }
}

/**
 * Validate models in batches for large databases.
 * 
 * Processes models in smaller batches to avoid token limits and rate limits.
 * Includes data loss prevention by merging validated results with originals.
 * 
 * @param models - Array of models to validate
 * @param options - Batch validation options
 * @param callbacks - Optional callback functions
 * @returns Promise resolving to validation result
 */
async function validateInBatches(
    models: Model[],
    options: {
        batchSize: number;
        pauseMs: number;
        maxBatches: number;
        providerKey: string;
        providerConfig: any;
    },
    callbacks?: ValidationCallbacks
): Promise<ValidationResult> {
    const { onProgress, onLog, onCancel } = callbacks || {};
    const { batchSize, pauseMs, maxBatches, providerKey, providerConfig } = options;

    if (onLog) {
        onLog(`[Validation] Batch mode: ${models.length} models, batch size ${batchSize}`);
    }

    let allValidatedModels: Model[] = [];
    let batchIndex = 0;
    let processed = 0;

    if (onProgress) {
        onProgress({ current: 0, total: models.length });
    }

    for (let i = 0; i < models.length; i += batchSize) {
        batchIndex++;

        // Check for cancellation
        if (onCancel && onCancel()) {
            if (onLog) {
                onLog('[Validation] Validation cancelled by user');
            }
            break;
        }

        if (batchIndex > maxBatches) {
            if (onLog) {
                onLog(`[Validation] Max batches (${maxBatches}) reached. Stopping early.`);
            }
            allValidatedModels = allValidatedModels.concat(models.slice(i));
            break;
        }

        const batch = models.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(models.length / batchSize);

        if (onLog) {
            onLog(`[Validation] Processing batch ${batchNum}/${totalBatches} (${batch.length} models)...`);
        }

        try {
            // Create validation prompt for this batch
            const validationPrompt = createDatabaseValidationPrompt(batch);

            // Enhanced system prompt with web search instructions
            const systemPrompt = `You are an expert AI model database curator and fact-checker with access to web search.

CRITICAL INSTRUCTIONS:
- Use web search to find accurate, verifiable information for missing fields
- Search official sources: company blogs, research papers, GitHub repos, model cards
- Cross-reference multiple sources before adding data
- For release dates, search: "[model name] release date", "[model name] announcement"
- For parameters, search: "[model name] parameters", "[model name] size"
- For licenses, search: "[model name] license", check official documentation
- NEVER remove or drop models from the database
- ONLY fill in empty fields, preserve existing data
- Return ALL models in the CSV output`;

            // Call LLM to validate and correct this batch
            let csvData = await callProviderText(
                providerKey as any,
                providerConfig,
                systemPrompt,
                validationPrompt
            );

            if (!csvData) {
                if (onLog) {
                    onLog(`[Validation] No response for batch ${batchNum}, keeping original models...`);
                }
                allValidatedModels = allValidatedModels.concat(batch);
                continue;
            }

            // Process the CSV response for this batch
            const csvStartMarkers = ['id,name,provider', 'id,"name","provider'];
            let csvStart = -1;

            for (const marker of csvStartMarkers) {
                csvStart = csvData.indexOf(marker);
                if (csvStart !== -1) break;
            }

            if (csvStart !== -1) {
                csvData = csvData.substring(csvStart);
            }

            // Parse and add to results
            const batchValidatedModels = parseCSVToModels(csvData);

            // CRITICAL: Verify we didn't lose models
            if (batchValidatedModels.length === 0) {
                if (onLog) {
                    onLog(`[Validation] Batch ${batchNum} returned 0 models - keeping original ${batch.length} models`);
                }
                allValidatedModels = allValidatedModels.concat(batch);
            } else if (batchValidatedModels.length < batch.length) {
                if (onLog) {
                    onLog(`[Validation] Batch ${batchNum} lost models! Expected ${batch.length}, got ${batchValidatedModels.length}`);
                    onLog(`[Validation] Merging validated models with originals to prevent data loss...`);
                }

                // Create a map of validated models by ID
                const validatedMap = new Map(batchValidatedModels.map(m => [m.id, m]));

                // For each original model, use validated version if available, otherwise keep original
                const mergedBatch = batch.map(original => {
                    const validated = validatedMap.get(original.id);
                    if (validated) {
                        // Merge: use validated data but preserve original if validated field is empty
                        return {
                            ...original,
                            ...validated,
                            // Preserve original non-empty fields if validated version is empty
                            name: validated.name || original.name,
                            provider: validated.provider || original.provider,
                            description: validated.description || original.description,
                            parameters: validated.parameters || original.parameters,
                            context_window: validated.context_window || original.context_window,
                            release_date: validated.release_date || original.release_date,
                            updated_at: validated.updated_at || original.updated_at,
                            tags: (validated.tags && validated.tags.length > 0) ? validated.tags : original.tags,
                        };
                    }
                    return original; // Model was dropped by LLM, keep original
                });

                allValidatedModels = allValidatedModels.concat(mergedBatch);
                if (onLog) {
                    onLog(`[Validation] Batch ${batchNum} merged: ${mergedBatch.length} models preserved`);
                }
            } else {
                // Success: got same or more models back
                allValidatedModels = allValidatedModels.concat(batchValidatedModels);
                if (onLog) {
                    onLog(`[Validation] Batch ${batchNum} processed: ${batchValidatedModels.length} models validated`);
                }
            }

        } catch (batchError: any) {
            console.error(`[Validation] Error processing batch ${batchNum}:`, batchError);
            if (onLog) {
                onLog(`[Validation] Error processing batch ${batchNum}: ${batchError.message || batchError}`);
            }
            if (batchError?.name === 'AbortError') {
                if (onLog) {
                    onLog('[Validation] Batch processing aborted by user');
                }
                break;
            }
            // Keep original models for failed batches
            allValidatedModels = allValidatedModels.concat(batch);
        }

        // Update global progress by models processed so far
        processed = Math.min(models.length, i + batch.length);
        if (onProgress) {
            onProgress({ current: processed, total: models.length });
        }

        // Check cancellation more frequently
        if (onCancel && onCancel()) {
            if (onLog) {
                onLog('[Validation] Validation cancelled during batch processing');
            }
            break;
        }

        // Optional pause between batches to respect rate limits/quotas
        if (pauseMs > 0 && (i + batchSize) < models.length) {
            if (onLog) {
                onLog(`[Validation] Waiting ${Math.round(pauseMs / 1000)}s before next batch...`);
            }
            const until = Date.now() + pauseMs;
            const checkInterval = 100; // Check every 100ms for faster cancellation
            while (Date.now() < until) {
                if (onCancel && onCancel()) {
                    if (onLog) {
                        onLog('[Validation] Validation cancelled during pause');
                    }
                    break;
                }
                await new Promise(r => setTimeout(r, checkInterval));
            }
            if (onCancel && onCancel()) {
                if (onLog) {
                    onLog('[Validation] Validation cancelled by user');
                }
                break;
            }
        }
    }

    if (onLog) {
        onLog(`[Validation] Batch processing complete: ${allValidatedModels.length} total models`);
    }

    return {
        success: true,
        updatedModels: allValidatedModels
    };
}

/**
 * Validate all models in a single request for smaller databases.
 * 
 * Sends the entire database to the LLM in one request for faster processing
 * when the database is small enough to fit within token limits.
 * 
 * @param models - Array of models to validate
 * @param options - Single-request validation options
 * @param callbacks - Optional callback functions
 * @returns Promise resolving to validation result
 */
async function validateSingleRequest(
    models: Model[],
    options: {
        providerKey: string;
        providerConfig: any;
        estimatedTokensFull: number;
    },
    callbacks?: ValidationCallbacks
): Promise<ValidationResult> {
    const { onProgress, onLog, onCancel } = callbacks || {};
    const { providerKey, providerConfig, estimatedTokensFull } = options;

    if (onLog) {
        onLog(`[Validation] Single-request mode: ${models.length} models, est ~${estimatedTokensFull} tokens`);
        onLog('[Validation] Sending full database CSV to GPT for validation...');
        onLog(`[Validation] Database size: ${models.length} models`);
        onLog(`[Validation] Using provider: ${providerKey}`);
    }

    if (onProgress) {
        onProgress({ current: 0, total: models.length });
    }

    // Check for cancellation
    if (onCancel && onCancel()) {
        if (onLog) {
            onLog('[Validation] Validation cancelled by user');
        }
        return { success: false, error: 'Validation cancelled by user' };
    }

    const validationPrompt = createDatabaseValidationPrompt(models);

    // Call the LLM provider to validate the database
    let csvData = await callProviderText(
        providerKey as any,
        providerConfig,
        'You are an expert AI model database curator and fact-checker.',
        validationPrompt
    );

    // The response should be a CSV string
    if (!csvData) {
        return { success: false, error: 'No response from AI provider' };
    }

    if (onLog) {
        onLog(`[Validation] Received CSV response, length: ${csvData.length}`);
    }

    // Look for CSV content in the response
    const csvStartMarkers = ['id,name,provider', 'id,"name","provider'];
    let csvStart = -1;

    for (const marker of csvStartMarkers) {
        csvStart = csvData.indexOf(marker);
        if (csvStart !== -1) break;
    }

    if (csvStart === -1) {
        if (onLog) {
            onLog('[Validation] Could not find CSV header in response');
        }
        return { success: false, error: 'Invalid CSV response format' };
    }

    csvData = csvData.substring(csvStart);

    // Parse the CSV response
    const validatedModels = parseCSVToModels(csvData);

    if (validatedModels.length === 0) {
        if (onLog) {
            onLog('[Validation] No models parsed from CSV response');
        }
        return { success: false, error: 'Failed to parse validated models' };
    }

    if (onLog) {
        onLog(`[Validation] Successfully validated ${validatedModels.length} models`);
    }

    if (onProgress) {
        onProgress({ current: models.length, total: models.length });
    }

    return {
        success: true,
        updatedModels: validatedModels
    };
}
