import { useState, useCallback } from 'react';
import { Model } from '../types';
import { dedupe } from '../utils/format';
import { exportModels } from '../services/exportService';

interface UseSelectionOptions {
    models: Model[];
    pageItems: Model[];
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    setUndoToast: (toast: { message: string; onUndo: () => void; duration: number } | null) => void;
    addConsoleLog: (msg: string) => void;
}

/**
 * Hook for managing model selection and bulk operations
 * Handles select/deselect, bulk delete with undo, and bulk export
 */
export function useModelSelection({
    models,
    pageItems,
    setModels,
    setUndoToast,
    addConsoleLog
}: UseSelectionOptions) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    /**
     * Handle single model selection
     */
    const handleSelect = useCallback((model: Model, selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (selected) next.add(model.id);
            else next.delete(model.id);
            return next;
        });
    }, []);

    /**
     * Handle select all / deselect all for current page
     */
    const handleSelectAll = useCallback((selected: boolean) => {
        if (selected) {
            setSelectedIds(new Set(pageItems.map(m => m.id)));
        } else {
            setSelectedIds(new Set());
        }
    }, [pageItems]);

    /**
     * Delete models with undo capability
     */
    const handleUndoableDelete = useCallback((modelsToDelete: Model[]) => {
        const idsToDelete = new Set(modelsToDelete.map(m => m.id));

        // Remove from UI
        setModels(prev => prev.filter(m => !idsToDelete.has(m.id)));

        // Clear selection for deleted items
        setSelectedIds(prev => {
            const next = new Set(prev);
            for (const id of idsToDelete) next.delete(id);
            return next;
        });

        // Show Undo Toast
        const count = modelsToDelete.length;
        setUndoToast({
            message: `Deleted ${count} model${count !== 1 ? 's' : ''}`,
            onUndo: () => {
                setModels(prev => dedupe([...prev, ...modelsToDelete]));
            },
            duration: 5000
        });
    }, [setModels, setUndoToast]);

    /**
     * Bulk delete selected models
     */
    const handleBulkDelete = useCallback(() => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} models?`)) {
            const modelsToDelete = models.filter(m => selectedIds.has(m.id));
            handleUndoableDelete(modelsToDelete);
            addConsoleLog(`Bulk deleted ${selectedIds.size} models.`);
        }
    }, [models, selectedIds, handleUndoableDelete, addConsoleLog]);

    /**
     * Bulk export selected models
     */
    const handleBulkExport = useCallback(() => {
        const modelsToExport = models.filter(m => selectedIds.has(m.id));
        exportModels({ format: 'json', models: modelsToExport });
        addConsoleLog(`Exported ${modelsToExport.length} models.`);
    }, [models, selectedIds, addConsoleLog]);

    /**
     * Clear all selections
     */
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    return {
        selectedIds,
        handleSelect,
        handleSelectAll,
        handleUndoableDelete,
        handleBulkDelete,
        handleBulkExport,
        clearSelection,
        selectedCount: selectedIds.size
    };
}
