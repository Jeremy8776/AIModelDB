import { useState, useRef, useEffect } from 'react';
import { Model, ApiDir, ProviderCfg, ProviderKey } from '../types';
import { ValidationJob, ValidationQueue, ValidationSource } from '../services/validation';
import { callProviderLLM } from '../services/api';

// ValidationUpdateEvent tracks specific changes for detailed reporting
export interface ValidationUpdateEvent {
    modelId: string;
    modelName: string;
    field: string;
    oldValue: any;
    newValue: any;
}

// ValidationSummary tracks what fields were updated during validation
export interface ValidationSummary {
    totalModels: number;
    modelsUpdated: number;
    fieldsUpdated: {
        description: number;
        parameters: number;
        context_window: number;
        license: number;
        release_date: number;
        tags: number;
        pricing: number;
        other: number;
    };
    updates: ValidationUpdateEvent[];
    errors: number;
    webSearchUsed: boolean;
}

// Helper to create an empty validation summary
function createEmptySummary(): ValidationSummary {
    return {
        totalModels: 0,
        modelsUpdated: 0,
        fieldsUpdated: {
            description: 0,
            parameters: 0,
            context_window: 0,
            license: 0,
            release_date: 0,
            tags: 0,
            pricing: 0,
            other: 0
        },
        updates: [],
        errors: 0,
        webSearchUsed: false
    };
}

// Helper to compare and track what fields were updated
function trackFieldUpdates(original: Model, updated: Model, summary: ValidationSummary): void {
    const pushUpdate = (field: string, oldV: any, newV: any) => {
        summary.updates.push({
            modelId: original.id,
            modelName: original.name || 'Unknown',
            field,
            oldValue: oldV,
            newValue: newV
        });
    };

    if (updated.description && updated.description !== original.description) {
        summary.fieldsUpdated.description++;
        pushUpdate('description', original.description, updated.description);
    }
    if (updated.parameters && updated.parameters !== original.parameters) {
        summary.fieldsUpdated.parameters++;
        pushUpdate('parameters', original.parameters, updated.parameters);
    }
    if (updated.context_window && updated.context_window !== original.context_window) {
        summary.fieldsUpdated.context_window++;
        pushUpdate('context_window', original.context_window, updated.context_window);
    }
    if (updated.license?.name && updated.license.name !== original.license?.name) {
        summary.fieldsUpdated.license++;
        pushUpdate('license', original.license?.name, updated.license?.name);
    }
    if (updated.release_date && updated.release_date !== original.release_date) {
        summary.fieldsUpdated.release_date++;
        pushUpdate('release_date', original.release_date, updated.release_date);
    }
    if (updated.tags && JSON.stringify(updated.tags) !== JSON.stringify(original.tags)) {
        summary.fieldsUpdated.tags++;
        pushUpdate('tags', original.tags, updated.tags);
    }
    if (updated.pricing && JSON.stringify(updated.pricing) !== JSON.stringify(original.pricing)) {
        summary.fieldsUpdated.pricing++;
        pushUpdate('pricing', original.pricing, updated.pricing);
    }
}

// Helper to create a generic validation/enrichment prompt with web search instructions
function createEnrichmentPrompt(model: Model): string {
    return `
I have an AI model with incomplete metadata. USE WEB SEARCH to find accurate, up-to-date information for this model:
${JSON.stringify(model, null, 2)}

IMPORTANT: Search the web for current information about this model. Do NOT rely on training data alone.
Search official sources: GitHub, Hugging Face, company blogs, research papers, model cards.

Return ONLY the updated model JSON with all fields filled. Don't include any explanation.
Focus especially on these fields if they're missing:
- parameters (size of the model, e.g. "7B" or "1.5B")
- context_window (for LLMs, e.g. "8K" or "32K")
- license details (search for the actual license)
- release_date (in ISO format - search for official release date)
- pricing (input/output per million tokens in USD)
- tags
- hosting information
`;
}

