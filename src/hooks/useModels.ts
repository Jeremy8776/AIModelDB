import { useState, useEffect, useRef } from 'react';
import { ApiDir, Model, ProviderCfg, ProviderKey } from '../types';
import { useSettings } from '../context/SettingsContext';
import { dedupe, mapDomain, normalizeNameForMatch } from '../utils/format';
import { DEFAULT_API_DIR, callProviderLLM } from '../services/api';
import { ValidationQueue, ValidationSource, ValidationJob, getMissingFields } from '../services/validation';

// Empty array for models, we'll load from API sources instead
const SEED_MODELS: Model[] = [];

// Function to check if a model has missing or incomplete data
export function isModelIncomplete(model: Model): boolean {
  if (!model.name || !model.provider || !model.domain) return true;
  if (!model.parameters && (model.domain === 'LLM' || model.domain === 'ImageGen')) return true;
  if (!model.context_window && model.domain === 'LLM') return true;
  if (!model.license || !model.license.name) return true;
  if (!model.updated_at && !model.release_date) return true;
  if (!model.tags || model.tags.length === 0) return true;
  return false;
}

// Define fields that must be filled
const REQUIRED_FIELDS = [
  'name', 'provider', 'domain', 'parameters', 'context_window',
  'license.name', 'license.type', 'license.commercial_use',
  'updated_at', 'release_date', 'tags'
];

// Helper to create a generic validation/enrichment prompt
function createEnrichmentPrompt(model: Model): string {
  return `
I have an AI model with incomplete metadata. Fill in missing information for this model:
${JSON.stringify(model, null, 2)}

Return ONLY the updated model with all fields filled. Don't include any explanation.
Focus especially on these fields if they're missing:
- parameters (size of the model, e.g. "7B" or "1.5B")
- context_window (for LLMs, e.g. "8K" or "32K")
- license details
- release_date (in ISO format)
- tags
- hosting information
`;
}

