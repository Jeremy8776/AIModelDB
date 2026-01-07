import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';

interface ProviderCardProps {
    providerKey: string;
    providerName: string;
    isEnabled: boolean;
    isCustom: boolean;
    protocol: string;
    apiKey: string;
    model: string;
    baseUrl: string;
    defaultBaseUrl: string;
    showBaseUrl: boolean;
    modelsList: { value: string; label: string }[];
    showKey: boolean;
    isFetching: boolean;
    fetchError: string;
    fetchedModelsCount: number | null;
    localApiKey?: string;
    onToggleEnabled: (enabled: boolean) => void;
    onApiKeyChange: (value: string) => void;
    onSaveApiKey: () => void;
    onToggleKeyVisibility: () => void;
    onModelChange: (value: string) => void;
    onBaseUrlChange: (value: string) => void;
    onFetchModels: () => void;
    onDelete?: () => void;
}

/**
 * Renders a single API provider configuration card
 * Extracted for better modularity and reusability
 */
export function ProviderCard({
    providerKey,
    providerName,
    isEnabled,
    isCustom,
    protocol,
    apiKey,
    model,
    baseUrl,
    defaultBaseUrl,
    showBaseUrl,
    modelsList,
    showKey,
    isFetching,
    fetchError,
    fetchedModelsCount,
    localApiKey,
    onToggleEnabled,
    onApiKeyChange,
    onSaveApiKey,
    onToggleKeyVisibility,
    onModelChange,
    onBaseUrlChange,
    onFetchModels,
    onDelete
}: ProviderCardProps) {
    const { t } = useTranslation();
    const { theme } = useContext(ThemeContext);

    const bgCard = 'border-border bg-card text-text';
    const bgInput = 'border-border bg-input text-text';
    const hasLocalKey = localApiKey !== undefined;
    const displayedApiKey = hasLocalKey ? localApiKey : apiKey;

    return (
        <div className={`rounded-xl border p-4 ${bgCard}`}>
            {/* Header with toggle */}
            <div className="flex items-center justify-between mb-4">
                <label
                    htmlFor={`enable-${providerKey}`}
                    className="flex items-center gap-3 cursor-pointer flex-1 select-none group"
                >
                    <div className="relative flex items-center justify-center">
                        <input
                            type="checkbox"
                            id={`enable-${providerKey}`}
                            checked={isEnabled}
                            onChange={(e) => onToggleEnabled(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isEnabled ? 'bg-accent border-accent' : 'border-zinc-600 group-hover:border-zinc-500'
                            }`}>
                            {isEnabled && <Check size={14} strokeWidth={3} className="text-white" />}
                        </div>
                    </div>
                    <div>
                        <h4 className={`font-medium text-lg transition-colors ${isEnabled ? 'text-white' : 'text-zinc-400'}`}>
                            {providerName}
                            {isCustom && (
                                <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{t('settings.apiConfig.provider.custom')}</span>
                            )}
                        </h4>
                        {isCustom && (
                            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{protocol}</div>
                        )}
                    </div>
                </label>
                {isCustom && onDelete && (
                    <button
                        onClick={onDelete}
                        className="text-red-500 hover:text-red-400 text-sm px-3 py-1"
                    >
                        {t('settings.apiConfig.provider.delete')}
                    </button>
                )}
            </div>

            {/* Configuration fields (only shown when enabled) */}
            {isEnabled && (
                <div className="space-y-4">
                    {/* API Key input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {t('settings.apiConfig.fields.apiKey')}
                            {protocol === 'ollama' && (
                                <span className="text-zinc-500 font-normal ml-2">{t('settings.apiConfig.fields.optionalForOllama')}</span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={displayedApiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveApiKey();
                                }}
                                placeholder={t('settings.apiConfig.fields.enterApiKey', { name: providerName })}
                                className={`w-full rounded-lg border ${bgInput} px-3 py-2 pr-24 text-sm ${hasLocalKey ? 'border-violet-500 ring-1 ring-violet-500' : ''
                                    }`}
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {hasLocalKey && (
                                    <button
                                        type="button"
                                        onClick={onSaveApiKey}
                                        disabled={isFetching}
                                        className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded shadow-sm mr-1 disabled:opacity-50"
                                    >
                                        {isFetching ? t('settings.apiConfig.fields.verifying') : t('settings.apiConfig.fields.save')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onToggleKeyVisibility}
                                    className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Model selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('settings.apiConfig.fields.model')}</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    list={`models-${providerKey}`}
                                    value={model}
                                    onChange={(e) => onModelChange(e.target.value)}
                                    placeholder={t('settings.apiConfig.fields.enterModelName')}
                                    className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm placeholder:text-zinc-600`}
                                />
                                <datalist id={`models-${providerKey}`}>
                                    {modelsList?.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </datalist>
                            </div>
                            <button
                                onClick={onFetchModels}
                                disabled={isFetching || (!apiKey && !localApiKey && protocol !== 'ollama')}
                                className={`px-3 rounded-lg border flex items-center gap-2 transition-colors ${isFetching
                                    ? 'bg-zinc-800 text-zinc-500 border-zinc-800'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                                    }`}
                                title={t('settings.apiConfig.fields.fetchModelsTooltip')}
                            >
                                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Fetch status */}
                        {fetchError && (
                            <div className="mt-1 flex items-center gap-1 text-red-500 text-xs">
                                <AlertCircle size={12} />
                                <span>{fetchError}</span>
                            </div>
                        )}
                        {fetchedModelsCount !== null && !fetchError && (
                            <div className="mt-1 flex items-center gap-1 text-green-500 text-xs">
                                <CheckCircle size={12} />
                                <span>{t('settings.apiConfig.fields.fetchedModels', { count: fetchedModelsCount })}</span>
                            </div>
                        )}
                    </div>

                    {/* Base URL input (if applicable) */}
                    {showBaseUrl && (
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('settings.apiConfig.fields.baseUrl')}</label>
                            <input
                                type="text"
                                value={baseUrl || defaultBaseUrl}
                                onChange={(e) => onBaseUrlChange(e.target.value)}
                                placeholder={defaultBaseUrl || "https://api.example.com/v1"}
                                className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
