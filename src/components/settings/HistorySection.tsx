
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
                    <p className="text-sm text-text-secondary">
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

            <div className="border border-border rounded-lg overflow-hidden bg-bg-card">
                <div className="bg-muted/50 px-4 py-3 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">{t('settings.history.recentSnapshots')}</span>
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
                            className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${confirmClear ? 'bg-red-600 text-white' : 'text-red-500 hover:bg-red-500/10'}`}
                        >
                            <Trash2 size={12} />
                            {confirmClear ? t('settings.history.clickToConfirm') : t('settings.history.clearAll')}
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="p-8 text-center text-text-subtle">
                        <History className="mx-auto h-10 w-10 mb-2 opacity-50" />
                        <p>{t('settings.history.noSnapshots')}</p>
                        <p className="text-xs mt-1">{t('settings.history.autoCreatedHint')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {history.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-bg-input/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-2 bg-accent/10 text-accent rounded-full">
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium">{item.description}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-text-subtle">
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
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bg-input hover:bg-bg-elevated rounded-md transition-colors"
                                        title={t('settings.history.restore')}
                                    >
                                        <RotateCcw size={14} />
                                        {t('settings.history.restore')}
                                    </button>
                                    <button
                                        onClick={() => deleteSnapshot(item.id)}
                                        className="p-1.5 text-text-subtle hover:text-red-500 rounded-md transition-colors"
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

            <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    {t('settings.history.warning')}
                </p>
            </div>
        </div>
    );
}
