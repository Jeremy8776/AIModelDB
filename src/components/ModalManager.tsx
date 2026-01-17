/**
 * Modal Manager Component
 * 
 * Manages the rendering of all global modals for the application.
 * Centralizes modal declarations to keep the main component clean.
 */

import { useModal } from '../context/ModalContext';

import React from 'react';
import { Model } from '../types';
import { Settings } from '../context/SettingsContext';
import { ModalState } from '../hooks/useModalState';
import { UIState } from '../hooks/useUIState';
import { ConsoleLogging } from '../hooks/useConsoleLogging';
import { ValidationState } from '../hooks/useValidationState';
import { ValidationSummary } from '../hooks/useModelValidation';
import { filterModels, FilterOptions } from '../utils/filterLogic';
import { exportModels } from '../services/exportService';
import { dedupe } from '../utils/format';

// Modal Component Imports
import { AddModelModal } from './AddModelModal';
import { ImportModal } from './ImportModal';
import { SettingsModal } from './SettingsModal';
import { FlaggedModelsModal } from './FlaggedModelsModal';
import { TerminalConsole } from './TerminalConsole';
import { OnboardingWizard } from './OnboardingWizard';
import { ValidationProgress } from './ValidationProgress';
import { ModelEditor } from './ModelEditor';
import { SimpleValidationModal } from './SimpleValidationModal';
import { ValidationResultsModal } from './ValidationResultsModal';
import { FlagReasonModal } from './FlagReasonModal';
import { ExportModal } from './ExportModal';
import { ConfirmationToast } from './ConfirmationToast';
import { ToastContainer } from './toasts/ToastContainer';
import { UndoToast } from './toasts/UndoToast';
import { ConsoleButton } from './console/ConsoleButton';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface ModalManagerProps {
    // Global State
    models: Model[];
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    theme: 'dark' | 'light';
    settings: Settings;
    saveSettings: (settings: Partial<Settings>) => void;

    // Hooks state
    uiState: UIState;
    consoleLogging: ConsoleLogging;
    validationState: ValidationState;

    // Validation specifics
    validationSummary: ValidationSummary | null;
    setValidationSummary: (summary: ValidationSummary | null) => void;
    showComponentValidationResults: boolean;
    setShowComponentValidationResults: (show: boolean) => void;
    showValidationModal: boolean;
    closeValidationModal: () => void;
    validateEntireDatabase: (options?: { batchSize?: number; pauseMs?: number; maxBatches?: number; apiConfig?: any; preferredModelProvider?: string | null; modelsOverride?: Model[] }) => Promise<{ success: boolean; updatedModels?: Model[]; error?: string; summary?: ValidationSummary }>;
    validationJobs: any[]; // ValidationJob[] (need to import ValidationJob if available, otherwise leave any or use simple object)
    isValidating: boolean;
    stopValidation: () => void;
    clearFinishedValidationJobs: () => void;
    pauseValidation: () => void;
    resumeValidation: () => void;
    validationProgress: { current: number; total: number } | null;
    setValidationToast: (toast: { completed: number; failed: number; summary?: ValidationSummary } | null) => void;

    // Flagging Logic (Custom local state in main app)
    flagModalOpen: boolean;
    setFlagModalOpen: (open: boolean) => void;
    modelToFlag: Model | null;
    setModelToFlag: (model: Model | null) => void;

    // Handlers
    onAddModel: (model: Model) => void;
    onImport: (models: Model[]) => void;
    onLiveSync: (options: any) => Promise<void>;
    syncAll: (showSpinner?: boolean) => Promise<void>;

    // Model Editor
    selectedModelForEdit: Model | null;
    showModelEditor: boolean;
    onCloseModelEditor: () => void;
    onSaveModelEdit: (model: Model) => void;

    // API State
    hasApiProvider: boolean;

    // Shortcuts
    showShortcutsModal: boolean;
    setShowShortcutsModal: (show: boolean) => void;

    // Callbacks
    handleViewValidationDetails: () => void;
}

