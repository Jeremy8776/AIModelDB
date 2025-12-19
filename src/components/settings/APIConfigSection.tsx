import React, { useContext, useState } from 'react';
import { Zap, Eye, EyeOff } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';

export function APIConfigSection() {
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const bgCard = 'border-zinc-800 bg-black';
  const bgInput = 'border-zinc-700 bg-zinc-900/60';

  const apiProviders = [
    {
      key: 'anthropic',
      name: 'Anthropic',
      models: [
        { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
        { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
        { value: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
      ]
    },
    {
      key: 'openai',
      name: 'OpenAI',
      models: [
        { value: 'gpt-4o', label: 'GPT-4o (Multimodal)' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Affordable)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ]
    },
    {
      key: 'google',
      name: 'Google',
      models: [
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
      ]
    },
    {
      key: 'deepseek',
      name: 'DeepSeek',
      models: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ]
    }
  ];

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

  const hasLocalKey = (provider: string) => {
    const config = settings.apiConfig?.[provider as keyof typeof settings.apiConfig];
    return !!(config?.apiKey && config.apiKey.trim() !== '');
  };

  // Get list of providers with valid API keys
  const availableProviders = apiProviders.filter(provider => {
    const config = settings.apiConfig?.[provider.key as keyof typeof settings.apiConfig];
    return hasLocalKey(provider.key) && config?.enabled;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Zap size={20} className="text-zinc-500" />
          API Configuration
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Configure your API keys for LLM providers. These are used for model validation and enrichment.
        </p>
      </div>

      {/* Preferred Provider Selection - only show if multiple providers are available */}
      {availableProviders.length > 1 && (
        <div className={`rounded-xl border p-4 ${bgCard}`}>
          <div className="mb-3">
            <h4 className="font-medium mb-1">Preferred Model Provider</h4>
            <p className="text-xs text-zinc-500">
              Select which provider to use for model validation and enrichment when multiple API keys are configured.
            </p>
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
      )}

      {apiProviders.map((provider) => {
        const config = settings.apiConfig?.[provider.key as keyof typeof settings.apiConfig];
        const isEnabled = config?.enabled ?? false;
        const showKey = showApiKeys[provider.key] ?? false;

        return (
          <div key={provider.key} className={`rounded-xl border p-4 ${bgCard}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-medium">{provider.name}</h4>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => updateApiConfig(provider.key, 'enabled', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>

            {isEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={config?.apiKey || ''}
                      onChange={(e) => updateApiConfig(provider.key, 'apiKey', e.target.value)}
                      placeholder={`Enter ${provider.name} API key`}
                      className={`w-full rounded-lg border ${bgInput} px-3 py-2 pr-12 text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility(provider.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <ThemedSelect
                    value={config?.model || provider.models[0]?.value || ''}
                    onChange={(value) => updateApiConfig(provider.key, 'model', value)}
                    options={provider.models}
                    ariaLabel={`${provider.name} model`}
                  />
                </div>

                {provider.key === 'openai' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Base URL</label>
                    <input
                      type="text"
                      value={config?.baseUrl || 'https://api.openai.com/v1'}
                      onChange={(e) => updateApiConfig(provider.key, 'baseUrl', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}