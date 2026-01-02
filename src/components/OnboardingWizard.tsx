import React, { useState, useContext, useEffect } from 'react';
import { Database, Key, CheckCircle, ArrowRight, ArrowLeft, X, Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ThemedSelect } from './ThemedSelect';
import { handleExternalLink } from '../utils/external-links';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    initialStep?: number;
}

export function OnboardingWizard({ isOpen, onClose, onComplete, initialStep = 1 }: OnboardingWizardProps) {
    const { theme } = useContext(ThemeContext);
    const { settings, saveSettings } = useSettings();
    const [step, setStep] = useState(initialStep);

    // Reset step when modal re-opens with a new initialStep
    useEffect(() => {
        if (isOpen) {
            setStep(initialStep);
        }
    }, [isOpen, initialStep]);

    const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({
        huggingface: true,
        github: true,
        artificialanalysis: true,
        civitai: true,
        openmodeldb: true,
        civitasbay: true,
        llmDiscovery: true,
        ollamaLibrary: true,
    });

    // ... (rest of state initialization)
    const [apiKeys, setApiKeys] = useState({
        artificialAnalysisApiKey: '',
        gitHubToken: '',
    });
    const [llmApiKeys, setLlmApiKeys] = useState<Record<string, string>>({});
    const [availableLLMProviders, setAvailableLLMProviders] = useState<Array<{ key: string; name: string; model: string }>>([]);
    const [selectedLLMProvider, setSelectedLLMProvider] = useState<string>('');

    // Ollama State for Wizard
    const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'checking' | 'running' | 'down'>('unknown');
    const [ollamaModelCount, setOllamaModelCount] = useState<number>(0);
    const [ollamaModels, setOllamaModels] = useState<any[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');
    const [enableOllama, setEnableOllama] = useState(true);

    const checkOllamaStatus = async () => {
        setOllamaStatus('checking');
        try {
            const result = await window.electronAPI?.proxyRequest?.({
                url: 'http://127.0.0.1:11434/api/tags',
                method: 'GET'
            });

            if (result?.success) {
                setOllamaStatus('running');
                const models = result.data.models || [];
                setOllamaModelCount(models.length);
                setOllamaModels(models);
                if (models.length > 0 && !selectedOllamaModel) {
                    setSelectedOllamaModel(models[0].name);
                }
            } else {
                setOllamaStatus('down');
            }
        } catch (e) {
            console.error('Ollama check failed:', e);
            setOllamaStatus('down');
        }
    };

    // Auto-check Ollama when reaching the step
    useEffect(() => {
        if (step === 2 && isOpen) {
            checkOllamaStatus();
        }
    }, [step, isOpen]);

    useBodyScrollLock(isOpen);

    // Don't render if not open
    if (!isOpen) return null;

    // ... (useEffect for LLM keys)

    // ... (render logic)

    // Update Progress Indicator 
    const steps = [
        { num: 1, label: 'Sources' },
        { num: 2, label: 'Local AI' },
        { num: 3, label: 'API Keys' },
        { num: 4, label: 'Discovery' },
        { num: 5, label: 'Done' }
    ];


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
        { key: 'ollamaLibrary', label: 'Ollama Library', description: 'Top models from Ollama library', requiresKey: false },
    ];

    const sourcesRequiringKeys = dataSources.filter(s => s.requiresKey && selectedSources[s.key]);

    const handleComplete = () => {
        try {
            // Build updated apiConfig
            const updatedApiConfig = {
                ...settings.apiConfig,
                ollama: {
                    ...settings.apiConfig?.ollama,
                    enabled: enableOllama,
                    isLocal: true,
                    baseUrl: 'http://127.0.0.1:11434',
                    model: selectedOllamaModel,
                    protocol: 'ollama' as const,
                    name: 'Ollama (Local)'
                }
            };

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

            // Save selected data sources and API keys with VERSION UPGRADE
            saveSettings({
                dataSources: selectedSources as any,
                artificialAnalysisApiKey: apiKeys.artificialAnalysisApiKey,
                gitHubToken: apiKeys.gitHubToken,
                apiConfig: updatedApiConfig,
                configVersion: 2 // Mark as updated to latest version
            });
        } catch (err) {
            console.error("Error completing onboarding:", err);
        } finally {
            onComplete();
        }
    };

    const toggleSource = (key: string) => {
        setSelectedSources(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
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
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-800 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 pt-4">
                    <div className="flex items-center justify-center">
                        {steps.map((s, idx) => (
                            <React.Fragment key={s.num}>
                                <div className="flex flex-col items-center">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${step >= s.num ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {s.num}
                                    </div>
                                    <span className="text-xs text-zinc-500 mt-2">{s.label}</span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`h-1 w-8 mx-2 ${step > s.num ? 'bg-accent' : 'bg-zinc-800'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
                    {/* Step 1: Sources */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Select Data Sources</h3>
                                <p className="text-sm text-zinc-500 mb-4">Choose which platforms you want to sync models from.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {dataSources.map((source) => {
                                    const isSelected = selectedSources[source.key];
                                    return (
                                        <button
                                            key={source.key}
                                            onClick={() => toggleSource(source.key)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${isSelected ? 'border-accent bg-accent/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-semibold text-sm flex items-center gap-2 ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                        {source.label}
                                                    </div>
                                                    <div className={`text-xs mt-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{source.description}</div>
                                                </div>
                                                {isSelected && <CheckCircle size={16} className="text-accent" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Local AI (Ollama) */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    <Cpu size={20} className="text-amber-500" />
                                    Local AI Validation
                                </h3>
                                <div className="text-sm text-zinc-500 space-y-2">
                                    <p>
                                        Run models locally to translate Chinese content and validate metadata without API costs.
                                        We recommend <span className="font-semibold text-white">Ollama</span> for the best experience.
                                    </p>
                                </div>
                            </div>

                            <div className={`rounded-xl border p-4 ${bgCard}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={enableOllama}
                                                onChange={(e) => setEnableOllama(e.target.checked)}
                                                className="sr-only"
                                            />
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${enableOllama ? 'bg-accent border-accent' : 'border-zinc-600'}`}>
                                                {enableOllama && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-lg">Enable Ollama Integration</h4>
                                            <p className="text-xs text-zinc-500">Connect to local Ollama instance (127.0.0.1:11434)</p>
                                        </div>
                                    </div>
                                </div>

                                {enableOllama && (
                                    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 ml-9">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium text-zinc-300">Status Check</span>
                                            <div className="flex items-center gap-2">
                                                {ollamaStatus === 'checking' && <span className="text-xs text-yellow-500 animate-pulse">Checking...</span>}
                                                {ollamaStatus === 'running' && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Running</span>}
                                                {ollamaStatus === 'down' && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} /> Not Detected</span>}
                                                <button onClick={checkOllamaStatus} className="p-1 hover:bg-zinc-700 rounded text-zinc-400">
                                                    <RefreshCw size={14} className={ollamaStatus === 'checking' ? 'animate-spin' : ''} />
                                                </button>
                                            </div>
                                        </div>

                                        {ollamaStatus === 'running' && ollamaModelCount > 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-medium text-zinc-400 mb-1">Select Model for Validation</label>
                                                <select
                                                    value={selectedOllamaModel}
                                                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-accent"
                                                >
                                                    {ollamaModels.map((m: any) => (
                                                        <option key={m.name} value={m.name}>
                                                            {m.name} ({m.details?.parameter_size || 'Unknown'})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-zinc-500 mt-1">
                                                    This model will be used for local translation and metadata validation.
                                                </p>
                                            </div>
                                        )}

                                        {ollamaStatus === 'down' && (
                                            <div className="text-sm text-zinc-400 mb-2 p-3 bg-red-900/10 border border-red-900/30 rounded">
                                                <p className="mb-2 font-medium text-red-400">Ollama is not running or installed.</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => window.electronAPI?.openExternal('https://ollama.com/download')}
                                                        className="text-xs bg-white text-black font-semibold px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                                                    >
                                                        Download Installer
                                                    </button>
                                                    <button
                                                        onClick={checkOllamaStatus}
                                                        className="text-xs bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 transition-colors"
                                                    >
                                                        Run & Check Again
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {ollamaStatus === 'running' && ollamaModelCount === 0 && (
                                            <div className="text-sm mb-2 p-3 bg-yellow-900/10 border border-yellow-900/30 rounded text-yellow-200">
                                                <p className="mb-2 font-medium">Service running, but no models found.</p>
                                                <div className="bg-black/50 p-2 rounded border border-yellow-900/30 font-mono text-xs select-all text-zinc-300 mb-2">
                                                    ollama pull llama3
                                                </div>
                                                <p className="text-xs opacity-70">Run this in your terminal to get the recommended model.</p>
                                            </div>
                                        )}

                                        {ollamaStatus === 'running' && ollamaModelCount > 0 && (
                                            <div className="p-3 bg-green-900/10 border border-green-900/30 rounded">
                                                <div className="text-sm text-green-400 font-medium flex items-center gap-2">
                                                    <CheckCircle size={16} />
                                                    Ready to go!
                                                </div>
                                                <p className="text-xs text-green-500/70 mt-1">Found {ollamaModelCount} local models.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: API Keys (Optional) */}
                    {step === 3 && (
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

                    {/* Step 4: AI Validation - LLM API Keys */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    AI Validation
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full uppercase">Alpha</span>
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Add an LLM API key to enable AI-powered validation. This is optional and experimental.
                                </p>

                                <div className={`p-4 rounded-lg border border-zinc-700 bg-zinc-900/30 mb-4`}>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedSources.llmDiscovery}
                                                onChange={() => toggleSource('llmDiscovery')}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedSources.llmDiscovery
                                                ? 'bg-accent border-accent'
                                                : 'border-zinc-600 bg-zinc-800'
                                                }`}>
                                                {selectedSources.llmDiscovery && <CheckCircle size={12} className="text-white" />}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className={`text-sm font-medium ${selectedSources.llmDiscovery ? 'text-white' : 'text-zinc-300'}`}>
                                                Enable LLM-powered Model Discovery
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-0.5">
                                                Use AI to automatically discover and classify models from unstructured sources. Requires an API key below.
                                            </div>
                                        </div>
                                    </label>
                                </div>
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

                    {/* Step 5: Complete */}
                    {step === 5 && (
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
                                            .filter(([key, enabled]) => enabled && key !== 'llmDiscovery') // Exclude LLM toggle from sources list
                                            .map(([key]) => {
                                                const source = dataSources.find(s => s.key === key);
                                                if (!source) return null; // Skip if no matching source definition
                                                return (
                                                    <li key={key} className="flex items-center gap-2">
                                                        <CheckCircle size={14} className="text-green-500" />
                                                        {source.label} <span className="text-xs opacity-70">(Ready to Sync)</span>
                                                    </li>
                                                );
                                            })}
                                    </ul>
                                    {enableOllama && (
                                        <>
                                            <h4 className="font-medium mb-2 mt-4">Local AI Status:</h4>
                                            <div className="text-sm text-zinc-500 flex items-center gap-2">
                                                {ollamaStatus === 'running' ? (
                                                    <CheckCircle size={14} className="text-green-500" />
                                                ) : (
                                                    <AlertCircle size={14} className="text-amber-500" />
                                                )}
                                                Ollama ({ollamaStatus === 'running' ? 'Connected & Ready' : 'Not Connected'})
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

                        {step < 5 ? (
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