export function ModalManager({
    models,
    setModels,
    theme,
    settings,
    saveSettings,
    uiState,
    consoleLogging,
    validationState,
    validationSummary,
    showComponentValidationResults,
    setShowComponentValidationResults,
    showValidationModal,
    closeValidationModal,
    validateEntireDatabase,
    validationJobs,
    isValidating,
    stopValidation,
    clearFinishedValidationJobs,
    pauseValidation,
    resumeValidation,
    validationProgress,
    setValidationToast,
    flagModalOpen,
    setFlagModalOpen,
    modelToFlag,
    setModelToFlag,
    onAddModel,
    onImport,
    onLiveSync,
    syncAll,
    selectedModelForEdit,
    showModelEditor,
    onCloseModelEditor,
    onSaveModelEdit,
    hasApiProvider,
    showShortcutsModal,
    setShowShortcutsModal,
    handleViewValidationDetails
}: ModalManagerProps) {
    const modalState = useModal();

    // Internal Handlers for Flagged Models
    const onApproveFlagged = (model: Model) => {
        setModels((prev: Model[]) => dedupe([...prev, model]));
        modalState.setFlaggedModels(modalState.flaggedModels.filter((m: Model) => m.id !== model.id));
    };
    const onDenyFlagged = (model: Model) => {
        modalState.setFlaggedModels(modalState.flaggedModels.filter((m: Model) => m.id !== model.id));
    };
    const onEditFlagged = (model: Model) => {
        modalState.setFlaggedModels(modalState.flaggedModels.map((m: Model) => m.id === model.id ? model : m));
    };

    return (
        <>
            <OnboardingWizard
                isOpen={modalState.showOnboarding}
                onClose={() => modalState.setShowOnboarding(false)}
                onComplete={() => {
                    modalState.setShowOnboarding(false);
                    syncAll(true);
                }}
                initialStep={modalState.onboardingStartStep}
            />

            <AddModelModal
                isOpen={modalState.showAddModel}
                onClose={() => modalState.setShowAddModel(false)}
                onAddModel={onAddModel}
                domains={["All", "LLM", "VLM", "ImageGen", "VideoGen", "Audio", "ASR", "TTS", "3D", "World/Sim", "LoRA", "FineTune", "BackgroundRemoval", "Upscaler", "Other"] as const}
                addConsoleLog={consoleLogging.addConsoleLog}
            />

            <ImportModal
                isOpen={modalState.showImport}
                onClose={() => modalState.setShowImport(false)}
                onImport={onImport}
                addConsoleLog={consoleLogging.addConsoleLog}
            />

            <SettingsModal
                isOpen={modalState.showSync}
                onClose={() => modalState.setShowSync(false)}
                onSync={onLiveSync}
                addConsoleLog={consoleLogging.addConsoleLog}
                currentModels={models}
                onRestore={(restored) => {
                    setModels(restored);
                    consoleLogging.addConsoleLog(`Restored ${restored.length} models from snapshot`);
                }}
            />

            <FlaggedModelsModal
                flagged={modalState.flaggedModels}
                isOpen={modalState.showFlaggedModal}
                onApprove={onApproveFlagged}
                onDeny={onDenyFlagged}
                onEdit={onEditFlagged}
                onClose={() => modalState.setShowFlaggedModal(false)}
                addConsoleLog={consoleLogging.addConsoleLog}
            />

            <ModelEditor
                model={selectedModelForEdit}
                isOpen={showModelEditor}
                onClose={onCloseModelEditor}
                onSave={onSaveModelEdit}
            />

            <ExportModal
                isOpen={modalState.showExportModal}
                onClose={() => modalState.setShowExportModal(false)}
                onExport={(format, scope, customCriteria) => {
                    if (scope === 'custom' && customCriteria) {
                        const fullCriteria: FilterOptions = {
                            query: '',
                            domainPick: 'All',
                            sortKey: 'recent',
                            sortDirection: 'asc',
                            minDownloads: 0,
                            pageSize: null,
                            ...customCriteria
                        };

                        const customFiltered = filterModels(models, fullCriteria);
                        exportModels({ format, models: customFiltered });
                        consoleLogging.addConsoleLog(`Exported ${customFiltered.length} models (Custom Filter).`);
                    } else {
                        exportModels({ format, models: models });
                        consoleLogging.addConsoleLog(`Exported ${models.length} models (Entire DB).`);
                    }
                }}
                totalModels={models.length}
                currentFilters={{
                    domainPick: uiState.domainPick,
                    favoritesOnly: uiState.favoritesOnly,
                    minDownloads: uiState.minDownloads,
                    licenseTypes: uiState.licenseTypes,
                    commercialAllowed: uiState.commercialAllowed,
                    includeTags: uiState.includeTags,
                    excludeTags: uiState.excludeTags
                }}
                theme={theme}
            />

            <ValidationResultsModal
                isOpen={showComponentValidationResults}
                onClose={() => setShowComponentValidationResults(false)}
                summary={validationSummary}
            />

            <SimpleValidationModal
                isOpen={showValidationModal}
                onClose={closeValidationModal}
                onValidateAll={async (opts?: any) => {
                    const result = await validateEntireDatabase({
                        batchSize: opts?.batchSize ?? 50,
                        pauseMs: opts?.pauseMs ?? 60000,
                        maxBatches: opts?.maxBatches ?? 0,
                        apiConfig: settings.apiConfig,
                        preferredModelProvider: settings.preferredModelProvider,
                        modelsOverride: opts?.modelsOverride
                    });
                    if (result.success && result.updatedModels) {
                        // Merge validated models with existing, preserving user flags
                        setModels(prev => {
                            const validatedMap = new Map(result.updatedModels!.map((m: Model) => [m.id, m]));
                            return prev.map(existing => {
                                const validated = validatedMap.get(existing.id);
                                if (validated) {
                                    // Merge: use validated data but PRESERVE user flags from existing
                                    return {
                                        ...validated,
                                        isFavorite: existing.isFavorite,
                                        isNSFWFlagged: existing.isNSFWFlagged,
                                        flaggedImageUrls: existing.flaggedImageUrls
                                    } as Model;
                                }
                                return existing;
                            });
                        });
                        if (result.summary) {
                            setValidationToast({
                                completed: result.summary.modelsUpdated,
                                failed: result.summary.errors,
                                summary: result.summary
                            });
                        }
                    }
                    return result;
                }}
                models={models}
                hasApiProvider={hasApiProvider}
            />

            {consoleLogging.showConsole && (
                <TerminalConsole
                    logs={consoleLogging.consoleLogs}
                    onClose={() => consoleLogging.setShowConsole(false)}
                    onClear={consoleLogging.clearConsoleLogs}
                />
            )}

            <ToastContainer
                importToast={modalState.importToast}
                onDismissImport={() => modalState.setImportToast(null)}
                validationToast={validationState.validationToast}
                onDismissValidation={() => setValidationToast(null)}
                onViewDetailsValidation={handleViewValidationDetails}
                theme={theme}
            />

            <UndoToast
                data={modalState.undoToast}
                onClose={() => modalState.setUndoToast(null)}
            />

            <ConfirmationToast
                isOpen={!!modalState.confirmationToast}
                title={modalState.confirmationToast?.title || ''}
                message={modalState.confirmationToast?.message}
                type={modalState.confirmationToast?.type}
                confirmText={modalState.confirmationToast?.confirmText}
                cancelText={modalState.confirmationToast?.cancelText}
                onConfirm={() => {
                    modalState.confirmationToast?.onConfirm();
                    modalState.setConfirmationToast(null);
                }}
                onCancel={() => {
                    if (modalState.confirmationToast?.onCancel) {
                        modalState.confirmationToast.onCancel();
                    } else {
                        modalState.setConfirmationToast(null);
                    }
                }}
            />

            <FlagReasonModal
                isOpen={flagModalOpen}
                onClose={() => {
                    setFlagModalOpen(false);
                    setModelToFlag(null);
                }}
                modelName={modelToFlag?.name || ''}
                onConfirm={(reason) => {
                    if (modelToFlag) {
                        setModels(prev => prev.map(m => m.id === modelToFlag.id ? { ...m, isNSFWFlagged: true } : m));
                        consoleLogging.addConsoleLog(`Flagged model: ${modelToFlag.name}. Reason: ${reason}`);

                        if (reason.trim()) {
                            const keyword = reason.trim().toLowerCase();
                            console.log(`[User Feedback] NSFW Flag Reason for ${modelToFlag.name}: ${reason}`);

                            // Add to custom blocklist in settings
                            const currentKeywords = settings.customNSFWKeywords || [];
                            if (!currentKeywords.includes(keyword)) {
                                // Save to settings
                                saveSettings({
                                    customNSFWKeywords: [...currentKeywords, keyword]
                                });
                                consoleLogging.addConsoleLog(`Added "${keyword}" to custom blocklist`);
                            }
                        }
                    }
                    setFlagModalOpen(false);
                    setModelToFlag(null);
                }}
            />

            {(isValidating || validationJobs.length > 0) && (
                <ValidationProgress
                    jobs={validationJobs}
                    onClear={clearFinishedValidationJobs}
                    onPause={pauseValidation}
                    onResume={resumeValidation}
                    onCancelAll={stopValidation}
                    isPaused={validationState.validationPaused}
                />
            )}

            {validationProgress && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-lg border px-3 py-2 shadow-lg ${theme === 'dark' ? 'border-zinc-800 bg-black text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 transition-all" style={{ width: `${(validationProgress.current / validationProgress.total) * 100}%` }} />
                        </div>
                        <span className="text-[11px] opacity-70 whitespace-nowrap">{validationProgress.current}/{validationProgress.total}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${theme === 'dark' ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'}`}
                            onClick={() => window.dispatchEvent(new CustomEvent('open-validation-progress'))}
                            title="Show validation details"
                        >
                            Details
                        </button>
                        <button
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${theme === 'dark' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                            onClick={stopValidation}
                            title="Cancel all validation jobs"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <KeyboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />

            <ConsoleButton
                showConsole={consoleLogging.showConsole}
                onShowConsole={() => consoleLogging.setShowConsole(true)}
                theme={theme}
            />
        </>
    );
}
