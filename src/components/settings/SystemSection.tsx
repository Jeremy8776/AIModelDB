import React, { useContext, useState } from 'react';
import { Settings, Zap, Database, RefreshCw, Trash2 } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';

export function SystemSection() {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<Array<{ name: string, ok: boolean, status?: string }>>([]);

  const bgCard = 'border-zinc-800 bg-black';

  const runDiagnostics = async () => {
    setDiagRunning(true);

    // Simulate diagnostics
    const checks = [
      { name: 'Local Storage', check: () => typeof localStorage !== 'undefined' },
      { name: 'IndexedDB', check: () => typeof indexedDB !== 'undefined' },
      { name: 'Network', check: () => navigator.onLine },
      { name: 'API Config', check: () => !!settings.apiConfig },
    ];

    const results = checks.map(({ name, check }) => ({
      name,
      ok: check(),
      status: check() ? 'OK' : 'Error'
    }));

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setDiagResults(results);
    setDiagRunning(false);
  };

  const handleDatabaseReset = () => {
    window.dispatchEvent(new CustomEvent('show-confirmation', {
      detail: {
        title: 'Reset Database',
        message: 'This will clear all local data including models, settings, and cache. This action cannot be undone.',
        type: 'error',
        confirmText: 'Reset Database',
        onConfirm: () => {
          // Clear localStorage
          localStorage.clear();
          // Reload the page
          window.location.reload();
        }
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Settings size={20} className="text-zinc-500" />
          System & Diagnostics
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          System health checks and maintenance tools.
        </p>
      </div>

      {/* System Health */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Zap size={18} className="text-accent" />
            System Health
          </h4>
          <button
            onClick={runDiagnostics}
            disabled={diagRunning}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${diagRunning ? 'opacity-60' : ''
              } ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {diagRunning ? (
              <>
                <RefreshCw size={12} className="inline mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </button>
        </div>

        {diagResults.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {diagResults.map(r => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-lg px-3 py-2 border bg-zinc-950 border-zinc-800"
              >
                <span>{r.name}</span>
                <span className={r.ok ? 'text-green-500' : 'text-red-500'}>
                  {r.status || (r.ok ? 'OK' : 'Error')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Information */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Database size={18} className="text-zinc-500" />
          System Information
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-700 dark:text-zinc-400">User Agent:</span>
            <span className="text-xs font-mono max-w-xs truncate">
              {navigator.userAgent.split(' ')[0]}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-700 dark:text-zinc-400">Platform:</span>
            <span>{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-700 dark:text-zinc-400">Language:</span>
            <span>{navigator.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-700 dark:text-zinc-400">Online:</span>
            <span className={navigator.onLine ? 'text-green-500' : 'text-red-500'}>
              {navigator.onLine ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Trash2 size={18} className="text-zinc-500" />
          Maintenance
        </h4>
        <div className="space-y-4">
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">
              Reset Database
            </h5>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Clear all local data including models, settings, and cache. This will reset
              the application to its initial state.
            </p>
            <button
              onClick={handleDatabaseReset}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Reset Database
            </button>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-2">Application Info</h4>
        <div className="text-sm text-zinc-700 dark:text-zinc-400">
          <p className="font-semibold">Optikka Model Database</p>
          <p className="text-xs mt-1">Version 1.0.0</p>
          <p className="text-xs mt-2">Comprehensive AI model discovery and management platform</p>
        </div>
      </div>
    </div>
  );
}