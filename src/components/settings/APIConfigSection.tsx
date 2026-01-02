import React, { useContext, useState, useEffect } from 'react';
import { Server, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Check, Download, Plus } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';

export function APIConfigSection() {
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const apiProviders = [
    {
      key: 'ollama',
      name: 'Ollama (Local)',
      models: [],
      showBaseUrl: true,
      defaultBaseUrl: 'http://127.0.0.1:11434',
      isLocal: true
    },
    {
      key: 'anthropic',
      name: 'Anthropic',
      models: [
        { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      ],
      showBaseUrl: false,
      defaultBaseUrl: 'https://api.anthropic.com/v1'
    },
    {
      key: 'openai',
      name: 'OpenAI',
      models: [
        { value: 'gpt-4o', label: 'GPT-4o (Multimodal)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
      ],
      showBaseUrl: true,
      defaultBaseUrl: 'https://api.openai.com/v1'
    },
    {
      key: 'google',
      name: 'Google',
      models: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
      ],
      showBaseUrl: false,
      defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta'
    },
    {
      key: 'deepseek',
      name: 'DeepSeek',
      models: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' },
      ],
      showBaseUrl: true,
      defaultBaseUrl: 'https://api.deepseek.com/v1'
    },
    {
      key: 'perplexity',
      name: 'Perplexity',
      models: [
        { value: 'sonar-pro', label: 'Sonar Pro' },
        { value: 'sonar', label: 'Sonar' },
        { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
        { value: 'sonar-deep-research', label: 'Sonar Deep Research' },
      ],
      showBaseUrl: true,
      defaultBaseUrl: 'https://api.perplexity.ai'
    },
    {
      key: 'openrouter',
      name: 'OpenRouter',
      models: [
        { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
        { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
        { value: 'meta-llama/llama-3-70b-instruct', label: 'Meta Llama 3 70B' },
      ],
      showBaseUrl: true,
      defaultBaseUrl: 'https://openrouter.ai/api/v1'
    },
    {
      key: 'cohere',
      name: 'Cohere',
      models: [
        { value: 'command-r-plus', label: 'Command R+' },
        { value: 'command-r', label: 'Command R' },
        { value: 'command', label: 'Command' },
      ],
      showBaseUrl: false, // Cohere has specific endpoints but usually fixed
      defaultBaseUrl: 'https://api.cohere.com/v1'
    }
  ];


  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});
  const [fetchError, setFetchError] = useState<Record<string, string>>({});
  const [fetchedModels, setFetchedModels] = useState<Record<string, { value: string; label: string }[]>>({});
  const [customProviderName, setCustomProviderName] = useState('');
  const [customProviderBaseUrl, setCustomProviderBaseUrl] = useState('');
  const [customProviderProtocol, setCustomProviderProtocol] = useState<'openai' | 'anthropic' | 'google' | 'ollama'>('openai');
  const [customProviderHeaders, setCustomProviderHeaders] = useState('');

  // Local state for API keys (buffered before save)
  const [localApiKeys, setLocalApiKeys] = useState<Record<string, string>>({});

  // Merge static and custom providers
  const allProviders = [...apiProviders];
  if (settings.apiConfig) {
    Object.entries(settings.apiConfig).forEach(([key, config]) => {
      if ((config as any).isCustom && !apiProviders.find(p => p.key === key)) {
        allProviders.push({
          key,
          name: (config as any).name || key,
          models: [],
          showBaseUrl: true,
          defaultBaseUrl: (config as any).baseUrl || ''
        });
      }
    });
  }

  const handleAddCustomProvider = () => {
    if (!customProviderName) return;
    const key = customProviderName.toLowerCase().replace(/\s+/g, '_');

    if (settings.apiConfig?.[key]) {
      alert('Provider already exists!');
      return;
    }

    let parsedHeaders = {};
    try {
      if (customProviderHeaders) {
        parsedHeaders = JSON.parse(customProviderHeaders);
      }
    } catch (e) {
      alert('Invalid JSON format for Headers. Please check syntax.');
      return;
    }

    saveSettings({
      apiConfig: {
        ...settings.apiConfig,
        [key]: {
          enabled: true,
          name: customProviderName,
          baseUrl: customProviderBaseUrl,
          isCustom: true,
          protocol: customProviderProtocol,
          headers: parsedHeaders,
          apiKey: '',
          model: '',
          cachedModels: []
        }
      }
    });
    setCustomProviderName('');
    setCustomProviderBaseUrl('');
    setCustomProviderProtocol('openai');
    setCustomProviderHeaders('');
  };

  const handleDeleteCustomProvider = (key: string) => {
    const newConfig = { ...settings.apiConfig };
    delete newConfig[key];
    saveSettings({ apiConfig: newConfig });
  };

  const bgCard = 'border-border bg-card text-text';
  const bgInput = 'border-border bg-input text-text';



  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const updateApiConfig = (provider: string, field: string, value: any) => {
    saveSettings({
      apiConfig: {
        ...settings.apiConfig,
        [provider]: {
          ...settings.apiConfig?.[provider as keyof typeof settings.apiConfig],
          [field]: value
        }
      }
    });
  };

  // Initialize fetched models from settings
  useEffect(() => {
    if (settings.apiConfig) {
      const initialModels: Record<string, { value: string; label: string }[]> = {};
      Object.entries(settings.apiConfig).forEach(([key, config]) => {
        if ((config as any).cachedModels) {
          initialModels[key] = (config as any).cachedModels;
        }
      });
      setFetchedModels(prev => ({ ...prev, ...initialModels }));
    }
  }, [settings.apiConfig]);

  const hasLocalKey = (provider: string) => {
    const config = settings.apiConfig?.[provider as keyof typeof settings.apiConfig];
    // Ollama doesn't strictly need a key, so we can relax this for 'ollama' protocol
    if (config?.protocol === 'ollama') return true;
    return !!(config?.apiKey && config.apiKey.trim() !== '');
  };

  // Get list of providers with valid API keys (or no key needed)
  const availableProviders = allProviders.filter(provider => {
    const config = settings.apiConfig?.[provider.key as keyof typeof settings.apiConfig];
    return config?.enabled && hasLocalKey(provider.key);
  });

  const fetchModels = async (providerKey: string, newApiKey?: string) => {
    const config = settings.apiConfig?.[providerKey as keyof typeof settings.apiConfig];
    if (!config) return;

    // Use provided key or stored key
    const apiKeyToUse = newApiKey !== undefined ? newApiKey : config.apiKey;

    // Check key unless protocol allows none
    if (!apiKeyToUse && config.protocol !== 'ollama' && providerKey !== 'ollama') {
      setFetchError(prev => ({ ...prev, [providerKey]: 'API Key required' }));
      return;
    }

    setFetchingModels(prev => ({ ...prev, [providerKey]: true }));
    setFetchError(prev => ({ ...prev, [providerKey]: '' }));

    try {
      const providerInfo = apiProviders.find(p => p.key === providerKey);
      let baseUrl = config.baseUrl || providerInfo?.defaultBaseUrl || '';
      // Ensure no trailing slash for consistent appending
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      };

      // Determine protocol
      // Default to 'openai' if 'other' is selected, as it's the most common "custom" format
      let protocol = config.protocol || (['anthropic', 'google', 'ollama'].includes(providerKey) ? providerKey : 'openai');
      if (protocol === 'other') protocol = 'openai';

      let allModels: any[] = [];

      if (protocol === 'anthropic') {
        headers['x-api-key'] = apiKeyToUse || '';
        headers['anthropic-version'] = '2023-06-01';
        const params = new URLSearchParams();
        params.append('limit', '100');
        const url = `${baseUrl}/models?${params.toString()}`;
        const result = await window.electronAPI?.proxyRequest?.({ url, method: 'GET', headers });
        if (!result?.success) throw new Error(result?.error || 'Fetch failed');
        if (result.data.data) allModels = result.data.data;

      } else if (protocol === 'google') {
        const params = new URLSearchParams();
        if (apiKeyToUse) params.append('key', apiKeyToUse);
        params.append('pageSize', '100');
        const url = `${baseUrl}/models?${params.toString()}`;
        const googleHeaders = { ...headers }; // Ensure no auth header from other protocols
        const result = await window.electronAPI?.proxyRequest?.({ url, method: 'GET', headers: googleHeaders });
        if (!result?.success) throw new Error(result?.error || 'Fetch failed');
        if (result.data.models) allModels = result.data.models;

      } else if (protocol === 'ollama') {
        // Ollama native API
        const url = `${baseUrl}/api/tags`; // Standard Ollama endpoint
        const result = await window.electronAPI?.proxyRequest?.({ url, method: 'GET', headers });
        if (!result?.success) throw new Error(result?.error || 'Fetch failed');
        // Response: { models: [ { name: 'llama2', ... } ] }
        if (result.data.models) allModels = result.data.models;

      } else {
        // OpenAI Compatible (default)
        if (apiKeyToUse) headers['Authorization'] = `Bearer ${apiKeyToUse}`;
        const url = `${baseUrl}/models`;
        const result = await window.electronAPI?.proxyRequest?.({ url, method: 'GET', headers });
        if (!result?.success) throw new Error(result?.error || 'Fetch failed');

        if (Array.isArray(result.data)) {
          allModels = result.data;
        } else if (result.data.data && Array.isArray(result.data.data)) {
          allModels = result.data.data;
        } else {
          // Fallback for some proxies that might return { models: [...] }
          allModels = result.data.models || [];
          console.warn('Unexpected response format:', result.data);
        }
      }

      // Normalize to { value, label }
      let modelList = allModels.map(m => {
        // Anthropic: id, display_name
        // Google: name (models/...), display_name
        // OpenAI: id
        // Ollama: name
        let id = m.id || m.name;
        // Clean Google ids
        if (id && id.startsWith('models/')) id = id.replace('models/', '');

        return {
          value: id,
          label: m.display_name || m.displayName || id // Fallback to ID if no name
        };
      });

      // Filter out empty IDs
      modelList = modelList.filter(m => m.value);

      // Unique by value
      modelList = Array.from(new Map(modelList.map(item => [item.value, item])).values());

      // Sort
      modelList.sort((a, b) => a.label.localeCompare(b.label));

      if (modelList.length > 0) {
        setFetchedModels(prev => ({ ...prev, [providerKey]: modelList }));

        // Save to settings for persistence
        saveSettings({
          apiConfig: {
            ...settings.apiConfig,
            [providerKey]: {
              ...config,
              cachedModels: modelList,
              apiKey: apiKeyToUse // Save the key if verification succeeded
            }
          }
        });

        console.log(`[API] Successfully fetched and cached ${modelList.length} models for ${providerKey}`);
      } else {
        throw new Error('No models found in response');
      }

    } catch (err: any) {
      console.error(`Error fetching models for ${providerKey}:`, err);
      setFetchError(prev => ({ ...prev, [providerKey]: err.message || 'Error fetching models' }));
    } finally {
      setFetchingModels(prev => ({ ...prev, [providerKey]: false }));
      // Clear local key state if successful (it's now in settings) 
      // or keep it if failed? Actually, keep it so user can edit. 
      // If success, we sync from settings, so local state is redundant if we clear it.
      // But we need to know whether to show local or settings.
      // If we clear local, UI reverts to settings. Perfect.
      if (newApiKey !== undefined) {
        // Only clear if no error?
        // We can't easily know here if we threw, because catch block handles it.
        // But saveSettings happened inside try.
        // Let's rely on the fact that if we saved, settings updated.
      }
    }
  };

  // Specific handler for Ollama status check
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'checking' | 'running' | 'down'>('unknown');
  const [ollamaModelCount, setOllamaModelCount] = useState<number>(0);

  const checkOllamaStatus = async (baseUrl: string) => {
    setOllamaStatus('checking');
    try {
      // Clean URL
      const cleanUrl = baseUrl.replace(/\/$/, '');
      const result = await window.electronAPI?.proxyRequest?.({
        url: `${cleanUrl}/api/tags`,
        method: 'GET'
      });

      if (result?.success) {
        setOllamaStatus('running');
        setOllamaModelCount(result.data.models?.length || 0);
        // Also update cached models list
        if (result.data.models) {
          const modelList = result.data.models.map((m: any) => ({
            value: m.name,
            label: m.name
          }));
          setFetchedModels(prev => ({ ...prev, ollama: modelList }));

          // Update settings cache too
          const oldConfig = settings.apiConfig?.ollama || {};
          saveSettings({
            apiConfig: {
              ...settings.apiConfig,
              ollama: {
                ...oldConfig,
                cachedModels: modelList
              }
            }
          });
        }
      } else {
        setOllamaStatus('down');
      }
    } catch (e) {
      console.error('Ollama check failed:', e);
      setOllamaStatus('down');
    }
  };

  // Effect to auto-check Ollama if enabled
  useEffect(() => {
    if (settings.apiConfig?.ollama?.enabled) {
      checkOllamaStatus(settings.apiConfig.ollama.baseUrl || 'http://127.0.0.1:11434');
    }
  }, [settings.apiConfig?.ollama?.enabled]);

  const handleApiKeyChange = (key: string, value: string) => {
    setLocalApiKeys(prev => ({ ...prev, [key]: value }));
    // Clear error when typing
    if (fetchError[key]) setFetchError(prev => ({ ...prev, [key]: '' }));
  };

  const handleSaveApiKey = (key: string) => {
    const val = localApiKeys[key];
    if (val === undefined) return;
    fetchModels(key, val)
      .then(() => {
        // On success, clear local state so input falls back to saved settings
        setLocalApiKeys(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .catch(() => { }); // Error handled in fetchModels
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Server size={20} className="text-zinc-500" />
          API Configuration
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full uppercase">Alpha</span>
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Configure LLM API keys for AI-powered validation and enrichment.
        </p>
      </div>

      {/* Discovery Configuration */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <h4 className="font-medium text-base">AI Model Discovery</h4>
            <p className="text-sm text-zinc-500 mt-1">
              Use configured LLMs to automatically discover, validate, and classify new models from unstructured sources.
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={settings.dataSources?.llmDiscovery ?? false}
              onChange={(e) => saveSettings({
                dataSources: {
                  ...settings.dataSources,
                  llmDiscovery: e.target.checked
                }
              })}
              className="sr-only"
            />
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${settings.dataSources?.llmDiscovery
              ? 'bg-accent border-accent'
              : 'border-zinc-600 group-hover:border-zinc-500'
              }`}>
              {settings.dataSources?.llmDiscovery && <Check size={14} strokeWidth={3} className="text-white" />}
            </div>
          </div>
        </label>
      </div>

      {/* Preferred Provider Selection - only show if multiple providers are available */}
      {availableProviders.length > 1 && (
        <div className={`rounded-xl border p-4 ${bgCard}`}>
          <div className="mb-3">
            <h4 className="font-medium mb-1">Preferred Model Provider</h4>
            <div className="text-xs text-zinc-500 mb-2">
              Select which provider to use for automated validation.
            </div>
            <ThemedSelect
              value={settings.preferredModelProvider || availableProviders[0]?.key || ''}
              onChange={(value) => saveSettings({ preferredModelProvider: value })}
              options={availableProviders.map(p => ({
                value: p.key,
                label: p.name
              }))}
              ariaLabel="Preferred model provider"
            />
          </div>
        </div>
      )}


      {allProviders.map((provider) => {
        const config = settings.apiConfig?.[provider.key as keyof typeof settings.apiConfig];
        const isEnabled = config?.enabled ?? false;
        const showKey = showApiKeys[provider.key] ?? false;
        const modelsList = fetchedModels[provider.key] || provider.models;
        const isCustom = (config as any)?.isCustom;
        const protocol = (config as any)?.protocol || 'openai';

        return (
          <div key={provider.key} className={`rounded-xl border p-4 ${bgCard}`}>
            <div className="flex items-center justify-between mb-4">
              <label
                htmlFor={`enable-${provider.key}`}
                className="flex items-center gap-3 cursor-pointer flex-1 select-none group"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    id={`enable-${provider.key}`}
                    checked={isEnabled}
                    onChange={(e) => updateApiConfig(provider.key, 'enabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isEnabled
                    ? 'bg-accent border-accent'
                    : 'border-zinc-600 group-hover:border-zinc-500'
                    }`}>
                    {isEnabled && <Check size={14} strokeWidth={3} className="text-white" />}
                  </div>
                </div>
                <div>
                  <h4 className={`font-medium text-lg transition-colors ${isEnabled ? 'text-white' : 'text-zinc-400'}`}>
                    {provider.name}
                    {isCustom && <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">Custom</span>}
                    {(provider as any).isLocal && <span className="ml-2 text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded font-mono">Run Locally</span>}
                  </h4>
                  {isCustom && <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{protocol}</div>}
                </div>
              </label>
              {isCustom && (
                <button
                  onClick={() => handleDeleteCustomProvider(provider.key)}
                  className="text-red-500 hover:text-red-400 text-sm px-3 py-1"
                >
                  Delete
                </button>
              )}
            </div>

            {isEnabled && (
              <div className="space-y-4">

                {/* Special Hand-Holding for Ollama Setup */}
                {(provider as any).isLocal && (
                  <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-300">Service Status</span>
                      <div className="flex items-center gap-2">
                        {ollamaStatus === 'checking' && <span className="text-xs text-yellow-500 animate-pulse">Checking...</span>}
                        {ollamaStatus === 'running' && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Running</span>}
                        {ollamaStatus === 'down' && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} /> Not Detected</span>}
                        <button
                          onClick={() => checkOllamaStatus(config?.baseUrl || 'http://127.0.0.1:11434')}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
                          title="Check again"
                        >
                          <RefreshCw size={12} className={ollamaStatus === 'checking' ? 'animate-spin' : ''} />
                        </button>
                        {/* Debug / verification tools */}
                        <div className="flex border-l border-zinc-700 pl-2 ml-1 gap-1">
                          <button
                            onClick={() => setOllamaStatus('down')}
                            className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded"
                            title="Debug: Simulate 'Not Installed' state"
                          >
                            Sim Missing
                          </button>
                          <button
                            onClick={() => { setOllamaStatus('running'); setOllamaModelCount(0); }}
                            className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded"
                            title="Debug: Simulate 'No Models' state"
                          >
                            Sim Empty
                          </button>
                        </div>
                      </div>
                    </div>

                    {ollamaStatus === 'down' && (
                      <div className="text-sm text-zinc-400 mb-2 p-2 bg-red-900/10 border border-red-900/30 rounded">
                        <p className="mb-2">Ollama does not appear to be running.</p>
                        <button
                          onClick={() => window.electronAPI?.openExternal('https://ollama.com/download')}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
                        >
                          Download Installer <Download size={12} />
                        </button>
                        <p className="mt-2 text-xs opacity-70">Install it, run it, then click refresh above.</p>
                      </div>
                    )}

                    {ollamaStatus === 'running' && ollamaModelCount === 0 && (
                      <div className="text-sm text-zinc-400 mb-2 p-2 bg-yellow-900/10 border border-yellow-900/30 rounded">
                        <p className="mb-2 text-yellow-500">Service is running but no models found!</p>
                        <p className="text-xs mb-2">You need a model for translation/validation.</p>
                        <div className="bg-black/50 p-2 rounded border border-zinc-700 font-mono text-xs select-all text-zinc-300 mb-2">
                          ollama pull llama3
                        </div>
                        <p className="text-xs opacity-70">Copy the command above, run it in your Terminal/Powershell, wait for download, then refresh here.</p>
                      </div>
                    )}

                    {ollamaStatus === 'running' && ollamaModelCount > 0 && (
                      <div className="text-xs text-green-500/80 mb-2">
                        ✅ Connected to local instance with {ollamaModelCount} available models.
                      </div>
                    )}
                  </div>
                )}

                {/* ... API Key input ... */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    API Key
                    {protocol === 'ollama' && <span className="text-zinc-500 font-normal ml-2">(Optional for Ollama)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={localApiKeys[provider.key] !== undefined ? localApiKeys[provider.key] : (config?.apiKey || '')}
                      onChange={(e) => handleApiKeyChange(provider.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveApiKey(provider.key);
                      }}
                      placeholder={`Enter ${provider.name} API key`}
                      className={`w-full rounded-lg border ${bgInput} px-3 py-2 pr-24 text-sm ${localApiKeys[provider.key] !== undefined ? 'border-violet-500 ring-1 ring-violet-500' : ''}`}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {localApiKeys[provider.key] !== undefined && (
                        <button
                          type="button"
                          onClick={() => handleSaveApiKey(provider.key)}
                          disabled={fetchingModels[provider.key]}
                          className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded shadow-sm mr-1 disabled:opacity-50"
                        >
                          {fetchingModels[provider.key] ? 'Verifying...' : 'Save'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility(provider.key)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ... Model input ... */}
                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ThemedSelect
                        value={config?.model || ''}
                        onChange={(val) => updateApiConfig(provider.key, 'model', val)}
                        options={modelsList?.length > 0 ? modelsList : [{ value: '', label: 'No models fetched' }]}
                        placeholder="Select model"
                        ariaLabel="Model selection"
                      />
                    </div>
                    <button
                      onClick={() => {
                        // This effectively validates and saves the key if a new one is typed
                        const localKey = localApiKeys[provider.key];
                        if (localKey !== undefined) {
                          handleSaveApiKey(provider.key);
                        } else {
                          fetchModels(provider.key);
                          // Also refresh status for Ollama
                          if ((provider as any).isLocal) checkOllamaStatus(config?.baseUrl || 'http://127.0.0.1:11434');
                        }
                      }}
                      disabled={fetchingModels[provider.key] || ((!config?.apiKey && !localApiKeys[provider.key]) && protocol !== 'ollama')}
                      className={`px-3 rounded-lg border flex items-center gap-2 transition-colors ${fetchingModels[provider.key]
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-800'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                        }`}
                      title="Fetch available models from API (also validates and saves API Key)"
                    >
                      <RefreshCw size={16} className={fetchingModels[provider.key] ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  {/* ... Fetch status ... */}
                  {fetchError[provider.key] && (
                    <div className="mt-1 flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle size={12} />
                      <span>{fetchError[provider.key]}</span>
                    </div>
                  )}
                  {fetchedModels[provider.key] && !fetchError[provider.key] && (
                    <div className="mt-1 flex items-center gap-1 text-green-500 text-xs">
                      <CheckCircle size={12} />
                      <span>Fetched {fetchedModels[provider.key].length} models</span>
                    </div>
                  )}
                </div>

                {/* ... Base URL input ... */}
                {((provider as any).showBaseUrl || isCustom) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Base URL</label>
                    <input
                      type="text"
                      value={config?.baseUrl || (provider as any).defaultBaseUrl}
                      onChange={(e) => updateApiConfig(provider.key, 'baseUrl', e.target.value)}
                      placeholder={(provider as any).defaultBaseUrl || "https://api.example.com/v1"}
                      className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Custom Provider Form */}
      <div className={`rounded-xl border p-4 ${bgCard} border-dashed border-zinc-700`}>
        <div className="mb-4">
          <h4 className="font-medium flex items-center gap-2 mb-1">
            <Plus size={16} /> Add Unlisted or Custom Provider
          </h4>
          <p className="text-xs text-zinc-500">
            Don't see your provider listed? Connect to any other compatible API or your own local/private server (e.g. Ollama, LocalAI).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Provider Name</label>
            <input
              type="text"
              value={customProviderName}
              onChange={(e) => setCustomProviderName(e.target.value)}
              placeholder="e.g. LocalAI, Ollama"
              className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Protocol / API Format</label>
            <ThemedSelect
              value={customProviderProtocol}
              onChange={(val) => setCustomProviderProtocol(val as any)}
              options={[
                { value: 'openai', label: 'Standard / OpenAI Compatible' },
                { value: 'anthropic', label: 'Anthropic Compatible' },
                { value: 'ollama', label: 'Ollama Native' },
                { value: 'google', label: 'Google Gemini' },
                { value: 'other', label: 'Other / Custom (Generic)' }
              ]}
              ariaLabel="Protocol"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Base URL</label>
            <input
              type="text"
              value={customProviderBaseUrl}
              onChange={(e) => setCustomProviderBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Custom Headers <span className="text-zinc-500 font-normal text-xs">(Optional JSON)</span>
            </label>
            <textarea
              value={customProviderHeaders}
              onChange={(e) => setCustomProviderHeaders(e.target.value)}
              placeholder={'{\n  "X-Custom-Auth": "secret",\n  "Organization": "my-org"\n}'}
              className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm font-mono h-16`}
            />
          </div>
        </div>
        <button
          onClick={handleAddCustomProvider}
          disabled={!customProviderName}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium border border-zinc-700"
        >
          Add Custom Provider
        </button>
      </div>

    </div>
  );
}