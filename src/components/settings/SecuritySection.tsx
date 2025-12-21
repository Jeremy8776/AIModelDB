import React, { useContext } from 'react';
import { Shield, AlertTriangle, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';

export function SecuritySection() {
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-zinc-800 bg-black';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Shield size={20} className="text-zinc-500" />
          Security & Content Filtering
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure content filtering and security settings for workplace safety.
        </p>
      </div>

      {/* Content Filtering */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Content Filtering</h4>
        <div className="space-y-4">
          <label htmlFor="enableNSFWFiltering" className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-1">
              <input
                type="checkbox"
                id="enableNSFWFiltering"
                checked={settings.enableNSFWFiltering ?? true}
                onChange={(e) => saveSettings({ enableNSFWFiltering: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(settings.enableNSFWFiltering ?? true)
                ? 'bg-accent border-accent'
                : 'border-zinc-600 group-hover:border-zinc-500'
                }`}>
                {(settings.enableNSFWFiltering ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                Enable NSFW Content Filtering
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Automatically filter out models with adult or inappropriate content
              </p>
            </div>
          </label>

          <label htmlFor="logNSFWAttempts" className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-1">
              <input
                type="checkbox"
                id="logNSFWAttempts"
                checked={settings.logNSFWAttempts ?? false}
                onChange={(e) => saveSettings({ logNSFWAttempts: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(settings.logNSFWAttempts ?? false)
                ? 'bg-accent border-accent'
                : 'border-zinc-600 group-hover:border-zinc-500'
                }`}>
                {(settings.logNSFWAttempts ?? false) && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                Log Filtered Content Attempts
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                Keep logs of content that was filtered for compliance purposes
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Corporate Notice */}
      <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Corporate Safety Notice
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Content filtering is enabled by default for workplace safety. This helps ensure
              that only appropriate AI models are displayed in corporate environments.
              Administrators can adjust these settings based on organizational policies.
            </p>
          </div>
        </div>
      </div>

      {/* API Security */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">API Security</h4>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-accent" />
              <span className="font-medium text-green-800 dark:text-green-200 text-sm">
                API Keys Secured
              </span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              API keys are stored locally and never transmitted to external servers except
              for their intended API endpoints. Keys are encrypted in local storage.
            </p>
          </div>

          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <h5 className="font-medium mb-2">Security Best Practices:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Use API keys with minimal required permissions</li>
              <li>• Regularly rotate API keys</li>
              <li>• Monitor API usage for unusual activity</li>
              <li>• Keep the application updated</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}