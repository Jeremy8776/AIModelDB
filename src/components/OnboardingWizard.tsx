import React, { useState, useContext, useEffect } from 'react';
import { Database, Key, CheckCircle, ArrowRight, ArrowLeft, X, Zap } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ThemedSelect } from './ThemedSelect';
import { handleExternalLink } from '../utils/external-links';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
    const { theme } = useContext(ThemeContext);
    const { settings, saveSettings } = useSettings();
    const [step, setStep] = useState(1);
    const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({
        huggingface: true,
        github: true,
        artificialanalysis: true,
        civitai: true,
        openmodeldb: true,
        civitasbay: true,
        llmDiscovery: true,
    });
    const [apiKeys, setApiKeys] = useState({
        artificialAnalysisApiKey: '',
        gitHubToken: '',
    });
    const [llmApiKeys, setLlmApiKeys] = useState<Record<string, string>>({});
    const [availableLLMProviders, setAvailableLLMProviders] = useState<Array<{ key: string; name: string; model: string }>>([]);
    const [selectedLLMProvider, setSelectedLLMProvider] = useState<string>('');

    useBodyScrollLock(isOpen);

    // Check for configured LLM API keys in local settings
    useEffect(() => {
        const checkLocalKeys = () => {
            const providers: Array<{ key: string; name: string; model: string }> = [];

            const apiConfig = settings.apiConfig;
            if (apiConfig?.anthropic?.apiKey && apiConfig.anthropic.enabled) {
                providers.push({ key: 'anthropic', name: 'Anthropic (Claude)', model: apiConfig.anthropic.model || 'claude-3-5-sonnet-20241022' });
            }
            if (apiConfig?.openai?.apiKey && apiConfig.openai.enabled) {
                providers.push({ key: 'openai', name: 'OpenAI (GPT)', model: apiConfig.openai.model || 'gpt-4o-mini' });
            }
            if (apiConfig?.google?.apiKey && apiConfig.google.enabled) {
                providers.push({ key: 'google', name: 'Google (Gemini)', model: apiConfig.google.model || 'gemini-1.5-flash' });
            }
            if (apiConfig?.deepseek?.apiKey && apiConfig.deepseek.enabled) {
                providers.push({ key: 'deepseek', name: 'DeepSeek', model: apiConfig.deepseek.model || 'deepseek-chat' });
            }

            setAvailableLLMProviders(providers);
            if (providers.length > 0 && !selectedLLMProvider) {
                setSelectedLLMProvider(providers[0].key);
            }
        };

        if (isOpen) {
            checkLocalKeys();
        }
    }, [isOpen, settings.apiConfig, selectedLLMProvider]);

    if (!isOpen) return null;

    const bgModal = 'border-border bg-bg text-text';
    const bgCard = 'border-border bg-card text-text';
    const bgInput = 'border-border bg-input text-text';

    const dataSources = [
        { key: 'huggingface', label: 'HuggingFace', description: 'Popular open-source models', requiresKey: false },
        { key: 'github', label: 'GitHub', description: 'AI repositories and projects', requiresKey: true, keyUrl: 'https://github.com/settings/tokens' },
        { key: 'artificialanalysis', label: 'Artificial Analysis', description: 'Model benchmarks', requiresKey: true, keyUrl: 'https://artificialanalysis.ai/documentation' },
        { key: 'civitai', label: 'Civitai', description: 'Community AI models', requiresKey: false },
        { key: 'openmodeldb', label: 'OpenModelDB', description: 'Open model database', requiresKey: false },
        { key: 'civitasbay', label: 'CivitasBay', description: 'AI model marketplace', requiresKey: false },
        { key: 'llmDiscovery', label: 'LLM Discovery', description: 'AI-powered discovery', requiresKey: false },
    ];

    const sourcesRequiringKeys = dataSources.filter(s => s.requiresKey && selectedSources[s.key]);

    const handleComplete = () => {
        // Build updated apiConfig with any new LLM keys
        const updatedApiConfig = { ...settings.apiConfig };

        Object.entries(llmApiKeys).forEach(([provider, apiKey]) => {
            if (apiKey) {
                const existing = updatedApiConfig[provider as keyof typeof updatedApiConfig] || {};
                (updatedApiConfig as any)[provider] = {
                    ...existing,
                    apiKey,
                    enabled: true,
                };
            }
        });

        // Save selected data sources and API keys
        saveSettings({
            dataSources: selectedSources as any,
            artificialAnalysisApiKey: apiKeys.artificialAnalysisApiKey,
            gitHubToken: apiKeys.gitHubToken,
            apiConfig: updatedApiConfig,
        });
        onComplete();
    };

    const toggleSource = (key: string) => {
        setSelectedSources(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={(e) => e.stopPropagation()}>
            <div className={`w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border ${bgModal} shadow-2xl`} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Database size={24} className="text-accent" />
                        <div>
                            <h2 className="text-xl font-semibold">Welcome to Model Database</h2>
                            <p className="text-sm text-zinc-500">Let's set up your data sources</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 hover:bg-zinc-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 pt-4">
                    <div className="flex items-center justify-center">
                        {/* Step 1 */}
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 1 ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                1
                            </div>
                            <span className="text-xs text-zinc-500 mt-2">Sources</span>
                        </div>
                        <div className={`h-1 w-12 mx-2 ${step >= 2 ? 'bg-accent' : 'bg-zinc-800'}`} />
                        {/* Step 2 */}
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 2 ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                2
                            </div>
                            <span className="text-xs text-zinc-500 mt-2">API Keys</span>
                        </div>
                        <div className={`h-1 w-12 mx-2 ${step >= 3 ? 'bg-accent' : 'bg-zinc-800'}`} />
                        {/* Step 3 */}
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 3 ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                3
                            </div>
                            <span className="text-xs text-zinc-500 mt-2">LLM</span>
                        </div>
                        <div className={`h-1 w-12 mx-2 ${step >= 4 ? 'bg-accent' : 'bg-zinc-800'}`} />
                        {/* Step 4 */}
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step >= 4 ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                4
                            </div>
                            <span className="text-xs text-zinc-500 mt-2">Done</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
                    {/* Step 1: Select Data Sources */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Select Data Sources</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Choose which platforms you want to sync models from. You can change this later in settings.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {dataSources.map((source) => {
                                    const isSelected = selectedSources[source.key];
                                    return (
                                        <button
                                            key={source.key}
                                            onClick={() => toggleSource(source.key)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${isSelected
                                                ? 'border-accent bg-accent/10'
                                                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-semibold text-sm flex items-center gap-2 ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                        {source.label}
                                                        {source.requiresKey && (
                                                            <span className="text-[10px] text-zinc-500">(optional key)</span>
                                                        )}
                                                    </div>
                                                    <div className={`text-xs mt-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        {source.description}
                                                    </div>
                                                </div>
                                                <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'border-accent bg-accent'
                                                    : 'border-zinc-500'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: API Keys (Optional) */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">API Keys (Optional)</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    {sourcesRequiringKeys.length > 0
                                        ? 'These sources work without keys but API tokens can increase rate limits. You can skip this step.'
                                        : 'None of your selected sources need API keys. Click Next to continue.'}
                                </p>
                            </div>

                            {sourcesRequiringKeys.length > 0 ? (
                                <div className="space-y-4">
                                    {sourcesRequiringKeys.map((source) => (
                                        <div key={source.key} className={`rounded-xl border p-4 ${bgCard}`}>
                                            <div className="flex items-start gap-3 mb-3">
                                                <Key size={20} className="text-accent mt-0.5" />
                                                <div className="flex-1">
                                                    <h4 className="font-medium">{source.label}</h4>
                                                    <p className="text-sm text-zinc-500 mt-1">
                                                        {source.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {source.key === 'github' && (
                                                <>
                                                    <input
                                                        type="password"
                                                        value={apiKeys.gitHubToken}
                                                        onChange={(e) => setApiKeys({ ...apiKeys, gitHubToken: e.target.value })}
                                                        placeholder="ghp_..."
                                                        className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm font-mono mb-2`}
                                                    />
                                                    <p className="text-xs text-zinc-500">
                                                        Optional - increases rate limit from 60 to 5000 requests/hour.{' '}
                                                        <a
                                                            href={source.keyUrl}
                                                            onClick={(e) => handleExternalLink(e, source.keyUrl!)}
                                                            className="text-accent hover:underline cursor-pointer"
                                                        >
                                                            Get token
                                                        </a>
                                                    </p>
                                                </>
                                            )}

                                            {source.key === 'artificialanalysis' && (
                                                <>
                                                    <input
                                                        type="password"
                                                        value={apiKeys.artificialAnalysisApiKey}
                                                        onChange={(e) => setApiKeys({ ...apiKeys, artificialAnalysisApiKey: e.target.value })}
                                                        placeholder="aa_..."
                                                        className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm font-mono mb-2`}
                                                    />
                                                    <p className="text-xs text-zinc-500">
                                                        Optional - enables benchmark data.{' '}
                                                        <a
                                                            href={source.keyUrl}
                                                            onClick={(e) => handleExternalLink(e, source.keyUrl!)}
                                                            className="text-accent hover:underline cursor-pointer"
                                                        >
                                                            Get free key
                                                        </a>
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`rounded-xl border p-6 ${bgCard} text-center`}>
                                    <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                                    <p className="text-sm text-zinc-500">
                                        All selected sources are ready to use!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: AI Validation - LLM API Keys */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    AI Validation
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full uppercase">Alpha</span>
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Add an LLM API key to enable AI-powered validation. This is optional and experimental.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { key: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...', model: 'Claude' },
                                    { key: 'openai', name: 'OpenAI', placeholder: 'sk-...', model: 'GPT-4' },
                                    { key: 'google', name: 'Google', placeholder: 'AIza...', model: 'Gemini' },
                                    { key: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...', model: 'DeepSeek' },
                                ].map((provider) => {
                                    const hasKey = !!(llmApiKeys[provider.key] || settings.apiConfig?.[provider.key as keyof typeof settings.apiConfig]?.apiKey);
                                    return (
                                        <div
                                            key={provider.key}
                                            className={`p-4 rounded-lg border-2 transition-all duration-200 ${hasKey
                                                ? 'border-accent bg-accent/10'
                                                : 'border-zinc-700 bg-zinc-900/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`font-semibold text-sm ${hasKey ? 'text-white' : 'text-zinc-200'}`}>
                                                    {provider.name}
                                                </div>
                                                {hasKey && (
                                                    <CheckCircle size={16} className="text-green-500" />
                                                )}
                                            </div>
                                            <div className={`text-xs mb-2 ${hasKey ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                {provider.model}
                                            </div>
                                            <input
                                                type="password"
                                                value={llmApiKeys[provider.key] || ''}
                                                onChange={(e) => setLlmApiKeys(prev => ({ ...prev, [provider.key]: e.target.value }))}
                                                placeholder={provider.placeholder}
                                                className={`w-full rounded border ${bgInput} px-2 py-1.5 text-xs font-mono`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-zinc-600 text-center mt-4">
                                You can skip this step and add API keys later in Settings.
                            </p>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="text-center py-8">
                                <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
                                <p className="text-sm text-zinc-500 mb-6">
                                    Your data sources are configured. Click "Start Syncing" to fetch models from your selected sources.
                                </p>

                                <div className={`rounded-xl border p-4 ${bgCard} text-left max-w-md mx-auto`}>
                                    <h4 className="font-medium mb-2">Selected Sources:</h4>
                                    <ul className="text-sm text-zinc-500 space-y-1">
                                        {Object.entries(selectedSources)
                                            .filter(([_, enabled]) => enabled)
                                            .map(([key]) => {
                                                const source = dataSources.find(s => s.key === key);
                                                return (
                                                    <li key={key} className="flex items-center gap-2">
                                                        <CheckCircle size={14} className="text-green-500" />
                                                        {source?.label}
                                                    </li>
                                                );
                                            })}
                                    </ul>
                                    {availableLLMProviders.length > 0 && selectedLLMProvider && (
                                        <>
                                            <h4 className="font-medium mb-2 mt-4">Validation Model:</h4>
                                            <div className="text-sm text-zinc-500">
                                                <CheckCircle size={14} className="text-green-500 inline mr-2" />
                                                {availableLLMProviders.find(p => p.key === selectedLLMProvider)?.name}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    <button
                        onClick={() => setStep(Math.max(1, step - 1))}
                        disabled={step === 1}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${step === 1
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-zinc-800'
                            }`}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
                        >
                            Skip Setup
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-accent hover:bg-accent-dark text-white transition-colors"
                            >
                                Next
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleComplete}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-accent hover:bg-accent-dark text-white transition-colors"
                            >
                                <CheckCircle size={16} />
                                Start Syncing
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