export function useModelValidation(
    models: Model[],
    setModels: React.Dispatch<React.SetStateAction<Model[]>>,
    apiConfig: ApiDir,
    setLastSync: React.Dispatch<React.SetStateAction<string | null>>
) {
    // Validation state
    const [isValidating, setIsValidating] = useState(false);
    const [validationJobs, setValidationJobs] = useState<ValidationJob[]>([]);
    const [validationProgress, setValidationProgress] = useState<{ current: number, total: number } | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);

    // Validation queue ref to persist between renders
    const validationQueueRef = useRef<ValidationQueue | null>(null);
    // Cancellation flag for database-wide validation (CSV batch mode)
    const cancelDbValidationRef = useRef<boolean>(false);
    // Abort controller for in-flight provider requests
    const validationAbortRef = useRef<AbortController | null>(null);

    // Initialize or get validation queue
    const getValidationQueue = () => {
        if (!validationQueueRef.current) {
            validationQueueRef.current = new ValidationQueue(
                // Validation function
                async (model: Model, sources: ValidationSource[]) => {
                    console.log(`Validating model: ${model.name || model.id} with sources: ${sources.join(', ')}`);

                    // Find an enabled LLM provider
                    const enabledProviders = Object.entries(apiConfig)
                        .filter(([key, cfg]) => (cfg as ProviderCfg).enabled && ((cfg as ProviderCfg).apiKey || (cfg as ProviderCfg).protocol === 'ollama' || key === 'ollama'))
                        .map(([key]) => key as ProviderKey);

                    if (!enabledProviders.length) {
                        throw new Error('No enabled LLM providers available for validation');
                    }

                    // Use the first available provider
                    let providerKey = enabledProviders[0];
                    let providerConfig = apiConfig[providerKey] as ProviderCfg;

                    // Try each provider until we find one that works
                    let enrichedModelsResult = null;
                    let lastError = null;

                    for (const key of enabledProviders) {
                        providerKey = key;
                        providerConfig = apiConfig[providerKey] as ProviderCfg;

                        try {
                            const systemPrompt = "You are an AI expert that provides accurate metadata about AI models.";
                            const userPrompt = createEnrichmentPrompt(model);

                            enrichedModelsResult = await callProviderLLM(
                                providerKey,
                                providerConfig,
                                systemPrompt,
                                userPrompt
                            );

                            if (enrichedModelsResult && enrichedModelsResult.length > 0) {
                                break; // Success! Break the loop
                            }
                        } catch (error) {
                            lastError = error;
                            console.error(`Provider ${providerKey} failed:`, error);
                            // Continue to try the next provider
                        }
                    }

                    // If we tried all providers and none worked, throw the last error
                    if (!enrichedModelsResult || !enrichedModelsResult.length) {
                        throw new Error(lastError instanceof Error ? lastError.message : 'Failed to get valid enriched model data from any provider');
                    }

                    // Find the first valid model
                    const enrichedModel = enrichedModelsResult[0];

                    // Merge the enriched data with the original model
                    return {
                        ...model,
                        ...enrichedModel,
                        // Ensure these fields are properly merged
                        license: { ...model.license, ...enrichedModel.license },
                        hosting: { ...model.hosting, ...enrichedModel.hosting },
                        // Add tags without duplicates
                        tags: Array.from(new Set([
                            ...(model.tags || []),
                            ...(enrichedModel.tags || [])
                        ]))
                    };
                },
                {
                    // Options
                    concurrency: 2,
                    onProgress: (current, total) => {
                        setValidationProgress({ current, total });
                    },
                    onComplete: (job) => {
                        if (job.result) {
                            // Update the model in the models list
                            setModels(prevModels =>
                                prevModels.map(m => m.id === job.result!.id ? job.result! : m)
                            );

                            // Update job in our local state
                            setValidationJobs(prev =>
                                prev.map(j => j.id === job.id ? job : j)
                            );

                            // Update last sync time
                            const syncTime = new Date().toISOString();
                            setLastSync(syncTime);
                            localStorage.setItem('aiModelDBPro_lastSync', syncTime);
                        }
                    },
                    onError: (job) => {
                        console.error(`Validation failed for ${job.model.name || job.model.id}:`, job.error);
                        // Update job in our local state
                        setValidationJobs(prev =>
                            prev.map(j => j.id === job.id ? job : j)
                        );
                    }
                }
            );
        }

        return validationQueueRef.current;
    };

    // Update validation jobs when the queue changes
    useEffect(() => {
        const queue = getValidationQueue();
        const intervalId = setInterval(() => {
            setValidationJobs([...queue.getJobs()]);

            // Auto-stop validation tracking when all jobs are done
            const pendingCount = queue.getPendingCount();
            const processingCount = queue.getProcessingCount();

            if (pendingCount === 0 && processingCount === 0 && isValidating && validationJobs.length > 0) {
                setIsValidating(false);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isValidating, validationJobs.length, apiConfig]); // Added apiConfig dependency as getValidationQueue depends on it

    // Function to check if API providers are configured
    const hasConfiguredProviders = (): boolean => {
        return Object.entries(apiConfig)
            .some(([key, cfg]) => (cfg as ProviderCfg).enabled && ((cfg as ProviderCfg).apiKey || (cfg as ProviderCfg).protocol === 'ollama' || key === 'ollama'));
    };

    // Function to get list of enabled providers
    const getEnabledProviders = (): ProviderKey[] => {
        return Object.entries(apiConfig)
            .filter(([key, cfg]) => (cfg as ProviderCfg).enabled && ((cfg as ProviderCfg).apiKey || (cfg as ProviderCfg).protocol === 'ollama' || key === 'ollama'))
            .map(([key]) => key as ProviderKey);
    };

    // Function to start validation of selected models
    const startValidation = (modelsToValidate: Model[], sources: ValidationSource[]) => {
        const enabledProviders = getEnabledProviders();

        if (enabledProviders.length === 0) {
            alert('No enabled LLM providers available for validation. Please set up API keys in the sync settings.');
            return;
        }

        if (modelsToValidate.length === 0) {
            alert('No models selected for validation.');
            return;
        }

        if (sources.length === 0) {
            alert('No validation sources selected.');
            return;
        }

        const queue = getValidationQueue();
        queue.addJobs(modelsToValidate, sources);

        setIsValidating(true);
        setValidationJobs([...queue.getJobs()]);
    };

    const pauseValidation = () => {
        const queue = getValidationQueue();
        queue.pause();
    };

    const resumeValidation = () => {
        const queue = getValidationQueue();
        queue.resume();
    };

    const clearFinishedValidationJobs = () => {
        const queue = getValidationQueue();
        queue.clearFinishedJobs();
        setValidationJobs([...queue.getJobs()]);
        const total = queue.getTotalCount();
        const completed = queue.getCompletedCount();
        if (completed >= total) {
            setValidationProgress(null);
        }
    };

    const stopValidation = () => {
        console.log('[CANCEL] Stopping validation immediately...');
        cancelDbValidationRef.current = true;
        try {
            validationAbortRef.current?.abort();
            console.log('[CANCEL] Aborted in-flight API request');
        } catch { }
        validationAbortRef.current = null;

        const queue = getValidationQueue();
        queue.clearAllJobs();
        console.log('[CANCEL] Cleared validation queue');

        setIsValidating(false);
        setValidationJobs([]);
        setValidationProgress(null);
        console.log('[CANCEL] Validation stopped');
    };

    // Modal handlers
    const openValidationModal = (selectedModels: string[] = []) => {
        setShowValidationModal(true);
    };

    const closeValidationModal = () => {
        setShowValidationModal(false);
    };

    // Database-wide validation with GPT
    const validateEntireDatabase = async (
        opts?: { batchSize?: number; pauseMs?: number; maxBatches?: number; apiConfig?: ApiDir; preferredModelProvider?: string | null; modelsOverride?: Model[] }
    ): Promise<{ success: boolean; updatedModels?: Model[]; error?: string; summary?: ValidationSummary }> => {
        const summary = createEmptySummary();
        const modelsToValidate = opts?.modelsOverride || models;
        summary.totalModels = modelsToValidate.length;

        try {
            console.log(`Starting database validation (subset: ${!!opts?.modelsOverride}) with web search...`);
            setIsValidating(true);
            cancelDbValidationRef.current = false;
            validationAbortRef.current = new AbortController();

            const configToUse = opts?.apiConfig || apiConfig;
            if (!configToUse) {
                throw new Error('No API configuration available');
            }

            const hasValidKey = async (key: string, cfg: any): Promise<boolean> => {
                if (cfg.protocol === 'ollama' || key === 'ollama') return true;
                if (cfg.apiKey && cfg.apiKey.trim() !== '') return true;
                return false;
            };

            let enabledProvider: [string, any] | undefined;

            // Priority order: prefer Perplexity (has built-in web search), then preferred, then others
            const providerPriority = ['perplexity', opts?.preferredModelProvider, 'anthropic', 'openai', 'google', 'deepseek', 'cohere', 'openrouter'];

            for (const key of providerPriority) {
                if (!key) continue;
                const cfg = configToUse[key as keyof typeof configToUse];
                if (cfg?.enabled && await hasValidKey(key, cfg)) {
                    enabledProvider = [key, cfg];
                    if (key === 'perplexity') {
                        summary.webSearchUsed = true;
                        console.log('Using Perplexity for web search capability');
                    }
                    break;
                }
            }

            if (!enabledProvider) {
                throw new Error('No enabled API provider found. Please configure an API provider in Sync settings.');
            }

            const [providerKey, providerConfig] = enabledProvider;

            // Import validation functions
            const { createDatabaseValidationPrompt, parseCSVToModels } = await import('../services/validation');
            const { callProviderText } = await import('../services/api');

            const batchSize = Math.max(1, opts?.batchSize ?? 50);
            const pauseMs = Math.max(0, opts?.pauseMs ?? 0);
            const maxBatches = opts?.maxBatches && opts.maxBatches > 0 ? opts.maxBatches : Infinity;
            let allValidatedModels: Model[] = [];

            const { convertModelsToCSV } = await import('../services/validation');
            const fullCsv = convertModelsToCSV(modelsToValidate);
            const estimatedTokensFull = Math.ceil(fullCsv.length / 4);
            const tokenSoftLimit = 180000;
            const modelCountSoftLimit = 250;
            const shouldBatch = estimatedTokensFull > tokenSoftLimit || modelsToValidate.length > modelCountSoftLimit;

            if (shouldBatch) {
                console.warn(`Hybrid: switching to batch mode • ${modelsToValidate.length} models • est ~${estimatedTokensFull} tokens. Batch size ${batchSize}.`);

                let batchIndex = 0;
                let processed = 0;
                setValidationProgress({ current: 0, total: modelsToValidate.length });
                for (let i = 0; i < modelsToValidate.length; i += batchSize) {
                    batchIndex++;
                    if (cancelDbValidationRef.current) {
                        console.warn('Validation cancelled by user');
                        break;
                    }
                    if (batchIndex > maxBatches) {
                        console.warn(`Max batches (${maxBatches}) reached. Stopping early.`);
                        allValidatedModels = allValidatedModels.concat(modelsToValidate.slice(i));
                        break;
                    }
                    const batch = modelsToValidate.slice(i, i + batchSize);
                    const batchNum = Math.floor(i / batchSize) + 1;
                    const totalBatches = Math.ceil(modelsToValidate.length / batchSize);

                    console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} models)...`);

                    try {
                        const validationPrompt = createDatabaseValidationPrompt(batch);
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

                        let csvData = await callProviderText(
                            providerKey as any,
                            providerConfig,
                            systemPrompt,
                            validationPrompt,
                            { signal: validationAbortRef.current?.signal }
                        );

                        if (!csvData) {
                            console.warn(`No response for batch ${batchNum}, keeping original models...`);
                            allValidatedModels = allValidatedModels.concat(batch);
                            continue;
                        }

                        const csvStartMarkers = ['id,name,provider', 'id,"name","provider'];
                        let csvStart = -1;

                        for (const marker of csvStartMarkers) {
                            csvStart = csvData.indexOf(marker);
                            if (csvStart !== -1) break;
                        }

                        if (csvStart !== -1) {
                            csvData = csvData.substring(csvStart);
                        }

                        const batchValidatedModels = parseCSVToModels(csvData);

                        if (batchValidatedModels.length === 0) {
                            console.warn(`Batch ${batchNum} returned 0 models - keeping original ${batch.length} models`);
                            allValidatedModels = allValidatedModels.concat(batch);
                        } else if (batchValidatedModels.length < batch.length) {
                            console.warn(`Batch ${batchNum} lost models! Expected ${batch.length}, got ${batchValidatedModels.length}`);
                            console.warn(`Merging validated models with originals to prevent data loss...`);

                            const validatedMap = new Map(batchValidatedModels.map(m => [m.id, m]));

                            const mergedBatch = batch.map(original => {
                                const validated = validatedMap.get(original.id);
                                if (validated) {
                                    // Track changes
                                    trackFieldUpdates(original, validated, summary);

                                    return {
                                        ...original,
                                        ...validated,
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
                                return original;
                            });

                            allValidatedModels = allValidatedModels.concat(mergedBatch);
                            console.log(`Batch ${batchNum} merged: ${mergedBatch.length} models preserved`);
                        } else {
                            allValidatedModels = allValidatedModels.concat(batchValidatedModels);
                            console.log(`Batch ${batchNum} processed: ${batchValidatedModels.length} models validated`);
                        }

                    } catch (batchError: any) {
                        console.error(`Error processing batch ${batchNum}:`, batchError);
                        if (batchError?.name === 'AbortError') {
                            console.warn('Batch processing aborted by user');
                            break;
                        }
                        allValidatedModels = allValidatedModels.concat(batch);
                    }

                    processed = Math.min(modelsToValidate.length, i + batch.length);
                    setValidationProgress({ current: processed, total: modelsToValidate.length });

                    if (cancelDbValidationRef.current) {
                        console.warn('[CANCEL] Validation cancelled during batch processing');
                        break;
                    }

                    if (pauseMs > 0 && (i + batchSize) < modelsToValidate.length) {
                        console.log(`Waiting ${Math.round(pauseMs / 1000)}s before next batch...`);
                        const until = Date.now() + pauseMs;
                        const checkInterval = 100;
                        while (Date.now() < until) {
                            if (cancelDbValidationRef.current) {
                                console.warn('[CANCEL] Validation cancelled during pause');
                                break;
                            }
                            await new Promise(r => setTimeout(r, checkInterval));
                        }
                        if (cancelDbValidationRef.current) {
                            console.warn('[CANCEL] Validation cancelled by user');
                            break;
                        }
                    }
                }

                console.log(`Batch processing complete: ${allValidatedModels.length} total models`);
                summary.modelsUpdated = allValidatedModels.length;
                setValidationProgress(null);
                setIsValidating(false);
                return {
                    success: true,
                    updatedModels: allValidatedModels,
                    summary
                };

            } else {
                console.log(`Hybrid: single-request mode • ${modelsToValidate.length} models • est ~${estimatedTokensFull} tokens.`);
                console.log('Sending full database CSV to GPT for validation (single request)...');
                console.log(`Database size: ${modelsToValidate.length} models`);
                console.log(`Using provider: ${providerKey}`);
                setValidationProgress({ current: 0, total: modelsToValidate.length });

                const validationPrompt = createDatabaseValidationPrompt(modelsToValidate);

                let csvData = await callProviderText(
                    providerKey as any,
                    providerConfig,
                    'You are an expert AI model database curator and fact-checker.',
                    validationPrompt,
                    { signal: validationAbortRef.current?.signal }
                );

                if (!csvData) {
                    throw new Error('No response from AI provider');
                }

                console.log('Received CSV response, length:', csvData.length);

                const csvStartMarkers = ['id,name,provider', 'id,"name","provider'];
                let csvStart = -1;

                for (const marker of csvStartMarkers) {
                    csvStart = csvData.indexOf(marker);
                    if (csvStart !== -1) break;
                }

                if (csvStart === -1) {
                    console.error('Raw AI response:', csvData);
                    throw new Error('Could not find CSV data in AI response. The AI may not have followed the format.');
                }

                csvData = csvData.substring(csvStart);

                const lines = csvData.split('\n');
                const validLines = [];
                for (const line of lines) {
                    if (line.trim() && (line.includes(',') || validLines.length === 0)) {
                        validLines.push(line);
                    } else if (validLines.length > 0) {
                        break;
                    }
                }
                csvData = validLines.join('\n');

                console.log('Parsing validated data...');

                const validatedModels = parseCSVToModels(csvData);

                if (validatedModels.length === 0) {
                    throw new Error('No valid models found in AI response. The validation may have failed.');
                }

                // Track changes for summary
                validatedModels.forEach(updated => {
                    const original = modelsToValidate.find(m => m.id === updated.id);
                    if (original) {
                        trackFieldUpdates(original, updated, summary);
                    }
                });

                console.log(`Successfully validated ${validatedModels.length} models`);
                summary.modelsUpdated = validatedModels.length;
                setValidationProgress(null);
                setIsValidating(false);
                return {
                    success: true,
                    updatedModels: validatedModels,
                    summary
                };
            }

        } catch (error: any) {
            console.error('Database validation error:', error);
            summary.errors++;
            setValidationProgress(null);
            setIsValidating(false);
            return {
                success: false,
                error: error?.name === 'AbortError' ? 'Validation cancelled by user' : (error instanceof Error ? error.message : String(error)),
                summary
            };
        } finally {
            validationAbortRef.current = null;
        }
    };

    return {
        isValidating,
        validationJobs,
        validationProgress,
        startValidation,
        pauseValidation,
        resumeValidation,
        stopValidation,
        clearFinishedValidationJobs,
        hasConfiguredProviders,
        getEnabledProviders,
        showValidationModal,
        openValidationModal,
        closeValidationModal,
        validateEntireDatabase
    };
}
