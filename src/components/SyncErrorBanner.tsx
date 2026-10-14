import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCP_SOURCES, SKILL_SOURCES } from '../services/sources/entitySources';

/**
 * Sync error banner shared by the MCP and Skills tabs.
 *
 * The hooks record one string per failed source ("glama: Request failed: 401",
 * joined with " · " or " | "). Raw HTTP codes are not useful to read, so each
 * entry is turned into a sentence that says what happened and what to do, and
 * the banner can be dismissed or retried.
 */

const SOURCE_LABELS = new Map<string, string>(
    [...MCP_SOURCES, ...SKILL_SOURCES].map(source => [source.key, source.label] as const)
);

export function splitSyncErrors(message: string): string[] {
    return message.split(/\s[·|]\s/).map(part => part.trim()).filter(Boolean);
}

/** One recorded error to one readable sentence. Exported for tests. */
export function describeSyncError(entry: string): string {
    const match = entry.match(/^([a-z0-9-]+):\s*(.*)$/i);
    const key = match?.[1];
    const detail = match ? match[2] : entry;
    const label = (key && SOURCE_LABELS.get(key)) || key;
    const prefix = label ? `${label}: ` : '';

    // Already written for people (e.g. the Glama key message).
    if (/Settings > /.test(detail)) return `${prefix}${detail}`;
    if (/\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(detail)) {
        return `${prefix}access was denied. Check the API key or token in Settings > Data Sources.`;
    }
    if (/\b429\b|rate.?limit|too many requests/i.test(detail)) {
        return `${prefix}rate limited. Wait a few minutes, or add a token in Settings > Data Sources for a higher limit.`;
    }
    if (/\b5\d\d\b/.test(detail)) {
        return `${prefix}the service is having problems right now (${detail.match(/\b5\d\d\b/)![0]}). Try again later.`;
    }
    if (/failed to fetch|fetch failed|network|econn|enotfound|timed? ?out|abort/i.test(detail)) {
        return `${prefix}could not connect. Check your internet connection.`;
    }
    return `${prefix}${detail}`;
}

interface SyncErrorBannerProps {
    message: string;
    theme: 'light' | 'dark';
    onRetry?: () => void;
    isSyncing?: boolean;
}

export function SyncErrorBanner({ message, theme, onRetry, isSyncing }: SyncErrorBannerProps) {
    const { t } = useTranslation();
    const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);

    // A new failure should show even if the previous one was dismissed.
    useEffect(() => {
        if (dismissedMessage !== null && dismissedMessage !== message) setDismissedMessage(null);
    }, [message, dismissedMessage]);

    if (dismissedMessage === message) return null;

    const entries = splitSyncErrors(message).map(describeSyncError);
    const text = theme === 'dark' ? 'text-red-300' : 'text-red-700';

    return (
        <div role="alert" className={`flex items-start gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm ${text}`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-0.5">
                {entries.map((entry, index) => (
                    <div key={index}>{entry}</div>
                ))}
            </div>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={isSyncing}
                    className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium border border-red-500/40 hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                    {t('common.retry', { defaultValue: 'Retry' })}
                </button>
            )}
            <button
                type="button"
                onClick={() => setDismissedMessage(message)}
                aria-label={t('common.dismiss', { defaultValue: 'Dismiss' })}
                className="shrink-0 rounded p-0.5 hover:bg-red-500/15"
            >
                <X size={14} />
            </button>
        </div>
    );
}
