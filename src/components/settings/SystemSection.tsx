import React, { useContext, useState, useEffect } from 'react';
import { Settings, Zap, Database, RefreshCw, Trash2, Info, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { isElectron, getAppVersion, getPlatform, checkForUpdates, onUpdateStatus, removeUpdateListener, UpdateStatus } from '../../utils/electron';
import { useUpdate } from '../../context/UpdateContext';

export function SystemSection() {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<Array<{ name: string, ok: boolean, status?: string }>>([]);

  const [appVersion, setAppVersion] = useState<string>('Loading...');
  const [platform, setPlatform] = useState<string>('Loading...');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isElectronApp, setIsElectronApp] = useState(false);

  useEffect(() => {
    const loadInfo = async () => {
      setIsElectronApp(isElectron());
      setAppVersion(await getAppVersion());
      setPlatform(await getPlatform());
    };
    loadInfo();

    // Subscribe to update status if in Electron
    if (isElectron()) {
      onUpdateStatus((status) => {
        setUpdateStatus(status);
        if (status.status !== 'checking-for-update') {
          setIsCheckingUpdate(false);
        }
      });
    }

    return () => {
      if (isElectron()) {
        removeUpdateListener();
      }
    };
  }, []);

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

  const handleCheckForUpdates = () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    checkForUpdates();
  };

  const getStatusMessage = () => {
    if (!updateStatus) return null;

    switch (updateStatus.status) {
      case 'checking-for-update':
        return { icon: Loader2, message: 'Checking for updates...', color: 'text-zinc-400', spin: true };
      case 'update-available':
        return { icon: Download, message: `Update available: v${updateStatus.version}`, color: 'text-accent' };
      case 'update-not-available':
        return { icon: CheckCircle, message: 'You have the latest version!', color: 'text-green-500' };
      case 'download-progress':
        return { icon: Loader2, message: `Downloading: ${Math.round(updateStatus.percent || 0)}%`, color: 'text-accent', spin: true };
      case 'update-downloaded':
        return { icon: CheckCircle, message: 'Update ready to install!', color: 'text-green-500' };
      case 'update-error':
        return { icon: AlertCircle, message: `Update error: ${updateStatus.message}`, color: 'text-red-500' };
      default:
        return null;
    }
  };

  const statusInfo = getStatusMessage();

  const handleDatabaseReset = () => {
    window.dispatchEvent(new CustomEvent('show-confirmation', {
      detail: {
        title: 'Delete DB',
        message: 'This will clear all local data including models, settings, and cache. This action cannot be undone.',
        type: 'error',
        confirmText: 'Delete DB',
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
          System health checks, application information, and maintenance tools.
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

      {/* Application Info */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Info size={18} className="text-zinc-500" />
          Application Info
        </h4>
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Version</span>
              <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{appVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Platform</span>
              <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded capitalize">{platform}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Runtime</span>
              <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                {isElectronApp ? 'Desktop (Electron)' : 'Web Browser'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Language</span>
              <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{navigator.language}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-700 dark:text-zinc-400">Status</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${navigator.onLine ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Resources</h5>
            <a
              href="https://github.com/Jeremy8776/AIModelDB"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-accent hover:underline"
            >
              GitHub Repository
            </a>
            <a
              href="https://github.com/Jeremy8776/AIModelDB/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-accent hover:underline"
            >
              Release Notes
            </a>
            <a
              href="https://github.com/Jeremy8776/AIModelDB/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-accent hover:underline"
            >
              Report an Issue
            </a>
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
              Delete DB
            </h5>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Clear all local data including models, settings, and cache. This will reset
              the application to its initial state.
            </p>
            <button
              onClick={handleDatabaseReset}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Delete DB
            </button>
          </div>
        </div>
      </div>

      {/* Updates Section - Only show in Electron */}
      {isElectronApp && (
        <UpdatesCard
          appVersion={appVersion}
          isCheckingUpdate={isCheckingUpdate}
          onCheckForUpdates={handleCheckForUpdates}
        />
      )}
    </div>
  );
}

// Updates Card Component using UpdateContext
function UpdatesCard({ appVersion, isCheckingUpdate, onCheckForUpdates }: {
  appVersion: string;
  isCheckingUpdate: boolean;
  onCheckForUpdates: () => void;
}) {
  const { updateAvailable, updateVersion, updateDownloaded, downloadProgress, downloadUpdate, installUpdate, checking, error } = useUpdate();

  const bgCard = 'border-zinc-800 bg-black';

  // If update is available but not downloaded
  if (updateAvailable && !updateDownloaded) {
    return (
      <div className={`rounded-xl border-2 border-violet-500 p-4 bg-gradient-to-br from-violet-900/20 to-black`}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-600 rounded-xl text-white">
            <Download size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-white mb-1">
              New Version Detected!
            </h4>
            <p className="text-sm text-zinc-400 mb-3">
              Version <span className="font-mono text-violet-400">{updateVersion}</span> is available.
              You are currently on <span className="font-mono text-zinc-500">{appVersion}</span>.
            </p>

            {downloadProgress !== null ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Downloading... {Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={downloadUpdate}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download size={16} />
                Download Update
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If update is downloaded and ready to install
  if (updateDownloaded) {
    return (
      <div className={`rounded-xl border-2 border-green-500 p-4 bg-gradient-to-br from-green-900/20 to-black`}>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-600 rounded-xl text-white">
            <CheckCircle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-lg text-white mb-1">
              Update Ready to Install
            </h4>
            <p className="text-sm text-zinc-400 mb-3">
              Version <span className="font-mono text-green-400">{updateVersion}</span> has been downloaded.
              Restart the application to apply the update.
            </p>
            <button
              onClick={installUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Restart & Install
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: No update available or not checked yet
  return (
    <div className={`rounded-xl border p-4 ${bgCard}`}>
      <h4 className="font-medium mb-4 flex items-center gap-2">
        <Download size={18} className="text-zinc-500" />
        Updates
      </h4>
      <div className="space-y-4">
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Check for new versions of AI Model DB Pro.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {checking && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Checking for updates...</span>
          </div>
        )}

        <button
          onClick={onCheckForUpdates}
          disabled={isCheckingUpdate || checking}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isCheckingUpdate || checking
            ? 'opacity-60 cursor-not-allowed bg-zinc-700'
            : 'bg-accent hover:bg-accent-dark text-white'
            }`}
        >
          <RefreshCw size={16} className={isCheckingUpdate || checking ? 'animate-spin' : ''} />
          {isCheckingUpdate || checking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>
    </div>
  );
}