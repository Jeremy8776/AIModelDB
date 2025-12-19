import React, { useState, useContext } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, CurrencyCode } from '../utils/currency';
import { convertModelsToCSV } from '../services/validation';

interface SimpleValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidateAll: (opts?: { batchSize?: number; pauseMs?: number; maxBatches?: number }) => Promise<{ success: boolean; updatedModels?: Model[]; error?: string }>;
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
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [pauseMs, setPauseMs] = useState<number>(10000);
  const [maxBatches, setMaxBatches] = useState<number>(0); // 0 = unlimited
  type PricingTier = 'standard' | 'batch' | 'flex' | 'priority';

  if (!isOpen) return null;

  const incompleteCount = models.filter(model =>
    !model.provider ||
    !model.description ||
    !model.parameters ||
    !model.license?.name ||
    model.license?.name === 'Unknown' ||
    !model.release_date
  ).length;

  // Hybrid mode display (align with validator logic): single request when CSV fits under soft token limit
  const fullCsv = convertModelsToCSV(models);
  const estimatedTokensFull = Math.ceil(fullCsv.length / 4);
  const tokenSoftLimit = 180000; // ~180k tokens allowance
  const modelCountSoftLimit = 250; // prefer batches when dataset is large
  const hybridMode: 'single' | 'batch' = (estimatedTokensFull > tokenSoftLimit || models.length > modelCountSoftLimit) ? 'batch' : 'single';

  // Suggestion + cost estimation
  const enabledProviderEntry = Object.entries(settings.apiConfig || {}).find(([_, cfg]: any) => cfg?.enabled && cfg?.apiKey) as any;
  const providerKey: string | undefined = enabledProviderEntry?.[0];
  const providerCfg: any = enabledProviderEntry?.[1];
  const modelName: string | undefined = providerCfg?.model;
  const currency: CurrencyCode = settings.currency || 'USD';

  // Token assumptions (rough): ~1200 input, ~800 output per model
  const tokensInPerModel = 1200;
  const tokensOutPerModel = 800;
  const webSearchOverheadPerModel = 200; // heuristic for search/context
  const totalInTokens = incompleteCount * (tokensInPerModel + webSearchOverheadPerModel);
  const totalOutTokens = incompleteCount * tokensOutPerModel;

  // Simple price table (USD per 1K tokens)
  const priceTable: Record<string, { in: number; out: number }> = {
    // OpenAI
    'openai:gpt-4o-mini': { in: 0.003, out: 0.015 },
    'openai:gpt-4o': { in: 0.005, out: 0.015 },
    // Anthropic (approximate)
    'anthropic:claude-3-5-sonnet': { in: 0.003, out: 0.015 },
    // Google (approximate)
    'google:gemini-1.5-flash': { in: 0.00035, out: 0.00053 },
  };

  const priceKey = providerKey && modelName ? `${providerKey}:${modelName}`.toLowerCase() : undefined;
  const unitPrice = priceKey && priceTable[priceKey] ? priceTable[priceKey] : undefined;
  const tierMultipliers: Record<PricingTier, number> = {
    standard: 1,
    batch: 0.5,     // approx. discount for batch processing
    flex: 0.5,      // approx. discount for flex/slow tier
    priority: 1.2   // approx. premium for priority tier
  };
  // Auto-select pricing tier to minimize cost given dataset size and pauses
  const autoSelectTier = (): PricingTier => {
    if (hybridMode === 'batch') return (incompleteCount >= 200 || pauseMs >= 5000) ? 'batch' : 'flex';
    return 'standard';
  };
  const pricingTier = autoSelectTier();
  const priceMultiplier = tierMultipliers[pricingTier] ?? 1;
  const estCostUsd = unitPrice
    ? (((totalInTokens / 1000) * unitPrice.in) + ((totalOutTokens / 1000) * unitPrice.out)) * priceMultiplier
    : undefined;

  const suggestedBatchSize = Math.min(100, Math.max(20, Math.round(incompleteCount / 8) || 20));
  const batches = Math.ceil(incompleteCount / (batchSize || 1));
  // Simple ETA based on ~2s/model plus configured inter-batch pauses
  const secondsPerModel = 2; // heuristic
  const processingSeconds = incompleteCount * secondsPerModel;
  const pauseSeconds = Math.max(0, batches - 1) * Math.round(pauseMs / 1000);
  const etaSeconds = processingSeconds + pauseSeconds;
  const formatEta = (s: number): string => {
    if (s < 60) return `~${Math.ceil(s)}s`;
    if (s < 3600) return `~${Math.ceil(s / 60)}m`;
    const h = Math.floor(s / 3600);
    const m = Math.ceil((s % 3600) / 60);
    return `~${h}h${m > 0 ? ` ${m}m` : ''}`;
  };

  const handleValidate = async () => {
    if (!hasApiProvider) {
      setResult({
        success: false,
        message: 'Please configure an API provider (OpenAI) in Sync settings before validating.'
      });
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const validationResult = await onValidateAll.apply(null, [] as any) as any;

      if (validationResult.success && validationResult.updatedModels) {
        setResult({
          success: true,
          message: `Successfully validated and updated ${validationResult.updatedModels.length} models!`
        });

        // Auto-close after 2 seconds on success
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: validationResult.error || 'Validation failed with unknown error'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide specific guidance for common errors
      let userMessage = errorMessage;
      if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('429')) {
        userMessage = 'Rate limit exceeded. Please wait a few minutes and try again, or try validating fewer models at once.';
      } else if (errorMessage.includes('Payment required') || errorMessage.includes('402')) {
        userMessage = 'API billing issue. Please check your OpenAI account billing and usage limits.';
      } else if (errorMessage.includes('authentication failed') || errorMessage.includes('401')) {
        userMessage = 'API key issue. Please check your OpenAI API key in Sync settings.';
      } else if (errorMessage.includes('API access forbidden') || errorMessage.includes('403')) {
        userMessage = 'API permissions issue. Your API key may not have access to the required models.';
      }

      setResult({
        success: false,
        message: userMessage
      });
    } finally {
      setIsValidating(false);
    }
  };

  const bgModal = 'bg-black border-zinc-800';
  const textPrimary = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
  const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
  const bgInput = 'border border-zinc-700 bg-zinc-900/60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-md rounded-2xl border ${bgModal} shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-300 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-6 text-violet-500" />
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              Validate Model Data
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`rounded-xl ${bgInput} p-2 hover:opacity-80 transition-opacity`}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className={`text-sm ${textSecondary}`}>
            <p>Use AI to fill in missing fields and correct obvious issues.</p>
          </div>

          {/* Batch controls (auto-disabled in single mode) */}
          <div className={`rounded-lg border p-3 ${'border-zinc-800 bg-black'}`}>
            <div className="text-xs font-medium mb-2">Batch settings</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Models per batch</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={batchSize}
                  onChange={e => setBatchSize(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                  disabled={hybridMode === 'single'}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm ${hybridMode === 'single' ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Pause between batches (seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={Math.round(pauseMs / 1000)}
                  onChange={e => setPauseMs(Math.max(0, Math.min(600, Number(e.target.value) || 0)) * 1000)}
                  disabled={hybridMode === 'single'}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm ${hybridMode === 'single' ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs mb-1">Max batches this run (0 = unlimited)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={maxBatches}
                  onChange={e => setMaxBatches(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                  disabled={hybridMode === 'single'}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm ${hybridMode === 'single' ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>
              {hybridMode === 'single' && (
                <div className="col-span-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Batch settings are disabled. This run will use a single request (auto-selected).
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-lg ${hybridMode === 'single' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/40' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40'} border p-3`}>
            <div className={`text-xs ${hybridMode === 'single' ? 'text-green-800 dark:text-green-400' : 'text-blue-800 dark:text-blue-400'}`}>
              Mode: {hybridMode === 'single' ? 'Single request (auto) — fastest' : 'Batches (auto) — reliable & cost-aware'}
            </div>
            <div className={`text-[10px] mt-1 ${hybridMode === 'single' ? 'text-green-700 dark:text-green-400/80' : 'text-blue-700 dark:text-blue-400/80'}`}>
              ~{estimatedTokensFull.toLocaleString()} tokens • {models.length} models
            </div>
          </div>

          {/* Removed extra model-count hint to avoid duplication */}

          {incompleteCount > 0 && (
            <div className="rounded-lg border p-3 ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'}">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-violet-500 mt-0.5" />
                <div className="flex-1 text-sm">
                  <div className={`${textPrimary}`}>{incompleteCount} models need validation</div>
                  <div className={`text-xs mt-1 ${textSecondary}`}>
                    Suggested: {suggestedBatchSize} per batch • ~{Math.ceil(incompleteCount / suggestedBatchSize)} batches • ETA {formatEta(etaSeconds)}
                    {estCostUsd !== undefined && providerKey && modelName && (
                      <>
                        {' '}• Max cost ({pricingTier}): {formatCurrency(estCostUsd, currency)} ({providerKey}:{modelName})
                      </>
                    )}
                  </div>
                  {providerKey === 'openai' && (
                    <div className={`text-[11px] mt-2 ${textSecondary}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="opacity-80">Optimized pricing:</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-100 text-[10px]">
                          {pricingTier}
                        </span>
                        <a className="underline hover:opacity-80" href="https://platform.openai.com/docs/pricing?latest-pricing=" target="_blank" rel="noreferrer">Pricing</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!hasApiProvider && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-500" />
                <span className="text-sm font-medium text-red-800 dark:text-red-400">
                  No API provider configured
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Please add your OpenAI API key in Sync settings
              </p>
            </div>
          )}

          {result && (
            <div className={`rounded-lg border p-3 ${result.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
              }`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="size-4 text-green-500" />
                ) : (
                  <AlertTriangle className="size-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${result.success
                    ? 'text-green-800 dark:text-green-400'
                    : 'text-red-800 dark:text-red-400'
                  }`}>
                  {result.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-300 dark:border-zinc-700 flex justify-between items-center gap-3">
          <div className={`text-[11px] ${textSecondary}`}>
            {isBusy ? 'Validation running…' : 'Ready'}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={!isBusy}
                className={`px-3 py-1.5 rounded-lg ${isBusy ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-zinc-800/50 text-zinc-400 cursor-not-allowed'} transition-colors text-sm`}
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${theme === 'dark'
                  ? 'border-zinc-700 text-white bg-black hover:bg-zinc-800'
                  : 'border-zinc-300 text-black bg-white hover:bg-gray-50'
                } text-sm`}
            >
              Close
            </button>
            <button
              onClick={async () => {
                setIsValidating(true);
                setResult(null);
                try {
                  const res = await onValidateAll({ batchSize, pauseMs, maxBatches: maxBatches || undefined } as any);
                  if (res?.success) {
                    setResult({ success: true, message: 'Validation started in background' });
                    setTimeout(() => { onClose(); }, 800);
                  } else {
                    setResult({ success: false, message: res?.error || 'Validation failed to start' });
                  }
                } catch (error: any) {
                  setResult({ success: false, message: error?.message || 'Validation failed to start' });
                } finally {
                  setIsValidating(false);
                }
              }}
              disabled={isValidating || !hasApiProvider}
              className="px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
            >
              {isValidating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isValidating ? 'Starting…' : 'Start in Background'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

