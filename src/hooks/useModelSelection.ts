import { useState, useCallback } from 'react';
import { Model } from '../types';
import { dedupe } from '../utils/format';
import { exportModels } from '../services/exportService';
import { Settings } from '../context/SettingsContext';

interface UseSelectionOptions {
    models: Model[];
    pageItems: Model[];
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    setUndoToast: (toast: { message: string; onUndo: () => void; duration: number } | null) => void;
    addConsoleLog: (msg: string) => void;
    settings: Settings;
    saveSettings: (settings: Partial<Settings>) => void;
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
    addConsoleLog,
    settings,
    saveSettings
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

        // Add to ignored list to prevent re-sync
        const newIgnored = modelsToDelete
            .map(m => m.url || m.id) // Prefer URL if available, else ID
            .filter(id => id && typeof id === 'string'); // Ensure valid string

        if (newIgnored.length > 0) {
            const currentIgnored = settings.ignoredModels || [];
            // Merge and dedupe
            const updatedIgnored = Array.from(new Set([...currentIgnored, ...newIgnored]));
            saveSettings({ ignoredModels: updatedIgnored });
        }

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
                // Restore from ignored list if undone
                const restoreIds = new Set(newIgnored);
                const currentIgnored = settings.ignoredModels || []; // Access fresh settings if possible? 
                // We depend on 'settings' prop, which updates on re-render. 
                // However, inside this callback closure, 'settings' is from when the callback was created.
                // handleUndoableDelete is dependent on [settings], so it refreshes.
                // But the onUndo function is defined HERE. 
                // We should probably NOT save settings in onUndo immediately or pass a function update if possible.
                // But we can't func-update settings via saveSettings in this context easily without the context's specialized setter.
                // Actually saveSettings does a merge.
                // We'll need to read the latest settings storage if we really want to be correct, 
                // OR we accept that undoing an ignored model might race if the user deleted another one in between.
                // For now, simpler approach:

                // We assume user undoes immediately.
                // We have to filter out 'restoreIds' from 'currentIgnored'

                // Ideally saveSettings would accept a function updater for safely updating arrays,
                // but our context signature is value-based.
                // We'll just try to reverse what we did.

                // Note: The parent component will re-render and re-create this callback if settings change,
                // so 'settings' here is current at time of deletion.
                // The 'onUndo' closure captures 'settings' and 'newIgnored'.

                // THIS IS TRICKY: onUndo executes later. state might have changed (e.g. another delete).
                // Use a functional update style if possible? No.
                // We will manually remove the items we just added.

                // Best effort: read from localStorage to be safe?
                try {
                    const raw = localStorage.getItem('aiModelDB_settings');
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const liveIgnored: string[] = parsed.ignoredModels || [];
                        const filtered = liveIgnored.filter(id => !restoreIds.has(id));
                        // We must use saveSettings to trigger context update
                        saveSettings({ ignoredModels: filtered });
                    }
                } catch (e) { console.error("Undo ignore failed", e); }
            },
            duration: 5000
        });
    }, [setModels, setUndoToast, settings, saveSettings]);

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
