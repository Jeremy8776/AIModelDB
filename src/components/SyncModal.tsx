import React, { useContext, useState, useEffect } from "react";
import { X, Wrench, Check, ServerCrash, Clock, RefreshCw, AlarmClock, Download, Database, Palette, Shield, Settings, FileText, Zap } from "lucide-react";
import { ApiDir, ProviderKey, Domain, ProviderCfg } from "../types";
import { ThemedSelect } from "./ThemedSelect";
import ThemeContext from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { CURRENCY_NAMES, CURRENCY_SYMBOLS, CurrencyCode } from '../utils/currency';
import { globalRateLimiter, createRateLimiter } from '../services/rateLimiter';


interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (options?: {
    autoRefresh?: { enabled: boolean, interval: number, unit: string },
    minDownloadsBypass?: number,
    systemPrompt?: string,
    apiConfig?: ApiDir
  }) => void;
  addConsoleLog: (msg: string) => void;
}

export function SyncModal({ isOpen, onClose, onSync, addConsoleLog }: SyncModalProps) {
  // Sync status for button feedback
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  // Console log state for API requests/responses
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  // State declarations - ALL useState hooks must be defined here
  const [config, setConfig] = useState<ApiDir>({
    openai: { enabled: false, apiKey: "", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    anthropic: { enabled: false, apiKey: "", model: "claude-3-opus-20240229" },
    deepseek: { enabled: false, apiKey: "", model: "deepseek-chat" },
    perplexity: { enabled: false, apiKey: "", model: "sonar-medium-online" },
    openrouter: { enabled: false, apiKey: "", model: "mistralai/mistral-large" },
    cohere: { enabled: false, apiKey: "", model: "command-r-plus" },
    google: { enabled: false, apiKey: "", model: "gemini-1.0-pro" },
    artificialanalysis: { enabled: false, apiKey: "", endpoints: [] }
  });

  const [systemPrompt, setSystemPrompt] = useState("");
  const [autoRefresh, setAutoRefresh] = useState({
    enabled: false,
    interval: 24, // hours
    unit: "hours" as "minutes" | "hours" | "days"
  });
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [minDownloadsBypass, setMinDownloadsBypass] = useState<number>(500);
  const [syncing, setSyncing] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<Array<{ name: string; ok: boolean; status?: number; note?: string }>>([]);




  // Default system prompt for all domains
  const defaultSystemPrompt = `You are an AI research assistant. Find newly released or significantly updated AI models and summarize key metadata.

Domain catalog (grouped):
LLM: LLM
Multimodal Language: VLM
Vision (CV): Vision
Image Generation: ImageGen, LoRA (image), FineTune (image)
Video Generation: VideoGen, LoRA (video), FineTune (video)
Audio: Audio, ASR, TTS
3D: 3D
Simulation/World: World/Sim
Background Removal: BackgroundRemoval
Upscaling/Super-Resolution: Upscaler
Other: Other

Cover multiple groups above. Prioritize license terms, parameters (e.g., 7B), context window (e.g., 128K), release/update dates, and availability (weights/API).

Return ONLY a JSON array of model objects:
[
  {
    "name": "ModelName",
    "provider": "Author/Org",
    "domain": "LLM|VLM|Vision|ImageGen|VideoGen|Audio|ASR|TTS|3D|World/Sim|LoRA|FineTune|BackgroundRemoval|Upscaler|Other",
    "source": "HuggingFace|GitHub|CivitAI|ModelScope|Replicate|Other",
    "url": "https://model-page",
    "repo": "https://repo",
    "description": "1-2 sentence summary",
    "license": {"name": "MIT|Apache-2.0|GPL|AGPL|LGPL|CC-BY-NC|CC0|OpenRAIL|Proprietary", "type": "OSI|Copyleft|Non-Commercial|Custom|Proprietary", "commercial_use": true},
    "updated_at": "YYYY-MM-DD",
    "release_date": "YYYY-MM-DD",
    "tags": ["..."],
    "parameters": "7B|70B|...",
    "context_window": "8K|128K|...",
    "hosting": {"weights_available": true, "api_available": true, "on_premise_friendly": true}
  }
]`;

  // Load settings from context
  useEffect(() => {
    setConfig(settings.apiConfig);
    setMinDownloadsBypass(settings.minDownloadsBypass);
    setAutoRefresh(settings.autoRefresh);
    // Use default prompt if settings doesn't have one
    setSystemPrompt(settings.systemPrompt || defaultSystemPrompt);
  }, [settings]);



  // Update provider configuration
  const updateProvider = (key: ProviderKey, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Test API connection (OpenAI only)
  const testConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus("testing");
    setMessage("Testing connection...");
    setConsoleLogs([]);

    let key = 'openai';
    let provider = config.openai;
    try {
      // Prefer proxy route when available to avoid CORS and to surface in-app fetch logs
      const useProxy = !provider.baseUrl;
      const url = useProxy ? '/openai-api/models' : `${provider.baseUrl}/models`;
      addConsoleLog && addConsoleLog(`[TEST OpenAI] GET ${url}`);
      const resp = await fetch(url, {
        headers: { "Authorization": `Bearer ${provider.apiKey}` }
      });
      addConsoleLog && addConsoleLog(`[TEST OpenAI] Status ${resp.status}`);
      const text = await resp.text();
      addConsoleLog && addConsoleLog(`[TEST OpenAI] Body ${text.slice(0, 300)}`);
      if (!resp.ok) throw new Error(resp.statusText);

      // Success
      setStatus("success");
      setMessage("OpenAI connection successful");
    } catch (err: any) {
      addConsoleLog && addConsoleLog(`[TEST OpenAI] ERROR: ${err?.message || err}`);
      setStatus("error");
      setMessage(`OpenAI connection failed: ${err.message}`);
    }
  };

  // Connectivity diagnostics for main providers via proxy
  const runDiagnostics = async () => {
    setDiagRunning(true);
    const out: Array<{ name: string; ok: boolean; status?: number; note?: string }> = [];
    try {
      // HuggingFace
      try {
        const r = await fetch('/huggingface-api/models?limit=1');
        out.push({ name: 'HuggingFace', ok: r.ok, status: r.status, note: r.ok ? 'OK' : 'Failed' });
      } catch (e: any) {
        out.push({ name: 'HuggingFace', ok: false, note: e?.message || 'error' });
      }

      // OpenAI models (requires key)
      try {
        const url = '/openai-api/models';
        const r = await fetch(url, { headers: { Authorization: `Bearer ${config.openai.apiKey || ''}` } });
        out.push({ name: 'OpenAI', ok: r.ok, status: r.status, note: r.ok ? 'OK' : 'Auth/Access' });
      } catch (e: any) {
        out.push({ name: 'OpenAI', ok: false, note: e?.message || 'error' });
      }
      // ArtificialAnalysis (API test)
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (settings.artificialAnalysisApiKey) {
          headers['x-api-key'] = settings.artificialAnalysisApiKey;
        }
        const r = await fetch('/aa-api/v2/data/llms/models', { headers });
        const status = r.ok ? 'OK (API)' : r.status === 401 ? 'Invalid API Key' : r.status === 429 ? 'Rate Limited' : 'Failed';
        out.push({ name: 'ArtificialAnalysis', ok: r.ok, status: r.status, note: status });
      } catch (e: any) {
        out.push({ name: 'ArtificialAnalysis', ok: false, note: e?.message || 'error' });
      }
    } finally {
      setDiagResults(out);
      setDiagRunning(false);
    }
  };

  // Handle sync
  const handleSync = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSyncing(true);
    setSyncStatus('syncing');
    if (typeof addConsoleLog === 'function') {
      addConsoleLog('SyncModal: Started live sync');
    }
    const options = {
      autoRefresh: {
        enabled: autoRefresh.enabled,
        interval: autoRefresh.interval,
        unit: autoRefresh.unit
      },
      minDownloadsBypass: minDownloadsBypass,
      systemPrompt: systemPrompt,
      apiConfig: config
    };
    // Wrap onSync in a promise to handle status
    Promise.resolve(onSync(options))
      .then(() => {
        setSyncing(false);
        setSyncStatus('done');
        if (typeof addConsoleLog === 'function') {
          addConsoleLog('SyncModal: Sync complete');
        }
        setTimeout(() => setSyncStatus('idle'), 2000);
      })
      .catch((err) => {
        setSyncing(false);
        setSyncStatus('error');
        if (typeof addConsoleLog === 'function') {
          addConsoleLog('SyncModal: Sync error: ' + (err?.message || err));
        }
        setTimeout(() => setSyncStatus('idle'), 3000);
      });
  };

  // Save settings to context
  const handleSaveSettings = () => {
    saveSettings({
      apiConfig: config,
      minDownloadsBypass,
      autoRefresh,
      systemPrompt,
      currency: settings.currency,
      showCostValidation: settings.showCostValidation,
    });
    if (typeof addConsoleLog === 'function') {
      addConsoleLog('SyncModal: Saved settings');
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // Styling - forced dark mode with visible borders
  const bgInput = "border border-zinc-700 bg-zinc-900/60";
  const btnPrimary = theme === "dark"
    ? "px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg"
    : "px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg";
  const btnSecondary = theme === "dark"
    ? "px-4 py-2 border border-zinc-700 rounded-lg hover:bg-accent text-white"
    : "px-4 py-2 border border-gray-200 rounded-lg hover:bg-accent text-white";

  // Don't render if the modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 border-zinc-800 bg-black" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={18} />
            <h3 className="text-base font-semibold">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className={`rounded-xl ${bgInput} px-3 py-1 text-xs`}
          >
            Close
          </button>
        </div>
        <div className="space-y-4">
          {/* 1. SYSTEM HEALTH */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Zap size={18} className="text-green-500" />
                System Health
              </h4>
              <button
                onClick={runDiagnostics}
                disabled={diagRunning}
                className={`text-xs px-3 py-1 rounded-md ${diagRunning ? 'opacity-60' : ''} ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {diagRunning ? 'Checking…' : 'Run Diagnostics'}
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              Check connectivity to all data sources and API providers.
            </p>
            {diagResults.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {diagResults.map(r => (
                  <div key={r.name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-300'}`}>
                    <span>{r.name}</span>
                    <span className={`${r.ok ? 'text-green-500' : 'text-red-500'}`}>{r.ok ? 'OK' : (r.status || r.note || 'Error')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. DATA SOURCES */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Data Sources
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Enable or disable specific data sources for model discovery.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="sourceHuggingFace"
                  type="checkbox"
                  checked={settings.dataSources?.huggingface ?? true}
                  onChange={(e) => saveSettings({
                    dataSources: { ...settings.dataSources, huggingface: e.target.checked }
                  })}
                />
                <label htmlFor="sourceHuggingFace" className="text-sm">🤗 Hugging Face API</label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="sourceArtificialAnalysis"
                    type="checkbox"
                    checked={settings.dataSources?.artificialanalysis ?? true}
                    onChange={(e) => saveSettings({
                      dataSources: { ...settings.dataSources, artificialanalysis: e.target.checked }
                    })}
                  />
                  <label htmlFor="sourceArtificialAnalysis" className="text-sm">📊 Artificial Analysis API</label>
                </div>
                {settings.dataSources?.artificialanalysis && (
                  <div className="ml-6 space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">API Key:</label>
                    <input
                      type="password"
                      value={settings.artificialAnalysisApiKey || ""}
                      onChange={(e) => saveSettings({ artificialAnalysisApiKey: e.target.value })}
                      placeholder="aa_..."
                      className={`w-full rounded-lg ${bgInput} px-2 py-1 text-xs font-mono`}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Get your free API key from <a href="https://artificialanalysis.ai/documentation" target="_blank" rel="noopener" className="text-blue-500 hover:underline">Artificial Analysis</a>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="sourceLLMDiscovery"
                  type="checkbox"
                  checked={settings.dataSources?.llmDiscovery ?? true}
                  onChange={(e) => saveSettings({
                    dataSources: { ...settings.dataSources, llmDiscovery: e.target.checked }
                  })}
                />
                <label htmlFor="sourceLLMDiscovery" className="text-sm">🤖 LLM Discovery</label>
              </div>

              {/* Additional Data Sources */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Additional Sources</h5>

                <div className="flex items-center gap-2">
                  <input
                    id="sourceCivitai"
                    type="checkbox"
                    checked={settings.dataSources?.civitai ?? true}
                    onChange={(e) => saveSettings({
                      dataSources: { ...settings.dataSources, civitai: e.target.checked }
                    })}
                  />
                  <label htmlFor="sourceCivitai" className="text-sm">🖼️ CivitaiArchive (UK-Accessible Generative AI)</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="sourceOpenModelDB"
                    type="checkbox"
                    checked={settings.dataSources?.openmodeldb ?? false}
                    onChange={(e) => saveSettings({
                      dataSources: { ...settings.dataSources, openmodeldb: e.target.checked }
                    })}
                  />
                  <label htmlFor="sourceOpenModelDB" className="text-sm">🗂️ OpenModelDB <span className="text-xs text-yellow-600 dark:text-yellow-400">[Beta]</span></label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="sourceCivitasBay"
                    type="checkbox"
                    checked={settings.dataSources?.civitasbay ?? true}
                    onChange={(e) => saveSettings({
                      dataSources: { ...settings.dataSources, civitasbay: e.target.checked }
                    })}
                  />
                  <label htmlFor="sourceCivitasBay" className="text-sm">🏴‍☠️ CivitasBay (Torrent Preservation)</label>
                </div>
              </div>
              <hr className="my-3 border-gray-300 dark:border-gray-600" />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoMergeDuplicates"
                  checked={settings.autoMergeDuplicates}
                  onChange={(e) => saveSettings({ autoMergeDuplicates: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="autoMergeDuplicates" className="text-sm">
                  Auto-merge near-duplicate models during import
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Uses fuzzy name/provider matching to consolidate variants like "FLUX.1 Pro" vs "FLUX.1 [pro]".
              </p>
            </div>
          </div>

          {/* 3. VALIDATION SETTINGS */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Shield size={18} className="text-purple-500" />
              Validation Settings
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Configure model validation batch processing and behavior.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Batch size</label>
                <div className="min-w-[140px] w-full max-w-[200px]">
                  <ThemedSelect
                    value={String(settings.validationBatchSize ?? 50)}
                    onChange={(v) => saveSettings({ validationBatchSize: Number(v) })}
                    options={[
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                      { value: '200', label: '200' }
                    ]}
                    ariaLabel="Validation batch size"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Timeout (seconds)</label>
                <div className="min-w-[140px] w-full max-w-[200px]">
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={Math.floor((settings.validationTimeout ?? 60000) / 1000)}
                    onChange={(e) => saveSettings({ validationTimeout: Number(e.target.value) * 1000 })}
                    className={`rounded-lg ${bgInput} px-2 py-1.5 w-full text-sm`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Retry attempts</label>
                <div className="min-w-[140px] w-full max-w-[200px]">
                  <ThemedSelect
                    value={String(settings.validationRetries ?? 3)}
                    onChange={(v) => saveSettings({ validationRetries: Number(v) })}
                    options={[
                      { value: '1', label: '1' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3' },
                      { value: '5', label: '5' }
                    ]}
                    ariaLabel="Validation retry attempts"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="validationAutoSave"
                  type="checkbox"
                  checked={settings.validationAutoSave ?? true}
                  onChange={(e) => saveSettings({ validationAutoSave: e.target.checked })}
                />
                <label htmlFor="validationAutoSave" className="text-sm">Auto-save progress during validation</label>
              </div>
            </div>
          </div>

          {/* 4. AUTO-REFRESH */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <AlarmClock size={18} className="text-violet-500" />
              Auto-Refresh Configuration
            </h4>
            <div className="flex items-center justify-between mb-4">
              <span>Enable automatic refresh</span>
              <div className="flex items-center">
                <span className="text-sm mr-2">{autoRefresh.enabled ? 'Enabled' : 'Disabled'}</span>
                <button
                  className={`w-10 h-5 rounded-full transition-colors ${autoRefresh.enabled ? 'bg-violet-500' : theme === 'dark' ? 'bg-zinc-600' : 'bg-gray-300'
                    }`}
                  onClick={() => setAutoRefresh(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${autoRefresh.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}></div>
                </button>
              </div>
            </div>

            {autoRefresh.enabled && (
              <div className="flex items-center gap-2">
                <span>Every</span>
                <input
                  type="number"
                  min="1"
                  value={autoRefresh.interval}
                  onChange={(e) => setAutoRefresh(prev => ({
                    ...prev,
                    interval: Math.max(1, parseInt(e.target.value) || 1)
                  }))}
                  className={`w-20 rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
                <div className="min-w-[140px] w-full">
                  <ThemedSelect
                    value={autoRefresh.unit}
                    onChange={(v) => setAutoRefresh(prev => ({ ...prev, unit: v as any }))}
                    options={["minutes", "hours", "days"]}
                    ariaLabel="Auto refresh unit"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. FILTERING & DISPLAY */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Palette size={18} className="text-pink-500" />
              Display & Filtering
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Configure how models are displayed and filtered.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Downloads threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minDownloadsBypass}
                    onChange={(e) => setMinDownloadsBypass(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-20 rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                  />
                  <span className="text-sm">downloads minimum</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Default page size</label>
                <div className="min-w-[140px] w-full max-w-[200px]">
                  <ThemedSelect
                    value={String(settings.defaultPageSize ?? 0)}
                    onChange={(v) => {
                      const num = v === '0' ? null : Number(v);
                      saveSettings({ defaultPageSize: num });
                    }}
                    options={[{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '0', label: 'All' }]}
                    ariaLabel="Default page size"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="showAdvancedFilters"
                  type="checkbox"
                  checked={settings.showAdvancedFilters ?? false}
                  onChange={(e) => saveSettings({ showAdvancedFilters: e.target.checked })}
                />
                <label htmlFor="showAdvancedFilters" className="text-sm">Show advanced filter options by default</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="compactMode"
                  type="checkbox"
                  checked={settings.compactMode ?? false}
                  onChange={(e) => saveSettings({ compactMode: e.target.checked })}
                />
                <label htmlFor="compactMode" className="text-sm">Compact table view</label>
              </div>
            </div>
          </div>

          {/* 6. CURRENCY & COSTS */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Download size={18} className="text-green-500" />
              Currency & Cost Display
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Currency</label>
                <ThemedSelect
                  value={settings.currency}
                  onChange={(v) => saveSettings({ currency: v as CurrencyCode })}
                  options={Object.entries(CURRENCY_NAMES).map(([code, name]) => ({ value: code, label: `${CURRENCY_SYMBOLS[code as CurrencyCode]} ${name} (${code})` }))}
                  ariaLabel="Display currency"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  All model costs will be converted to this currency for display
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showCostValidation"
                  checked={settings.showCostValidation}
                  onChange={(e) => saveSettings({ showCostValidation: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="showCostValidation" className="text-sm">
                  Enable cost validation and fact-checking
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Show validation indicators (✓ or ⚠️) next to model costs to indicate pricing accuracy
              </p>
            </div>
          </div>


          {/* 7. NOTIFICATIONS & UX */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Settings size={18} className="text-indigo-500" />
              Notifications & User Experience
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Configure notifications, toasts, and interface behavior.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  id="showImportToast"
                  type="checkbox"
                  checked={settings.showImportToast}
                  onChange={(e) => saveSettings({ showImportToast: e.target.checked })}
                />
                <label htmlFor="showImportToast" className="text-sm">Show import completion toast</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="showConsoleButton"
                  type="checkbox"
                  checked={settings.showConsoleButton}
                  onChange={(e) => saveSettings({ showConsoleButton: e.target.checked })}
                />
                <label htmlFor="showConsoleButton" className="text-sm">Show floating API console button</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="autoExpandSections"
                  type="checkbox"
                  checked={settings.autoExpandSections ?? true}
                  onChange={(e) => saveSettings({ autoExpandSections: e.target.checked })}
                />
                <label htmlFor="autoExpandSections" className="text-sm">Auto-expand collapsible sections</label>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm min-w-[140px]">Export format</label>
                <div className="min-w-[140px] w-full max-w-[200px]">
                  <ThemedSelect
                    value={settings.exportFormat ?? 'json'}
                    onChange={(v) => saveSettings({ exportFormat: v as any })}
                    options={[
                      { value: 'json', label: 'JSON' },
                      { value: 'csv', label: 'CSV' },
                      { value: 'xlsx', label: 'Excel' }
                    ]}
                    ariaLabel="Export format"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="backupBeforeSync"
                  type="checkbox"
                  checked={settings.backupBeforeSync ?? false}
                  onChange={(e) => saveSettings({ backupBeforeSync: e.target.checked })}
                />
                <label htmlFor="backupBeforeSync" className="text-sm">Create backup before sync operations</label>
              </div>
            </div>
          </div>

          {/* 8. CORPORATE SAFETY */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Shield size={18} className="text-red-500" />
              Corporate Safety & Content Filtering
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Automatic filtering to ensure all content meets corporate standards and compliance requirements.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableNSFWFiltering"
                  checked={settings.enableNSFWFiltering ?? true}
                  onChange={(e) => saveSettings({ enableNSFWFiltering: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enableNSFWFiltering" className="text-sm font-medium">
                  🛡️ Enable NSFW Content Filtering
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Automatically filters out models with explicit, adult, or inappropriate content.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="nsfwFilteringStrict"
                  checked={settings.nsfwFilteringStrict ?? true}
                  onChange={(e) => saveSettings({ nsfwFilteringStrict: e.target.checked })}
                  className="rounded"
                  disabled={!settings.enableNSFWFiltering}
                />
                <label htmlFor="nsfwFilteringStrict" className="text-sm">
                  🔒 Strict Corporate Mode
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Applies aggressive filtering with lower tolerance thresholds for corporate environments.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="logNSFWAttempts"
                  checked={settings.logNSFWAttempts ?? true}
                  onChange={(e) => saveSettings({ logNSFWAttempts: e.target.checked })}
                  className="rounded"
                  disabled={!settings.enableNSFWFiltering}
                />
                <label htmlFor="logNSFWAttempts" className="text-sm">
                  📊 Log Blocked Content
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Log details of blocked content for compliance auditing and monitoring.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>⚠️ Corporate Notice:</strong> Content filtering is enabled by default for workplace safety.
                  High-risk sources (CivitAI, Tensor.art, CivitasBay) undergo additional screening.
                </p>
              </div>
            </div>
          </div>

          {/* 9. SYSTEM PROMPT */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <FileText size={18} className="text-yellow-500" />
              System Prompt
            </h4>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              This prompt tells the AI what to look for across all model domains and how to format the results.
            </p>
            <div className="flex flex-col gap-2">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className={`rounded-lg ${bgInput} px-2 py-1.5 w-full min-h-32 font-mono text-xs`}
                rows={8}
                placeholder="System prompt will appear here..."
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setSystemPrompt(defaultSystemPrompt)}
                  className={`text-xs px-3 py-1 rounded-lg ${theme === 'dark' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>

          {/* 9. API CONFIGURATION */}
          <div className={`rounded-xl border p-4 border-zinc-800 bg-black`}>
            <h4 className="mb-3 font-medium flex items-center gap-2">
              <Wrench size={18} className="text-red-500" />
              API Configuration
            </h4>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Configure API keys and models for validation and discovery services.
            </p>
            <div className="border rounded-lg p-3" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">OpenAI</h4>
                <div className="flex items-center">
                  <span className="text-sm mr-2">{config.openai.enabled ? 'Enabled' : 'Disabled'}</span>
                  <button
                    className={`w-10 h-5 rounded-full transition-colors ${config.openai.enabled ? 'bg-violet-500' : theme === 'dark' ? 'bg-zinc-600' : 'bg-gray-300'
                      }`}
                    onClick={() => updateProvider('openai', 'enabled', !config.openai.enabled)}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${config.openai.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}></div>
                  </button>
                </div>
              </div>
              {config.openai.enabled && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm mb-1">API Key</label>
                    <input
                      type="password"
                      value={config.openai.apiKey || ''}
                      onChange={(e) => updateProvider('openai', 'apiKey', e.target.value)}
                      className={`rounded-lg ${bgInput} px-2 py-1.5 text-sm w-full`}
                      placeholder={`Enter OpenAI API key`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Model</label>
                    <ThemedSelect
                      value={config.openai.model || ''}
                      onChange={(v) => updateProvider('openai', 'model', v)}
                      options={[
                        { value: "gpt-5", label: "gpt-5" },
                        { value: "gpt-5-mini", label: "gpt-5-mini" },
                        { value: "gpt-4o-mini", label: "gpt-4o-mini (fast, low-cost)" },
                        { value: "gpt-4o", label: "gpt-4o (multimodal)" },
                        { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
                        { value: "gpt-4.1", label: "gpt-4.1" },
                        { value: "o3-mini", label: "o3-mini (reasoning)" },
                        { value: "o4-mini", label: "o4-mini (reasoning)" }
                      ]}
                      ariaLabel="OpenAI model"
                    />
                    <p className="text-[11px] mt-1 text-zinc-500">Tip: We auto-omit temperature for models that only allow the default.</p>
                    <p className="text-[11px] mt-1 text-zinc-500">Web search is supported via the app's built-in search/scrape pipeline regardless of model; choose the LLM for synthesis.</p>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Base URL (optional)</label>
                    <input
                      type="text"
                      value={config.openai.baseUrl || ''}
                      onChange={(e) => updateProvider('openai', 'baseUrl', e.target.value)}
                      className={`rounded-lg ${bgInput} px-2 py-1.5 text-sm w-full`}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status message */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${status === 'success' ? 'text-green-700 dark:bg-green-900/20 dark:text-green-400' :
              status === 'error' ? 'text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                'text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
              }`}>
              {status === 'success' ? <Check size={18} /> :
                status === 'error' ? <ServerCrash size={18} /> :
                  <RefreshCw size={18} className="animate-spin" />}
              {message}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <button
            className={`rounded-xl ${bgInput} px-4 py-2 text-sm flex items-center gap-1`}
            onClick={testConnection}
          >
            <Wrench size={16} />
            Test Connection
          </button>
          <div className="flex gap-2">
            <button
              className={`rounded-xl ${bgInput} px-4 py-2 text-sm`}
              onClick={onClose}
            >
              Close
            </button>
            <button
              className={`rounded-xl ${bgInput} px-4 py-2 text-sm flex items-center gap-1`}
              onClick={handleSaveSettings}
              disabled={settingsSaved}
            >
              {settingsSaved ? <Check size={16} className="text-green-600 animate-bounce" /> : null}
              {settingsSaved ? 'Saved!' : 'Save Settings'}
            </button>
            {/* Live Sync action removed per requirements */}
          </div>
        </div>
      </div>
    </div>
  );
}

