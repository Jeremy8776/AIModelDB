
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { ValidationSummary } from '../hooks/useModelValidation';

interface ValidationResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: ValidationSummary | null;
}

export function ValidationResultsModal({
    isOpen,
    onClose,
    summary
}: ValidationResultsModalProps) {
    const { theme } = useContext(ThemeContext);
    const { t } = useTranslation();

    // BACKWARD COMPATIBILITY / DEMO MODE:
    // If we have stats but no detailed updates (e.g. from a job run before this feature was added),
    // generate plausible mock data so the user can see the UI populated.
    // NOTE: This hook must be called before any early returns to comply with React hooks rules.
    const displayUpdates = React.useMemo(() => {
        if (!summary) return [];
        if (summary.updates && summary.updates.length > 0) return summary.updates;

        // Only simulate if we have updates recorded in stats but no event log
        if (summary.modelsUpdated > 0 && (!summary.updates || summary.updates.length === 0)) {
            const mock: any[] = [];
            let modelIdx = 1;

            const addMocks = (field: string, count: number, oldV: any, newV: any) => {
                for (let i = 0; i < count; i++) {
                    mock.push({
                        modelId: `mock-${modelIdx}`,
                        modelName: `Model-${modelIdx} (${field} update)`,
                        field,
                        oldValue: oldV,
                        newValue: newV
                    });
                    modelIdx++;
                }
            };

            // Generate matching the stats
            addMocks('description', summary.fieldsUpdated.description || 0, null, 'An advanced transformer model trained on...');
            addMocks('parameters', summary.fieldsUpdated.parameters || 0, 'Unknown', '7B');
            addMocks('context_window', summary.fieldsUpdated.context_window || 0, 0, 8192);
            addMocks('license', summary.fieldsUpdated.license || 0, 'Unknown', 'Apache 2.0');
            addMocks('pricing', summary.fieldsUpdated.pricing || 0, null, '{"input": 0.5, "output": 1.5}');

            return mock;
        }
        return [];
    }, [summary]);

    // Early return AFTER hooks are called
    if (!isOpen || !summary) return null;

    const bgModal = 'bg-bg border-border text-text';
    const textPrimary = 'text-text';
    const textSecondary = 'text-text-secondary';
    const bgInput = 'border border-border bg-input text-text';

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return <span className="opacity-30">-</span>;
        if (Array.isArray(val)) return `[${val.length} items]`;
        if (typeof val === 'object') return '{...}';
        return String(val);
    };

    const isSimulated = summary.modelsUpdated > 0 && (!summary.updates || summary.updates.length === 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border ${bgModal} shadow-2xl`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="size-6 text-green-500" />
                        <h2 className={`text-lg font-semibold ${textPrimary}`}>
                            {t('validationResults.title')}
                        </h2>
                        {isSimulated && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full border border-yellow-200 dark:border-yellow-800">
                                {t('validationResults.simulated')}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className={`rounded-xl ${bgInput} p-2 hover:opacity-80 transition-opacity`}
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {summary.webSearchUsed && (
                                <span className="text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                    {t('validationResults.webSearchUsed')}
                                </span>
                            )}
                            <span className={`text-sm ${textSecondary}`}>
                                {t('validationResults.processedModels', { count: summary.totalModels })}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`rounded-lg border p-4 ${summary.errors > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-lg">{summary.modelsUpdated} {t('validationResults.modelsUpdated')}</span>
                                {summary.errors > 0 && <span className="text-red-500 text-sm font-medium">{summary.errors} {t('validationResults.errors')}</span>}
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-4 bg-card">
                            <div className="text-sm font-medium opacity-80 mb-2">{t('validationResults.fieldsEnhanced')}</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {Object.entries(summary.fieldsUpdated).map(([field, count]) => (
                                    (count as number) > 0 && (
                                        <div key={field} className="flex justify-between items-center">
                                            <span className="capitalize opacity-70">{field.replace('_', ' ')}</span>
                                            <span className="font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">{count as number}</span>
                                        </div>
                                    )
                                ))}
                                {Object.values(summary.fieldsUpdated).every(c => c === 0) && (
                                    <div className="col-span-2 text-center text-sm opacity-60 italic">
                                        {t('validationResults.noSpecificFields')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Change Log Table */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            {t('validationResults.changeLog')}
                            <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-normal opacity-70">
                                {displayUpdates.length}
                            </span>
                        </h3>
                        <div className="rounded-lg border border-border overflow-hidden">
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800/80 backdrop-blur z-10 border-b border-border shadow-sm">
                                        <tr>
                                            <th className="p-3 font-semibold w-[200px]">{t('validationResults.model')}</th>
                                            <th className="p-3 font-semibold w-[120px]">{t('validationResults.field')}</th>
                                            <th className="p-3 font-semibold">{t('validationResults.oldValue')}</th>
                                            <th className="p-3 font-semibold">{t('validationResults.newValue')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {displayUpdates.map((update: any, idx: number) => (
                                            <tr key={idx} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="p-3 font-medium truncate max-w-[200px]" title={update.modelName}>
                                                    {update.modelName}
                                                </td>
                                                <td className="p-3 capitalize text-zinc-500 dark:text-zinc-400">
                                                    {update.field.replace('_', ' ')}
                                                </td>
                                                <td className="p-3 text-red-600/70 dark:text-red-400/70 truncate max-w-[150px]" title={String(update.oldValue)}>
                                                    {formatValue(update.oldValue)}
                                                </td>
                                                <td className="p-3 text-green-600/90 dark:text-green-400/90 font-medium truncate max-w-[150px]" title={String(update.newValue)}>
                                                    {formatValue(update.newValue)}
                                                </td>
                                            </tr>
                                        ))}
                                        {displayUpdates.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-zinc-500 italic">
                                                    {t('validationResults.noUpdates')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border shrink-0 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors text-sm font-medium"
                    >
                        {t('comparison.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
