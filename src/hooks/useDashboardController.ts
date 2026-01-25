import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Model } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useSettings, Settings } from "../context/SettingsContext";
import { useUpdate } from "../context/UpdateContext";
import { useModels, isModelIncomplete } from "./useModels";
import { useModelFiltering } from "./useModelFiltering";
import { useLazyLoad } from "./useLazyLoad";
import { ValidationSummary } from "../types/validation";
import { useSyncOperations } from "./useSyncOperations";
import { useNSFWScan } from "./useNSFWScan";
import { useModelSelection } from "./useModelSelection";
import { useUIState } from "./useUIState";
import { useSyncState } from "./useSyncState";
import { useValidationState } from "./useValidationState";
import { useModal } from "../context/ModalContext";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useWindowEvents } from "./useWindowEvents";
import { useConsoleLogging } from "./useConsoleLogging";
import { useOnlineStatus } from "./useOnlineStatus";
import { useSyncHistory } from "./useSyncHistory";
import { useDashboardToggles } from "./useDashboardToggles";

/**
 * Main controller hook for the AI Model Database dashboard.
 * Extracts all business logic and state management from AIModelDB.tsx
 * to create a clean separation of concerns.
 */
export function useDashboardController() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { settings, saveSettings } = useSettings();
    const updateState = useUpdate();

    // UI state for update progress
    const [showUpdateProgress, setShowUpdateProgress] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);

    // Show update progress when any update activity happens
    useEffect(() => {
        if (updateState.updateAvailable || updateState.downloadProgress !== null || updateState.updateDownloaded || updateState.error) {
            setShowUpdateProgress(true);
        }
    }, [updateState.updateAvailable, updateState.downloadProgress, updateState.updateDownloaded, updateState.error]);

    // Custom hooks for state management
    const uiState = useUIState();
    const syncState = useSyncState();
    const validationState = useValidationState();

    const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
    const [showComponentValidationResults, setShowComponentValidationResults] = useState(false);

    const handleViewValidationDetails = useCallback(() => {
        if (validationState.validationToast?.summary) {
            setValidationSummary(validationState.validationToast.summary);
            setShowComponentValidationResults(true);
        }
    }, [validationState.validationToast]);

    const modalState = useModal();
    const consoleLogging = useConsoleLogging();
    const isOnline = useOnlineStatus();
    const syncHistory = useSyncHistory();

    // Track if API keys are available
    const [hasApiProvider, setHasApiProvider] = useState(false);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const [flagModalOpen, setFlagModalOpen] = useState(false);
    const [modelToFlag, setModelToFlag] = useState<Model | null>(null);
    // One-shot ref to prevent config version check from repeatedly triggering onboarding
    const hasTriggeredConfigOnboarding = useRef(false);

    // Model management from useModels hook
    const modelsHook = useModels();
    const {
        models,
        setModels,
        lastMergeStats,
        addModel,
        importModels,
        mergeInModels,
        validateModels,
        setApiConfig,
        isValidating,
        validationJobs,
        pauseValidation,
        resumeValidation,
        stopValidation,
        clearFinishedValidationJobs,
        selectedModelForEdit,
        showModelEditor,
        openModelEditor,
        closeModelEditor,
        saveModelEdit,
        showValidationModal,
        closeValidationModal,
        validateEntireDatabase,
        isLoading,
        loadingProgress,
        validationProgress,
        setLastMergeStats
    } = modelsHook;

    // Filtering and pagination
    const filteringResult = useModelFiltering(models, {
        query: uiState.query,
        domainPick: uiState.domainPick,
        sortKey: uiState.sortKey,
        sortDirection: uiState.sortDirection,
        minDownloads: uiState.minDownloads,
        pageSize: uiState.pageSize,
        licenseTypes: uiState.licenseTypes,
        commercialAllowed: uiState.commercialAllowed,
        includeTags: uiState.includeTags,
        excludeTags: uiState.excludeTags,
        favoritesOnly: uiState.favoritesOnly,
        hideNSFW: uiState.hideNSFW
    });

    const { filtered, total, page, setPage, totalPages, pageItems } = filteringResult;

    // Lazy loading for "All" mode
    const lazyLoadResult = useLazyLoad({
        items: pageItems,
        initialCount: 50,
        incrementCount: 25,
        enabled: uiState.pageSize === null,
    });

    const { visibleItems, hasMore, displayCount, totalCount, sentinelRef } = lazyLoadResult;

    // Sync operations hook
    const { syncAll, handleLiveSync } = useSyncOperations({
        models,
        settings,
        callbacks: {
            setIsSyncing: syncState.setIsSyncing,
            setSyncProgress: syncState.setSyncProgress,
            setSyncSummary: syncState.setSyncSummary,
            addConsoleLog: consoleLogging.addConsoleLog,
            setModels,
            mergeInModels,
            setLastMergeStats,
            setLastSync: syncState.setLastSync,
            setPage,
            setFlaggedModels: modalState.setFlaggedModels,
            setShowFlaggedModal: modalState.setShowFlaggedModal,
            saveSnapshot: syncHistory.saveSnapshot,
            setShowSync: modalState.setShowSync
        }
    });

    // Model selection hook
    const selectionHook = useModelSelection({
        models,
        pageItems,
        setModels,
        setUndoToast: modalState.setUndoToast,
        addConsoleLog: consoleLogging.addConsoleLog,
        settings,
        saveSettings
    });

    const {
        selectedIds,
        handleSelect,
        handleSelectAll,
        handleUndoableDelete,
        handleBulkDelete,
        handleBulkExport,
        clearSelection,
        selectedCount
    } = selectionHook;

    // NSFW scanning
    useNSFWScan({
        models,
        isLoading,
        customNSFWKeywords: settings.customNSFWKeywords || [],
        setModels,
        addConsoleLog: consoleLogging.addConsoleLog,
    });

    // Wrapper for import to handle UI state
    const handleImportWrapper = useCallback((importedModels: Model[]) => {
        importModels(importedModels);
        modalState.setShowImport(false);
        const cnt = importedModels?.length || 0;
        modalState.setImportToast({ found: cnt, added: cnt, updated: 0, flagged: 0 });
    }, [importModels, modalState]);

    /**
     * Checks if API keys are available (local settings only)
     */
    const hasApiKeys = useCallback(async () => {
        return settings && settings.apiConfig && Object.values(settings.apiConfig).some(cfg => cfg.enabled && cfg.apiKey);
    }, [settings]);

    /**
     * Syncs models - shows wizard if DB is empty, otherwise just syncs
     */
    const handleSyncWithApiCheck = useCallback(async () => {
        if (models.length === 0) {
            modalState.setShowOnboarding(true);
        } else {
            await syncAll(true);
        }
    }, [models.length, modalState, syncAll]);

    // Keyboard shortcuts
    useKeyboardShortcuts(searchRef, () => syncAll(true), {
        onShowShortcuts: () => setShowShortcutsModal(true),
        onOpenSettings: () => modalState.setShowSync(true)
    });

    // Window events
    useWindowEvents({
        onEditModel: openModelEditor,
        onShowConfirmation: modalState.setConfirmationToast,
        onOpenSync: () => modalState.setShowSync(true)
    });

    // Check API keys on mount and when settings change
    useEffect(() => {
        const checkApiKeys = async () => {
            const hasKeys = await hasApiKeys();
            setHasApiProvider(hasKeys);
        };
        checkApiKeys();
    }, [settings.apiConfig, hasApiKeys]);

    // Update API config and log incomplete models
    const { addConsoleLog } = consoleLogging;
    useEffect(() => {
        if (settings?.apiConfig) {
            const hasEnabledProvider = Object.entries(settings.apiConfig)
                .some(([_, cfg]) => (cfg as any).enabled && (cfg as any).apiKey);

            if (hasEnabledProvider) {
                setApiConfig(settings.apiConfig);
                const incompleteModels = models.filter(isModelIncomplete);
                if (incompleteModels.length > 0) {
                    addConsoleLog(`Found ${incompleteModels.length} models with incomplete data.`);
                }
            }
        }
    }, [settings?.apiConfig, models, setApiConfig, addConsoleLog]);

    // Auto-hide import toast
    useEffect(() => {
        if (!modalState.importToast) return;
        const timer = window.setTimeout(() => modalState.setImportToast(null), 6000);
        return () => window.clearTimeout(timer);
    }, [modalState.importToast, modalState.setImportToast]);

    // Auto-hide validation toast
    useEffect(() => {
        if (!validationState.validationToast) return;
        const timer = window.setTimeout(() => validationState.setValidationToast(null), 6000);
        return () => window.clearTimeout(timer);
    }, [validationState.validationToast, validationState.setValidationToast]);

    // Show validation toast when all jobs complete
    useEffect(() => {
        if (validationJobs.length === 0) return;
        const completedJobs = validationJobs.filter(j => j.status === 'completed').length;
        const failedJobs = validationJobs.filter(j => j.status === 'failed').length;
        const finishedJobs = completedJobs + failedJobs;
        if (finishedJobs === validationJobs.length && finishedJobs > 0) {
            validationState.setValidationToast({ completed: completedJobs, failed: failedJobs });
        }
    }, [validationJobs, validationState.setValidationToast]);

    // Check config version and trigger onboarding update if needed (ONE-SHOT)
    useEffect(() => {
        if (hasTriggeredConfigOnboarding.current) return;

        if (settings && typeof settings.configVersion === 'number') {
            if (settings.configVersion < 2) {
                if (models.length > 0) {
                    hasTriggeredConfigOnboarding.current = true;
                    consoleLogging.addConsoleLog("Detected old configuration version. Launching setup wizard for new features.");
                    modalState.setOnboardingStartStep(2);
                    modalState.setShowOnboarding(true);
                }
            }
        }
    }, [settings.configVersion, models.length, consoleLogging, modalState]);

    // Show import toast after sync
    useEffect(() => {
        if (!lastMergeStats) return;
        const added = lastMergeStats.added || 0;
        const updated = lastMergeStats.updated || 0;

        // Sum cross-source duplicates and internal database matches
        const syncDuplicates = syncState.syncSummary?.duplicates ?? 0;
        const mergeDuplicates = lastMergeStats.duplicates ?? 0;
        const duplicates = syncDuplicates + mergeDuplicates;

        const found = syncState.syncSummary?.found ?? (added + updated);
        const flagged = syncState.syncSummary?.flagged ?? 0;

        modalState.setImportToast({ found, added, updated, flagged, duplicates });
        syncState.setSyncSummary(null);

        if (updated > 0) {
            consoleLogging.addConsoleLog(`Update complete: ${updated} models updated with new data`);
        }
        if (duplicates > 0) {
            consoleLogging.addConsoleLog(`Sync found ${duplicates} models already present in database`);
        }
    }, [lastMergeStats, syncState.syncSummary, syncState.setSyncSummary, modalState.setImportToast, consoleLogging.addConsoleLog]);

    // Toggle handlers for models using extracted hook
    const {
        handleToggleFavorite,
        handleToggleNSFWFlag,
        handleToggleImageNSFW
    } = useDashboardToggles({
        setModels,
        consoleLogging,
        setModelToFlag,
        setFlagModalOpen
    });

    // Computed values
    const bgRoot = theme === "dark" ? "bg-black text-zinc-100" : "bg-white text-black";

    return {
        // Translation
        t,

        // Theme
        theme,
        bgRoot,

        // Settings
        settings,
        saveSettings,

        // Update state
        updateState,
        showUpdateProgress,
        setShowUpdateProgress,

        // Shortcuts modal
        showShortcutsModal,
        setShowShortcutsModal,

        // UI state
        uiState,

        // Sync state
        syncState,

        // Validation state
        validationState,
        validationSummary,
        setValidationSummary,
        showComponentValidationResults,
        setShowComponentValidationResults,
        handleViewValidationDetails,

        // Modal state
        modalState,

        // Console
        consoleLogging,

        // Online status
        isOnline,

        // Sync history
        syncHistory,

        // API provider status
        hasApiProvider,

        // Search ref
        searchRef,

        // Flag modal state
        flagModalOpen,
        setFlagModalOpen,
        modelToFlag,
        setModelToFlag,

        // Models hook results
        models,
        setModels,
        lastMergeStats,
        addModel,
        importModels: handleImportWrapper,
        mergeInModels,
        validateModels,
        setApiConfig,
        isValidating,
        validationJobs,
        pauseValidation,
        resumeValidation,
        stopValidation,
        clearFinishedValidationJobs,
        selectedModelForEdit,
        showModelEditor,
        openModelEditor,
        closeModelEditor,
        saveModelEdit,
        showValidationModal,
        closeValidationModal,
        validateEntireDatabase,
        isLoading,
        loadingProgress,
        validationProgress,

        // Filtering results
        filtered,
        total,
        page,
        setPage,
        totalPages,
        pageItems,

        // Lazy load results
        visibleItems,
        hasMore,
        displayCount,
        totalCount,
        sentinelRef,

        // Sync operations
        syncAll,
        handleLiveSync,
        handleSyncWithApiCheck,

        // Selection
        selectedIds,
        handleSelect,
        handleSelectAll,
        handleUndoableDelete,
        handleBulkDelete,
        handleBulkExport,
        clearSelection,
        selectedCount,

        // Toggle handlers
        handleToggleFavorite,
        handleToggleNSFWFlag,
        handleToggleImageNSFW,
    };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