export function useModels() {
  // Keep apiConfig in sync with global settings so validation sees enabled providers immediately
  const { settings } = useSettings();
  const [models, setModels] = useState<Model[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);
  const [validationProgress, setValidationProgress] = useState<{ current: number, total: number } | null>(null);
  const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number } | null>(null);

  // Track the API configuration
  const [apiConfig, setApiConfig] = useState<ApiDir>(DEFAULT_API_DIR);

  // Synchronize internal apiConfig with SettingsContext
  useEffect(() => {
    try {
      if (settings?.apiConfig) {
        setApiConfig(settings.apiConfig);
      }
    } catch { }
  }, [settings?.apiConfig]);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationJobs, setValidationJobs] = useState<ValidationJob[]>([]);
  const [selectedModelForEdit, setSelectedModelForEdit] = useState<Model | null>(null);
  const [showModelEditor, setShowModelEditor] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Validation queue ref to persist between renders
  const validationQueueRef = useRef<ValidationQueue | null>(null);
  // Cancellation flag for database-wide validation (CSV batch mode)
  const cancelDbValidationRef = useRef<boolean>(false);
  // Abort controller for in-flight provider requests
  const validationAbortRef = useRef<AbortController | null>(null);

  // Ref to track initialization
  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);

  // Load API config from localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('aiModelDBPro_apiConfig');
      if (savedConfig) {
        setApiConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading API config from localStorage:', error);
    }
  }, []);

  // Load models from localStorage on initial mount (async to prevent blocking)
  useEffect(() => {
    if (initialized.current) return;

    const sanitizePricing = (modelsIn: Model[]): Model[] => {
      return modelsIn.map((m) => {
        if (!m.pricing || !Array.isArray(m.pricing)) return m;
        const sanitized = m.pricing.map((p: any) => {
          const unit = (p.unit || '').toLowerCase();
          const isApiUnit = unit.includes('token') || unit.includes('request') || unit.includes('call');
          // If API-like unit and flat present, drop flat (avoid mislabel as subscription)
          const flat = (isApiUnit ? null : (isFinite(Number(p.flat)) ? Number(p.flat) : null));
          const input = isFinite(Number(p.input)) ? Number(p.input) : null;
          const output = isFinite(Number(p.output)) ? Number(p.output) : null;
          const currency = (p.currency && typeof p.currency === 'string') ? p.currency : 'USD';
          return { ...p, unit: p.unit || (flat != null ? 'month' : p.unit), flat, input, output, currency };
        });
        return { ...m, pricing: sanitized };
      });
    };

    // Use async loading to prevent blocking the UI
    const loadModels = async () => {
      try {
        const savedModels = localStorage.getItem('aiModelDBPro_models');
        if (savedModels) {
          // For large datasets, yield to the browser to show loading UI
          await new Promise(resolve => setTimeout(resolve, 0));

          const parsed: Model[] = JSON.parse(savedModels);

          // Process in chunks to avoid blocking
          const chunkSize = 1000;
          if (parsed.length > chunkSize) {
            setLoadingProgress({ current: 0, total: parsed.length });

            const chunks = [];
            for (let i = 0; i < parsed.length; i += chunkSize) {
              chunks.push(parsed.slice(i, i + chunkSize));
            }

            let processedModels: Model[] = [];
            for (let i = 0; i < chunks.length; i++) {
              await new Promise(resolve => setTimeout(resolve, 0));
              processedModels = processedModels.concat(sanitizePricing(chunks[i]));
              setLoadingProgress({ current: Math.min((i + 1) * chunkSize, parsed.length), total: parsed.length });
            }
            setModels(processedModels);
            setLoadingProgress(null);
          } else {
            setModels(sanitizePricing(parsed));
          }
        } else {
          // Initialize with empty array instead of seed models
          setModels([]);
        }

        const lastSyncTime = localStorage.getItem('aiModelDBPro_lastSync');
        if (lastSyncTime) {
          setLastSync(lastSyncTime);
        }

        initialized.current = true;
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading models from localStorage:', error);
        // Initialize with empty array instead of seed models
        setModels([]);
        initialized.current = true;
        setIsLoading(false);
        setLoadingProgress(null);
      }
    };

    loadModels();
  }, []);

  // Save models to localStorage whenever they change (debounced to prevent blocking)
  useEffect(() => {
    if (!initialized.current) return;

    // Debounce saves to avoid blocking on rapid updates
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('aiModelDBPro_models', JSON.stringify(models));
      } catch (error) {
        console.error('Error saving models to localStorage:', error);
      }
    }, 500); // Wait 500ms after last change before saving

    return () => clearTimeout(timeoutId);
  }, [models]);

  // Expose a global hard reset function and event listener
  useEffect(() => {
    // Allow UI to call via window.__hardReset()
    (window as any).__hardReset = async () => {
      await hardResetDatabase();
    };
    const onHardReset = async () => {
      await hardResetDatabase();
    };
    window.addEventListener('hard-reset', onHardReset as EventListener);
    return () => {
      delete (window as any).__hardReset;
      window.removeEventListener('hard-reset', onHardReset as EventListener);
    };
  }, []);

  // Function to add a new model
  const addModel = (model: Model) => {
    setModels(prev => dedupe([...prev, model]));
  };

  // Function to update a model
  const updateModel = (updatedModel: Model) => {
    setModels(prev =>
      prev.map(model => model.id === updatedModel.id ? updatedModel : model)
    );
  };

  // Function to delete a model
  const deleteModel = (modelId: string) => {
    setModels(prev => prev.filter(model => model.id !== modelId));
  };

  // Helpers for matching/merging
  const matchExistingIndex = (arr: Model[], inc: Model): number => {
    // 1) Match by exact id
    let idx = arr.findIndex(e => e.id && inc.id && e.id === inc.id);
    if (idx !== -1) return idx;
    // 2) Match by repo
    if (inc.repo) {
      idx = arr.findIndex(e => e.repo && e.repo === inc.repo);
      if (idx !== -1) return idx;
    }
    // 3) Match by url
    if (inc.url) {
      idx = arr.findIndex(e => e.url && e.url === inc.url);
      if (idx !== -1) return idx;
    }
    // 4) Optional fuzzy name + tolerant provider (respect user setting)
    if (settings?.autoMergeDuplicates) {
      const incProv = (inc.provider || '').toString().toLowerCase();
      const incBase = normalizeNameForMatch(inc.name);
      if (incBase) {
        idx = arr.findIndex(e => {
          // Require same domain to reduce false merges
          const sameDomain = !inc.domain || !e.domain ? true : inc.domain === e.domain;
          const exProv = (e.provider || '').toString().toLowerCase();
          const provOk = incProv === exProv || !incProv || !exProv || incProv.includes(exProv) || exProv.includes(incProv);
          return sameDomain && normalizeNameForMatch(e.name) === incBase && provOk;
        });
        if (idx !== -1) return idx;
      }
    }
    return -1;
  };

  const mergeRecords = (existing: Model, incoming: Model): Model => {
    const containsCJK = (text?: string | null): boolean => {
      if (!text) return false;
      return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(text);
    };
    const preferIncomingText = (
      existingText?: string | null,
      incomingText?: string | null,
      incomingTags?: string[]
    ): string | null | undefined => {
      if (incomingTags && incomingTags.includes('translated')) {
        return incomingText || existingText;
      }
      if (incomingText && !containsCJK(incomingText) && containsCJK(existingText || '')) {
        return incomingText;
      }
      return existingText || incomingText;
    };

    const merged: Model = { ...existing } as Model;
    merged.name = preferIncomingText(existing.name, incoming.name, incoming.tags) || existing.name || incoming.name || '';
    merged.provider = existing.provider || incoming.provider;
    merged.domain = (existing.domain || incoming.domain) as any;
    merged.source = existing.source || incoming.source;
    merged.url = existing.url || incoming.url || null;
    merged.repo = existing.repo || incoming.repo || null;
    merged.parameters = existing.parameters || incoming.parameters || null;
    merged.context_window = existing.context_window || incoming.context_window || null;
    merged.updated_at = existing.updated_at || incoming.updated_at || null;
    merged.release_date = existing.release_date || incoming.release_date || null;
    merged.downloads = existing.downloads ?? incoming.downloads ?? null;
    merged.indemnity = existing.indemnity || incoming.indemnity || 'None';
    merged.data_provenance = existing.data_provenance || incoming.data_provenance || null;
    merged.usage_restrictions = Array.from(new Set([...(existing.usage_restrictions || []), ...(incoming.usage_restrictions || [])]));
    merged.license = {
      name: existing.license?.name || incoming.license?.name || 'Unknown',
      type: existing.license?.type || incoming.license?.type || 'Custom',
      commercial_use: existing.license?.commercial_use ?? incoming.license?.commercial_use ?? true,
      attribution_required: existing.license?.attribution_required ?? incoming.license?.attribution_required ?? false,
      share_alike: existing.license?.share_alike ?? incoming.license?.share_alike ?? false,
      copyleft: existing.license?.copyleft ?? incoming.license?.copyleft ?? false,
      url: existing.license?.url || incoming.license?.url || undefined,
      notes: existing.license?.notes || incoming.license?.notes || undefined
    } as any;
    merged.hosting = {
      weights_available: Boolean(existing.hosting?.weights_available || incoming.hosting?.weights_available),
      api_available: Boolean(existing.hosting?.api_available || incoming.hosting?.api_available),
      on_premise_friendly: Boolean(existing.hosting?.on_premise_friendly || incoming.hosting?.on_premise_friendly),
      providers: Array.from(new Set([...(existing.hosting?.providers || []), ...(incoming.hosting?.providers || [])]))
    };
    merged.tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    // Prefer translated English description if available
    const preferredDescription = preferIncomingText(existing.description as any, incoming.description as any, incoming.tags);
    if (preferredDescription != null) {
      (merged as any).description = preferredDescription as any;
    }
    // Merge pricing and annotate source (API vs Local/Subscription)
    const priceSig = (p: any) => `${(p.model || '').toLowerCase()}|${(p.unit || '').toLowerCase()}|${p.input ?? ''}|${p.output ?? ''}|${p.flat ?? ''}|${(p.currency || '').toUpperCase()}`;
    const normalizePricing = (p: any): any => ({
      ...p,
      model: p.model || 'Usage',
      unit: p.unit || (p.flat != null ? 'month' : 'token'),
      currency: p.currency || 'USD'
    });
    const existingPricing = (existing.pricing || []).map(normalizePricing);
    const incomingPricing = (incoming.pricing || []).map(normalizePricing);
    const mergedPricing: any[] = [];
    const seen = new Set<string>();
    [...existingPricing, ...incomingPricing].forEach(p => {
      const sig = priceSig(p);
      if (!seen.has(sig)) { seen.add(sig); mergedPricing.push(p); }
    });
    if (mergedPricing.length > 0) merged.pricing = mergedPricing as any;
    return merged;
  };

  // Function to import models (from various sources)
  const importModels = (newModels: Model[]) => {
    const toNormalized = (m: any, idx: number): Model => {
      const toStringLower = (x: any) => String(x || '').toLowerCase();
      const parseYesNo = (x: any): boolean | undefined => {
        const s = toStringLower(x);
        if (!s) return undefined;
        if (/(^|\b)(yes|true|allowed|y)$/.test(s)) return true;
        if (/(^|\b)(no|false|not allowed|disallow|non-?commercial|nc)$/.test(s)) return false;
        return undefined;
      };
      const mapLicenseType = (name?: string | null): any => {
        const s = toStringLower(name);
        if (!s) return 'Custom';
        if (/(gpl|agpl|lgpl)/.test(s)) return 'Copyleft';
        if (/(apache|mit|bsd|mpl)/.test(s)) return 'OSI';
        if (/(non\s*-?commercial|nc)/.test(s)) return 'Non-Commercial';
        if (/proprietary/.test(s)) return 'Proprietary';
        return 'Custom';
      };
      const parsePricing = (raw: any): any[] | undefined => {
        const s = String(raw || '').trim();
        if (!s) return undefined;
        if (/^free(\b|\s|\()/i.test(s)) {
          return [{ model: 'Usage', unit: 'usage', flat: 0, currency: 'USD', notes: s }];
        }
        const m1 = s.match(/\$([0-9]+(?:\.[0-9]+)?)\s*per\s*([a-zA-Z\- ]+)/i);
        if (m1) {
          return [{ model: 'Usage', unit: m1[2].trim().toLowerCase(), input: Number(m1[1]), currency: 'USD' }];
        }
        return [{ model: 'Usage', unit: 'usage', notes: s }];
      };

      const parseExcelDate = (v: any): string | null => {
        if (v == null || v === '') return null;
        if (typeof v === 'number' && v > 30000 && v < 100000) {
          const epoch = new Date(Date.UTC(1899, 11, 30));
          const dt = new Date(epoch.getTime() + v * 86400000);
          return dt.toISOString().slice(0, 10);
        }
        const str = String(v).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        return null;
      };
      const id = String(m.id || `${m.source || 'import'}-${m['Model Name'] || m.name || m.model || idx}`);
      const name = String(m.name || m.model || m['Model Name'] || m['Model'] || id);
      const provider = m.provider || m.Author || m.company || m.Company || m.Developer || m['Company/Developer'] || m.org || null;
      const sheet = (m.__sheetName ? String(m.__sheetName) : undefined);
      const domain = mapDomain(m.domain || m['Model Type'] || m.Type, sheet) as any;
      const source = m.source || 'Import';
      const url = m.url || m.homepage || null;
      const repo = m.repo || null;
      const licenseName = m.license_name || m.license || 'Unknown';
      const commercialParsed = parseYesNo(m.commercial);
      const license: any = {
        name: String(licenseName),
        type: mapLicenseType(licenseName),
        commercial_use: commercialParsed ?? true,
        attribution_required: Boolean(m.attribution_required ?? false),
        share_alike: Boolean(m.share_alike ?? false),
        copyleft: Boolean(m.copyleft ?? false)
      };
      const hosting: any = {
        weights_available: Boolean(m.weights_available ?? true),
        api_available: Boolean(m.api_available ?? true),
        on_premise_friendly: Boolean(m.on_premise_friendly ?? true)
      };
      const tags = Array.isArray(m.tags) ? m.tags.map((t: any) => String(t)) : (typeof m.tags === 'string' ? m.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
      const parameters = (m.parameters || m.Params || m.Size) ? String(m.parameters || m.Params || m.Size) : null;
      const context_window = (m.context_window || m['Context Window']) ? String(m.context_window || m['Context Window']) : null;
      const rel = parseExcelDate(m.release_date || m.Released || m['Release Date'] || m.Date);
      const updated = parseExcelDate(m.updated_at || m.Updated);
      const priceRaw = m.pricing || m.price || m.Pricing || m.Cost;
      const pricing = Array.isArray(m.pricing) ? m.pricing : (priceRaw ? parsePricing(priceRaw) : undefined);
      const modelOut: Model = { id, name, provider, domain, source, url, repo, license, hosting, tags, parameters, context_window } as Model;
      if (rel) (modelOut as any).release_date = String(rel);
      if (updated) (modelOut as any).updated_at = String(updated);
      if (pricing) (modelOut as any).pricing = pricing as any;
      return modelOut;
    };

    const normalized: Model[] = (newModels || []).map((m: any, idx: number) => toNormalized(m, idx));

    setModels(prev => {
      const base = [...(prev || [])];
      normalized.forEach(inc => {
        const idx = matchExistingIndex(base, inc);
        if (idx === -1) {
          base.push(inc);
        } else {
          base[idx] = mergeRecords(base[idx], inc);
        }
      });
      return dedupe(base);
    });
  };

  // Merge a batch of models coming from sync/validation
  const mergeInModels = (incomingList: Model[]) => {
    if (!incomingList || incomingList.length === 0) return;
    setModels(prev => {
      const base = [...(prev || [])];
      let added = 0;
      let updated = 0;
      incomingList.forEach(inc => {
        const idx = matchExistingIndex(base, inc);
        if (idx === -1) { base.push(inc); added++; } else { base[idx] = mergeRecords(base[idx], inc); updated++; }
      });
      const deduped = dedupe(base);
      setLastMergeStats({ added, updated });
      return deduped;
    });
  };

  // Function to clear all models
  const clearAllModels = () => {
    localStorage.removeItem('aiModelDBPro_models');
    setModels([]);
  };

  // Function to reset everything to default
  const resetToDefault = () => {
    localStorage.removeItem('aiModelDBPro_models');
    localStorage.removeItem('aiModelDBPro_lastSync');
    localStorage.removeItem('aiModelDBPro_apiConfig');
    setModels([]);
    setLastSync(null);
    setApiConfig(DEFAULT_API_DIR);
  };

  // Extreme reset: wipe all local storage keys for this app, try to clear caches/IDB, and reset state
  const hardResetDatabase = async () => {
    try {
      // Remove all localStorage keys prefixed with our namespace
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) as string;
        if (k && k.startsWith('aiModelDBPro_')) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch { }
    try {
      // Best-effort: clear caches if available
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { }
    try {
      // Best-effort: clear IndexedDB databases (if supported)
      const anyIdx: any = indexedDB as any;
      if (anyIdx && typeof anyIdx.databases === 'function') {
        const dbs = await anyIdx.databases();
        await Promise.all((dbs || []).map((d: any) => d?.name ? indexedDB.deleteDatabase(d.name) : Promise.resolve()));
      }
    } catch { }

    // Reset in-memory state
    setModels([]);
    setLastSync(null);
    setApiConfig(DEFAULT_API_DIR);
  };

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
  }, [isValidating, validationJobs.length]);

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
    // Check if there are any enabled providers
    const enabledProviders = getEnabledProviders();

    if (enabledProviders.length === 0) {
      alert('No enabled LLM providers available for validation. Please set up API keys in the sync settings.');
      return;
    }

    // Check if we have models to validate
    if (modelsToValidate.length === 0) {
      alert('No models selected for validation.');
      return;
    }

    // Check if we have validation sources
    if (sources.length === 0) {
      alert('No validation sources selected.');
      return;
    }

    const queue = getValidationQueue();

    // Add models to validation queue
    queue.addJobs(modelsToValidate, sources);

    // Update state
    setIsValidating(true);
    setValidationJobs([...queue.getJobs()]);
  };

  // Function to pause validation
  const pauseValidation = () => {
    const queue = getValidationQueue();
    queue.pause();
  };

  // Function to resume validation
  const resumeValidation = () => {
    const queue = getValidationQueue();
    queue.resume();
  };

  // Function to clear finished validation jobs
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

    // Immediately set cancellation flags
    cancelDbValidationRef.current = true;

    // Abort any in-flight LLM request immediately
    try {
      validationAbortRef.current?.abort();
      console.log('[CANCEL] Aborted in-flight API request');
    } catch { }
    validationAbortRef.current = null;

    // Clear validation queue
    const queue = getValidationQueue();
    queue.clearAllJobs();
    console.log('[CANCEL] Cleared validation queue');

    // Reset all validation state immediately
    setIsValidating(false);
    setValidationJobs([]);
    setValidationProgress(null);

    console.log('[CANCEL] Validation stopped');
  };

  // Legacy function to validate models (for backwards compatibility)
  const validateModels = async () => {
    // Just open the validation modal which is now our single entry point
    setShowValidationModal(true);

    // Pre-select incomplete models
    const incompleteModels = models.filter(isModelIncomplete);
    if (incompleteModels.length > 0) {
      // We'll handle the selection in the modal
    }
  };

  // Functions for model editing
  const openModelEditor = (model: Model) => {
    setSelectedModelForEdit(model);
    setShowModelEditor(true);
  };

  const closeModelEditor = () => {
    setSelectedModelForEdit(null);
    setShowModelEditor(false);
  };

  const saveModelEdit = (editedModel: Model) => {
    updateModel(editedModel);
    closeModelEditor();
  };

  // Functions for validation modal
  const openValidationModal = (selectedModels: string[] = []) => {
    setShowValidationModal(true);
  };

  const closeValidationModal = () => {
    setShowValidationModal(false);
  };

  // Database-wide validation with GPT
  const validateEntireDatabase = async (
    opts?: { batchSize?: number; pauseMs?: number; maxBatches?: number; apiConfig?: ApiDir; preferredModelProvider?: string | null }
  ): Promise<{ success: boolean; updatedModels?: Model[]; error?: string }> => {
    try {
      console.log('Starting database validation with GPT...');
      setIsValidating(true);
      cancelDbValidationRef.current = false;
      // prepare abort controller for this run
      validationAbortRef.current = new AbortController();

      // Use provided API config or fall back to the hook's config
      const configToUse = opts?.apiConfig || apiConfig;

      // Check if we have API configuration
      if (!configToUse) {
        throw new Error('No API configuration available');
      }

      // Helper function to check if a provider has a valid key
      const hasValidKey = async (key: string, cfg: any): Promise<boolean> => {
        // Check if protocol allows no key (e.g. Ollama)
        if (cfg.protocol === 'ollama' || key === 'ollama') {
          return true;
        }

        // Check if has local key
        if (cfg.apiKey && cfg.apiKey.trim() !== '') {
          return true;
        }

        return false;
      };

      // Find an enabled provider (check local key or global key)
      let enabledProvider: [string, any] | undefined;

      // First, try to use the preferred provider if set
      if (opts?.preferredModelProvider) {
        const cfg = configToUse[opts.preferredModelProvider as keyof typeof configToUse];
        if (cfg?.enabled && await hasValidKey(opts.preferredModelProvider, cfg)) {
          enabledProvider = [opts.preferredModelProvider, cfg];
          console.log(`Using preferred provider: ${opts.preferredModelProvider}`);
        }
      }

      // If no preferred provider or it's not available, find first enabled provider
      if (!enabledProvider) {
        for (const [key, cfg] of Object.entries(configToUse)) {
          if (cfg.enabled && await hasValidKey(key, cfg)) {
            enabledProvider = [key, cfg];
            break;
          }
        }
      }

      if (!enabledProvider) {
        throw new Error('No enabled API provider found. Please configure an API provider in Sync settings.');
      }

      const [providerKey, providerConfig] = enabledProvider;

      // Import validation functions
      const { createDatabaseValidationPrompt, parseCSVToModels } = await import('../services/validation');
      const { callProviderText } = await import('../services/api');

      // For large databases, process in batches to respect rate limits
      const batchSize = Math.max(1, opts?.batchSize ?? 50); // Process in batches
      const pauseMs = Math.max(0, opts?.pauseMs ?? 0);
      const maxBatches = opts?.maxBatches && opts.maxBatches > 0 ? opts.maxBatches : Infinity;
      let allValidatedModels: Model[] = [];

      // Hybrid strategy: if full CSV fits comfortably, send once; otherwise chunk by batches
      const { convertModelsToCSV } = await import('../services/validation');
      const fullCsv = convertModelsToCSV(models);
      const estimatedTokensFull = Math.ceil(fullCsv.length / 4);
      const tokenSoftLimit = 180000; // ~180k tokens to leave room for system prompt & response
      const modelCountSoftLimit = 250; // prefer batches for large model counts as well
      const shouldBatch = estimatedTokensFull > tokenSoftLimit || models.length > modelCountSoftLimit;

      if (shouldBatch) {
        console.warn(`Hybrid: switching to batch mode • ${models.length} models • est ~${estimatedTokensFull} tokens. Batch size ${batchSize}.`);

        let batchIndex = 0;
        let processed = 0;
        setValidationProgress({ current: 0, total: models.length });
        for (let i = 0; i < models.length; i += batchSize) {
          batchIndex++;
          if (cancelDbValidationRef.current) {
            console.warn('Validation cancelled by user');
            break;
          }
          if (batchIndex > maxBatches) {
            console.warn(`Max batches (${maxBatches}) reached. Stopping early.`);
            allValidatedModels = allValidatedModels.concat(models.slice(i));
            break;
          }
          const batch = models.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(models.length / batchSize);

          console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} models)...`);

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
              validationPrompt,
              { signal: validationAbortRef.current?.signal }
            );

            if (!csvData) {
              console.warn(`No response for batch ${batchNum}, keeping original models...`);
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
              console.warn(`Batch ${batchNum} returned 0 models - keeping original ${batch.length} models`);
              allValidatedModels = allValidatedModels.concat(batch);
            } else if (batchValidatedModels.length < batch.length) {
              console.warn(`Batch ${batchNum} lost models! Expected ${batch.length}, got ${batchValidatedModels.length}`);
              console.warn(`Merging validated models with originals to prevent data loss...`);

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
              console.log(`Batch ${batchNum} merged: ${mergedBatch.length} models preserved`);
            } else {
              // Success: got same or more models back
              allValidatedModels = allValidatedModels.concat(batchValidatedModels);
              console.log(`Batch ${batchNum} processed: ${batchValidatedModels.length} models validated`);
            }

          } catch (batchError: any) {
            console.error(`Error processing batch ${batchNum}:`, batchError);
            if (batchError?.name === 'AbortError') {
              console.warn('Batch processing aborted by user');
              break;
            }
            // Keep original models for failed batches
            allValidatedModels = allValidatedModels.concat(batch);
          }

          // Update global progress by models processed so far
          processed = Math.min(models.length, i + batch.length);
          setValidationProgress({ current: processed, total: models.length });

          // Check cancellation more frequently
          if (cancelDbValidationRef.current) {
            console.warn('[CANCEL] Validation cancelled during batch processing');
            break;
          }

          // Optional pause between batches to respect rate limits/quotas
          if (pauseMs > 0 && (i + batchSize) < models.length) {
            console.log(`Waiting ${Math.round(pauseMs / 1000)}s before next batch...`);
            const until = Date.now() + pauseMs;
            const checkInterval = 100; // Check every 100ms instead of 200ms for faster cancellation
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

        setValidationProgress(null);
        setIsValidating(false);
        return {
          success: true,
          updatedModels: allValidatedModels
        };

      } else {
        // Process normally for smaller databases (single request)
        console.log(`Hybrid: single-request mode • ${models.length} models • est ~${estimatedTokensFull} tokens.`);
        console.log('Sending full database CSV to GPT for validation (single request)...');
        console.log(`Database size: ${models.length} models`);
        console.log(`Using provider: ${providerKey}`);
        setValidationProgress({ current: 0, total: models.length });

        const validationPrompt = createDatabaseValidationPrompt(models);

        // Call the LLM provider to validate the database
        let csvData = await callProviderText(
          providerKey as any,
          providerConfig,
          'You are an expert AI model database curator and fact-checker.',
          validationPrompt,
          { signal: validationAbortRef.current?.signal }
        );

        // The response should be a CSV string
        if (!csvData) {
          throw new Error('No response from AI provider');
        }

        console.log('Received CSV response, length:', csvData.length);

        // Look for CSV content in the response
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

        // Extract just the CSV portion
        csvData = csvData.substring(csvStart);

        // Remove any trailing text after the CSV
        const lines = csvData.split('\n');
        const validLines = [];
        for (const line of lines) {
          if (line.trim() && (line.includes(',') || validLines.length === 0)) {
            validLines.push(line);
          } else if (validLines.length > 0) {
            break; // Stop at first non-CSV line after we've started
          }
        }
        csvData = validLines.join('\n');

        console.log('Parsing validated data...');

        // Parse the CSV response back to models
        const validatedModels = parseCSVToModels(csvData);

        if (validatedModels.length === 0) {
          throw new Error('No valid models found in AI response. The validation may have failed.');
        }

        console.log(`Successfully validated ${validatedModels.length} models`);
        setValidationProgress(null);
        setIsValidating(false);
        return {
          success: true,
          updatedModels: validatedModels
        };
      }

    } catch (error: any) {
      console.error('Database validation error:', error);
      setValidationProgress(null);
      setIsValidating(false);
      return {
        success: false,
        error: error?.name === 'AbortError' ? 'Validation cancelled by user' : (error instanceof Error ? error.message : String(error))
      };
    } finally {
      // clear abort controller
      validationAbortRef.current = null;
    }
  };

  return {
    models,
    setModels,
    lastSync,
    setLastSync,
    isSyncing,
    setIsSyncing,
    syncProgress,
    setSyncProgress,
    validationProgress,
    lastMergeStats,
    setLastMergeStats,
    addModel,
    updateModel,
    deleteModel,
    importModels,
    mergeInModels,
    clearAllModels,
    resetToDefault,
    hardResetDatabase,
    validateModels,
    apiConfig,
    setApiConfig,
    // New validation queue functionality
    isValidating,
    validationJobs,
    startValidation,
    pauseValidation,
    resumeValidation,
    stopValidation,
    clearFinishedValidationJobs,
    hasConfiguredProviders,
    getEnabledProviders,
    // Model editor functionality
    selectedModelForEdit,
    showModelEditor,
    openModelEditor,
    closeModelEditor,
    saveModelEdit,
    // Validation modal
    showValidationModal,
    openValidationModal,
    closeValidationModal,
    // Database validation
    validateEntireDatabase,
    // Loading state
    isLoading,
    loadingProgress
  };
}
