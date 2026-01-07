
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, RotateCcw, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import { useSyncHistory, HistoryItem } from '../../hooks/useSyncHistory';
import { Model } from '../../types';

interface HistorySectionProps {
    currentModels: Model[];
    onRestore: (models: Model[]) => void;
    addConsoleLog: (msg: string) => void;
}

export function HistorySection({ currentModels, onRestore, addConsoleLog }: HistorySectionProps) {
    const { t } = useTranslation();
    const { history, saveSnapshot, restoreSnapshot, clearHistory, deleteSnapshot } = useSyncHistory();
    const [confirmClear, setConfirmClear] = useState(false);

    const handleCreateSnapshot = () => {
        saveSnapshot(currentModels, `${t('settings.history.manualSnapshot')} (${currentModels.length} ${t('settings.history.models')})`);
        addConsoleLog(t('settings.history.createdManual'));
    };

    const handleRestore = (item: HistoryItem) => {
        if (window.confirm(t('settings.history.confirmRestore', { date: item.dateStr }))) {
            const models = restoreSnapshot(item.id);
            if (models) {
                onRestore(models);
                addConsoleLog(t('settings.history.restored', { desc: item.description }));
            } else {
                addConsoleLog(t('settings.history.restoreFailed', { id: item.id }));
            }
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">{t('settings.history.title')}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {t('settings.history.description')}
                    </p>
                </div>
                <button
                    onClick={handleCreateSnapshot}
                    className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm"
                >
                    <HardDrive size={16} />
                    {t('settings.history.createSnapshot')}
                </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted/50 px-4 py-3 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.history.recentSnapshots')}</span>
                    {history.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirmClear) {
                                    clearHistory();
                                    setConfirmClear(false);
                                    addConsoleLog(t('settings.history.clearedAll'));
                                } else {
                                    setConfirmClear(true);
                                    setTimeout(() => setConfirmClear(false), 3000);
                                }
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${confirmClear ? 'bg-red-600 text-white' : 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'}`}
                        >
                            <Trash2 size={12} />
                            {confirmClear ? t('settings.history.clickToConfirm') : t('settings.history.clearAll')}
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        <History className="mx-auto h-10 w-10 mb-2 opacity-50" />
                        <p>{t('settings.history.noSnapshots')}</p>
                        <p className="text-xs mt-1">{t('settings.history.autoCreatedHint')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {history.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium">{item.description}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <span>{item.dateStr}</span>
                                            <span>•</span>
                                            <span>{item.modelCount.toLocaleString()} {t('settings.history.models')}</span>
                                            <span>•</span>
                                            <span>{formatBytes(item.sizeBytes)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRestore(item)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                                        title={t('settings.history.restore')}
                                    >
                                        <RotateCcw size={14} />
                                        {t('settings.history.restore')}
                                    </button>
                                    <button
                                        onClick={() => deleteSnapshot(item.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md transition-colors"
                                        title="Delete snapshot"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    {t('settings.history.warning')}
                </p>
            </div>
        </div>
    );
}
