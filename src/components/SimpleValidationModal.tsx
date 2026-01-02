import React, { useState, useContext, useMemo, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Settings, Clock, Coins, Filter, Search } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, CurrencyCode } from '../utils/currency';
import { convertModelsToCSV } from '../services/validation';
import { ValidationSummary } from '../hooks/useModelValidation';
import { callProvider } from '../services/api/providers/provider-calls';

interface SimpleValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidateAll: (opts?: { batchSize?: number; pauseMs?: number; maxBatches?: number; modelsOverride?: Model[] }) => Promise<{ success: boolean; updatedModels?: Model[]; error?: string; summary?: ValidationSummary }>;
  models: Model[];
  hasApiProvider: boolean;
  onCancel?: () => void;
  isBusy?: boolean;
}

export function SimpleValidationModal({
  isOpen,
  onClose,
  onValidateAll,
  models,
  hasApiProvider,
  onCancel,
  isBusy
}: SimpleValidationModalProps) {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; summary?: ValidationSummary } | null>(null);

  // Batch Configuration State
  const [isManualConfig, setIsManualConfig] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [pauseMs, setPauseMs] = useState<number>(10000);
  const [maxBatches, setMaxBatches] = useState<number>(0);

  // Filter State
  const [providerSearch, setProviderSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterMissingFields, setFilterMissingFields] = useState<string[]>([]);

  // Limit Mode
  const [scopeMode, setScopeMode] = useState<'all' | 'limit'>('all');
  const [limitCount, setLimitCount] = useState<number>(50);
  const [ordering, setOrdering] = useState<'recent' | 'oldest' | 'incomplete'>('incomplete');

  // Dynamic Pricing State
  const [dynamicPrice, setDynamicPrice] = useState<{ in: number; out: number } | null>(null);

  type PricingTier = 'standard' | 'batch' | 'flex' | 'priority';

  const bgModal = 'bg-bg border-border text-text';
  const textPrimary = 'text-text';
  const textSecondary = 'text-text-secondary';
  const bgInput = 'border border-border bg-input text-text';
  const cardBg = 'bg-card border-border';

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setIsValidating(false);
      setScopeMode('all');
      setFilterProvider('all');
      setFilterMissingFields([]);
      setProviderSearch('');
    }
  }, [isOpen]);

  // Derived: Unique Providers
  const uniqueProviders = useMemo(() => {
    const providers = Array.from(new Set(models.map(m => m.provider || 'Unknown'))).sort();
    return providers;
  }, [models]);

  // Derived: Filtered Providers for Dropdown
  const availableProviders = useMemo(() => {
    if (!providerSearch) return uniqueProviders;
    return uniqueProviders.filter(p => p.toLowerCase().includes(providerSearch.toLowerCase()));
  }, [uniqueProviders, providerSearch]);

  // Derived: Base "Incomplete" Models (models that need validation at all)
  const baseIncompleteModels = useMemo(() => {
    return models.filter(model =>
      !model.provider ||
      !model.description ||
      !model.parameters ||
      !model.license?.name ||
      model.license?.name === 'Unknown' ||
      !model.release_date
    );
  }, [models]);

  // Step 1: Apply User Filters to the Base list
  const filteredCandidates = useMemo(() => {
    return baseIncompleteModels.filter(model => {
      // Provider Filter
      if (filterProvider !== 'all' && (model.provider || 'Unknown') !== filterProvider) return false;

      // Missing Fields Filter (OR logic: match any selected)
      if (filterMissingFields.length > 0) {
        const missingParams = !model.parameters;
        const missingLicense = !model.license?.name || model.license?.name === 'Unknown';
        const missingDate = !model.release_date;
        const missingDesc = !model.description;

        let matches = false;
        if (filterMissingFields.includes('parameters') && missingParams) matches = true;
        if (filterMissingFields.includes('license') && missingLicense) matches = true;
        if (filterMissingFields.includes('release_date') && missingDate) matches = true;
        if (filterMissingFields.includes('description') && missingDesc) matches = true;

        if (!matches) return false;
      }

      return true;
    });
  }, [baseIncompleteModels, filterProvider, filterMissingFields]);

  // Step 2: Apply Limit and Ordering
  const targetModels = useMemo(() => {
    let result = [...filteredCandidates];

    // Apply Sorting when limiting to ensure we get the "top" N according to criteria
    // (If scope is 'all', order doesn't strictly matter for the batch content, but 'incomplete' first is good practice)
    if (ordering === 'recent') {
      result.sort((a, b) => new Date(b.release_date || b.updated_at || 0).getTime() - new Date(a.release_date || a.updated_at || 0).getTime());
    } else if (ordering === 'oldest') {
      result.sort((a, b) => new Date(a.release_date || a.updated_at || 0).getTime() - new Date(b.release_date || b.updated_at || 0).getTime());
    } else if (ordering === 'incomplete') {
      const score = (m: Model) => {
        let s = 0;
        if (!m.description) s++;
        if (!m.parameters) s++;
        if (!m.license?.name || m.license?.name === 'Unknown') s++;
        if (!m.tags || m.tags.length === 0) s++;
        return s;
      };
      result.sort((a, b) => score(b) - score(a));
    }

    if (scopeMode === 'limit') {
      return result.slice(0, Math.min(limitCount, result.length));
    }
    return result;
  }, [filteredCandidates, scopeMode, limitCount, ordering]);

  // Toggle helper for missing fields
  const toggleMissingField = (field: string) => {
    setFilterMissingFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const targetCount = targetModels.length; // Effective count being validated
  const totalCandidateCount = filteredCandidates.length; // Count matching filters (before limit)

  // Calculations for display
  const fullCsv = convertModelsToCSV(targetModels);
  const estimatedTokensFull = Math.ceil(fullCsv.length / 4);
  const tokenSoftLimit = 180000;
  const modelCountSoftLimit = 250;
  const autoHybridMode: 'single' | 'batch' = (estimatedTokensFull > tokenSoftLimit || targetModels.length > modelCountSoftLimit) ? 'batch' : 'single';

  const suggestedBatchSize = Math.min(100, Math.max(20, Math.round(targetCount / 8) || 20));
  const autoPauseMs = 10000;

  const effectiveBatchSize = isManualConfig ? batchSize : suggestedBatchSize;
  const effectivePauseMs = isManualConfig ? pauseMs : autoPauseMs;
  const effectiveMaxBatches = (isManualConfig && maxBatches > 0) ? maxBatches : 0;

  // Determine effective provider configuration
  const providerPriority = ['perplexity', settings.preferredModelProvider, 'anthropic', 'openai', 'google', 'deepseek', 'cohere', 'openrouter'].filter(Boolean);
  const effectiveEntry = providerPriority
    .map(key => key ? [key, settings.apiConfig?.[key]] : undefined)
    .find((entry: any) => entry && entry[1]?.enabled && (entry[1]?.apiKey || entry[0] === 'ollama'));

  const providerKey: string = (effectiveEntry as any)?.[0] || 'unknown';
  const providerCfg: any = effectiveEntry?.[1];
  const modelName: string = providerCfg?.model || 'unknown';
  const currency: CurrencyCode = settings.currency || 'USD';

  // Dynamic Pricing fetch effect
  useEffect(() => {
    // If using OpenRouter, try to fetch real-time pricing
    if (providerKey === 'openrouter' && providerCfg) {
      callProvider('openrouter', providerCfg, '', '')
        .then(models => {
          const match = models.find(m => m.id === modelName);
          if (match?.pricing && match.pricing.length > 0) {
            const p = match.pricing[0];
            if (p.input && p.output) {
              setDynamicPrice({ in: Number(p.input), out: Number(p.output) });
            }
          }
        })
        .catch(err => console.error('Failed to fetch pricing:', err));
    } else {
      setDynamicPrice(null); // Reset for others to use static default
    }
  }, [providerKey, modelName, providerCfg, isOpen]); // Rerun when modal opens or provider changes


  const tokensInPerModel = 1500;
  const tokensOutPerModel = 800;

  const priceTable: Record<string, { in: number; out: number }> = {
    'openai:gpt-4o-mini': { in: 0.00015, out: 0.0006 },
    'openai:gpt-4o': { in: 0.0025, out: 0.01 },
    'openai:gpt-3.5-turbo': { in: 0.0005, out: 0.0015 },
    'anthropic:claude-3-5-sonnet': { in: 0.003, out: 0.015 },
    'anthropic:claude-3-haiku': { in: 0.00025, out: 0.00125 },
    'google:gemini-1.5-flash': { in: 0.000075, out: 0.0003 },
    'google:gemini-1.5-pro': { in: 0.0035, out: 0.0105 },
    'perplexity:sonar': { in: 0.001, out: 0.001 },
    'perplexity:sonar-pro': { in: 0.003, out: 0.015 },
  };
  const providerDefaults: Record<string, { in: number; out: number }> = {
    'openai': { in: 0.0025, out: 0.01 },
    'anthropic': { in: 0.003, out: 0.015 },
    'google': { in: 0.00035, out: 0.0105 },
    'perplexity': { in: 0.001, out: 0.005 },
    'deepseek': { in: 0.0005, out: 0.0005 },
    'cohere': { in: 0.0001, out: 0.002 },
    'openrouter': { in: 0.001, out: 0.001 },
    'unknown': { in: 0, out: 0 }
  };

  const fullModelKey = `${providerKey}:${modelName}`.toLowerCase();

  // Use dynamic price if available, else static table, else defaults
  const unitPrice = dynamicPrice || priceTable[fullModelKey] || providerDefaults[providerKey] || { in: 0, out: 0 };

  const tierMultipliers: Record<PricingTier, number> = { standard: 1, batch: 0.5, flex: 0.5, priority: 1.2 };
  const autoSelectTier = (): PricingTier => {
    if (autoHybridMode === 'batch') return (targetCount >= 200 || effectivePauseMs >= 5000) ? 'batch' : 'flex';
    return 'standard';
  };
  const pricingTier = autoSelectTier();
  const priceMultiplier = tierMultipliers[pricingTier] ?? 1;

  const totalInTokens = targetCount * tokensInPerModel;
  const totalOutTokens = targetCount * tokensOutPerModel;

  const estCostUsd = (((totalInTokens / 1000) * unitPrice.in) + ((totalOutTokens / 1000) * unitPrice.out)) * priceMultiplier;
  const batches = Math.ceil(targetCount / (effectiveBatchSize || 1));
  const etaSeconds = (targetCount * 2) + (Math.max(0, batches - 1) * Math.round(effectivePauseMs / 1000));

  const formatEta = (s: number) => s < 60 ? `${Math.ceil(s)}s` : s < 3600 ? `${Math.ceil(s / 60)}m` : `${Math.floor(s / 3600)}h${Math.ceil((s % 3600) / 60)}m`;

  const handleValidate = async () => {
    if (!hasApiProvider) {
      setResult({ success: false, message: 'Please configure an API provider in Sync settings.' });
      return;
    }
    setIsValidating(true);
    setResult(null);
    try {
      const validationResult = await onValidateAll({
        batchSize: effectiveBatchSize,
        pauseMs: effectivePauseMs,
        maxBatches: effectiveMaxBatches || undefined,
        modelsOverride: targetModels
      });

      if (validationResult.success && validationResult.updatedModels) {
        setResult({
          success: true,
          message: `Success! Validated ${validationResult.updatedModels.length} models.`,
          summary: validationResult.summary
        });
        setTimeout(() => { onClose(); setResult(null); }, 5000);
      } else {
        setResult({ success: false, message: validationResult.error || 'Validation failed' });
      }
    } catch (error) {
      setResult({ success: false, message: String(error) });
    } finally {
      setIsValidating(false);
    }
  };

  const isCostSignificant = estCostUsd > 0.01;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-3xl rounded-2xl border ${bgModal} shadow-2xl flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <CheckCircle className="size-6 text-violet-500" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Validate Model Data</h2>
              <div className={`text-sm ${textSecondary} mt-0.5`}>Enrich and verify metadata using {providerKey} • {modelName}</div>
            </div>
          </div>
          <button onClick={onClose} className={`rounded-xl ${bgInput} p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}>
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

            {/* LEFT COLUMN: Filters & Scope */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <Filter className="size-4 text-violet-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Filters & Scope</h3>
              </div>

              <div className={`flex-1 p-4 rounded-xl border ${cardBg} shadow-sm space-y-5`}>

                {/* 1. Filters */}
                <div className="space-y-3">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-wider">Filter Candidates</label>

                  {/* Provider Filter with Search */}
                  <div>
                    <div className="text-[10px] uppercase opacity-50 mb-1.5 flex justify-between">
                      <span>Provider</span>
                      {filterProvider !== 'all' && (
                        <button onClick={() => { setFilterProvider('all'); setProviderSearch(''); }} className="text-violet-500 hover:underline">Clear</button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-500"><Search className="size-3.5" /></span>

                      {filterProvider === 'all' ? (
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search providers..."
                            value={providerSearch}
                            onChange={e => setProviderSearch(e.target.value)}
                            className={`w-full ${bgInput} rounded-lg py-2 pl-9 pr-3 text-xs`}
                          />
                          {providerSearch && availableProviders.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 max-h-40 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                              {availableProviders.map(p => (
                                <button
                                  key={p}
                                  onClick={() => { setFilterProvider(p); setProviderSearch(''); }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => setFilterProvider('all')}
                          className={`w-full ${bgInput} rounded-lg py-2 pl-9 pr-3 text-xs flex items-center justify-between cursor-pointer hover:opacity-80`}
                        >
                          <span className="font-medium text-violet-500">{filterProvider}</span>
                          <X className="size-3 opacity-50" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Missing Fields Filter */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      { id: 'parameters', label: 'Params' },
                      { id: 'license', label: 'License' },
                      { id: 'release_date', label: 'Date' },
                      { id: 'description', label: 'Desc' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => toggleMissingField(f.id)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${filterMissingFields.includes(f.id)
                          ? 'bg-violet-500 text-white border-violet-600'
                          : 'bg-transparent border-zinc-300 dark:border-zinc-700 opacity-60 hover:opacity-100'
                          }`}
                      >
                        Missing {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

                {/* 2. Scope & Limit (No Sorting) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold opacity-60 uppercase tracking-wider">Validation Scope</label>
                    <span className="text-[10px] opacity-50">{totalCandidateCount} matching filters</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg">
                    <button
                      onClick={() => setScopeMode('all')}
                      className={`text-xs font-medium py-1.5 px-3 rounded-md transition-all ${scopeMode === 'all' ? 'bg-white dark:bg-zinc-800 shadow-sm text-violet-600' : 'opacity-60 hover:opacity-100'}`}
                    >
                      All Matches
                    </button>
                    <button
                      onClick={() => setScopeMode('limit')}
                      className={`text-xs font-medium py-1.5 px-3 rounded-md transition-all ${scopeMode === 'limit' ? 'bg-white dark:bg-zinc-800 shadow-sm text-violet-600' : 'opacity-60 hover:opacity-100'}`}
                    >
                      Limit Count
                    </button>
                  </div>

                  {scopeMode === 'limit' && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1 space-y-3">
                      {/* Limit Slider */}
                      <div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={1} max={Math.min(200, totalCandidateCount)}
                            value={limitCount} onChange={e => setLimitCount(parseInt(e.target.value))}
                            className="flex-1 accent-violet-500 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className={`w-12 text-center text-xs font-mono font-bold`}>{limitCount}</div>
                        </div>
                        <div className="text-[10px] text-center opacity-40 mt-1">Processing limit applied</div>
                      </div>

                      {/* Ordering Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold opacity-60">Prioritize By</label>
                        <select
                          value={ordering}
                          onChange={(e) => setOrdering(e.target.value as any)}
                          className={`w-full ${bgInput} text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-violet-500`}
                        >
                          <option value="incomplete">Most Incomplete First</option>
                          <option value="recent">Most Recent First</option>
                          <option value="oldest">Oldest First</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Execution & Cost */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Settings className="size-4 text-violet-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide opacity-80">Execution</h3>
                </div>
                <button onClick={() => setIsManualConfig(!isManualConfig)} className="text-[10px] text-violet-500 underline decoration-dotted">
                  {isManualConfig ? 'Default Settings' : 'Advanced'}
                </button>
              </div>

              <div className="flex-1 space-y-4">
                {/* COST CARD */}
                <div className={`rounded-xl border ${cardBg} p-5 shadow-sm relative overflow-hidden group`}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide flex items-center gap-1.5">
                        <Coins className="size-3 text-violet-500" /> Estimated Cost
                      </div>
                      {dynamicPrice && (
                        <span className="text-[9px] bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded border border-violet-500/20">
                          Live Pricing
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-3xl font-bold ${isCostSignificant ? 'text-text' : 'text-zinc-500'}`}>
                        {estCostUsd > 0 ? formatCurrency(estCostUsd, currency) : 'Free'}
                      </span>
                      {estCostUsd > 0 && estCostUsd < 0.01 && <span className="text-xs text-zinc-400">(&lt;$0.01)</span>}
                    </div>
                    <div className="text-[11px] opacity-60 mb-3">{targetCount} models via {providerKey}</div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                      <div>
                        <div className="opacity-50 text-[10px]">ETA</div>
                        <div className="font-semibold flex items-center gap-1"><Clock className="size-3 text-violet-500" />{formatEta(etaSeconds)}</div>
                      </div>
                      <div>
                        <div className="opacity-50 text-[10px]">Tokens</div>
                        <div className="font-semibold">~{Math.round((totalInTokens + totalOutTokens) / 1000)}k</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Batch Settings */}
                <div className={`rounded-xl border ${cardBg} p-4 text-xs`}>
                  {isManualConfig ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1"><label>Batch Size</label><span className="font-mono">{batchSize}</span></div>
                        <input type="range" min={1} max={200} value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><label>Pause (ms)</label><span className="font-mono">{pauseMs}</span></div>
                        <input type="range" min={0} max={60000} step={1000} value={pauseMs} onChange={e => setPauseMs(Number(e.target.value))} className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none" />
                        <div className="text-[9px] opacity-40 mt-1">Manual delay between batches</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between opacity-80">
                      <span>Auto-Optimization Active</span>
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-700 px-2 py-0.5 rounded text-[10px]">Enabled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div className={`mt-4 rounded-lg border p-3 ${result.success ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'} animate-in slide-in-from-bottom-2`}>
              <div className="flex gap-2">
                {result.success ? <CheckCircle className="size-4 text-green-600" /> : <AlertTriangle className="size-4 text-red-600" />}
                <div className="text-sm font-medium">{result.message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-card/30 flex justify-end gap-3">
          <button onClick={onClose} className={`px-4 py-2 rounded-xl border text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors`}>Cancel</button>
          <button onClick={handleValidate} disabled={isValidating || !hasApiProvider} className="px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            {isValidating && <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isValidating ? 'Running...' : `Validate ${targetCount} Models`}
          </button>
        </div>
      </div>
    </div>
  );
}
