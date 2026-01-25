import React from 'react';
import { Model } from '../../types';
import { Trash2, Download, X } from 'lucide-react';
import { ModelComparison } from '../ModelComparison';

interface FloatingToolbarProps {
    selectedIds: Set<string>;
    models: Model[];
    theme: 'light' | 'dark';
    onBulkDelete: () => void;
    onBulkExport: () => void;
    onSelectAll: (selected: boolean) => void;
}

export function FloatingToolbar({
    selectedIds,
    models,
    theme,
    onBulkDelete,
    onBulkExport,
    onSelectAll
}: FloatingToolbarProps) {
    const [isComparing, setIsComparing] = React.useState(false);

    const hasSelection = selectedIds && selectedIds.size > 0;
    const floatingBarBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-gray-200 text-gray-800 shadow-lg';

    // Get full model objects for selection - Memoization handled by parent usually, but valid here too if models change often
    const selectedModels = React.useMemo(() => {
        if (!selectedIds) return [];
        return models.filter(m => selectedIds.has(m.id));
    }, [models, selectedIds]);

    const canCompare = selectedModels.length >= 2 && selectedModels.length <= 4;

    return (
        <>
            <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${hasSelection ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-4 px-6 py-3 rounded-full border ${floatingBarBg}`}>
                    <span className="font-medium text-sm whitespace-nowrap px-2">
                        {selectedIds?.size} selected
                    </span>

                    {canCompare && (
                        <>
                            <div className="h-4 w-px bg-current opacity-20"></div>
                            <button
                                onClick={() => setIsComparing(true)}
                                className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shadow-lg shadow-violet-500/20"
                            >
                                Compare ({selectedModels.length})
                            </button>
                        </>
                    )}

                    <div className="h-4 w-px bg-current opacity-20"></div>
                    <button
                        onClick={onBulkExport}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Export selected"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={onBulkDelete}
                        className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Delete selected"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="h-4 w-px bg-current opacity-20"></div>
                    <button
                        onClick={() => onSelectAll && onSelectAll(false)}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Clear selection"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Comparison View Modal */}
            {isComparing && (
                <ModelComparison
                    models={selectedModels}
                    onClose={() => setIsComparing(false)}
                />
            )}
        </>
    );
}
