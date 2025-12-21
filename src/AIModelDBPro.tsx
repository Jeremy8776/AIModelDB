import { useState, useRef, useEffect } from "react";
import { DatabaseZap, RefreshCw, X } from "lucide-react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { UpdateProvider, useUpdate } from "./context/UpdateContext";
import { ApiDir, Model } from "./types";
import { useModels, isModelIncomplete } from "./hooks/useModels";
import { useModelFiltering } from "./hooks/useModelFiltering";
import { useLazyLoad } from "./hooks/useLazyLoad";
import { AddModelModal } from "./components/AddModelModal";
import { ImportModal } from "./components/ImportModal";
import { SettingsModal } from "./components/SettingsModal";
import { FlaggedModelsModal } from "./components/FlaggedModelsModal";
import { TerminalConsole } from "./components/TerminalConsole";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { ValidationProgress } from "./components/ValidationProgress";
import { ModelEditor } from "./components/ModelEditor";
import { SimpleValidationModal } from "./components/SimpleValidationModal";
import { ExportModal } from "./components/ExportModal";
import { filterModels } from "./utils/filterLogic";
import { ConfirmationToast } from "./components/ConfirmationToast";
import { dedupe } from "./utils/format";
import { syncAllSources, syncWithLiveOptions } from "./services/syncService";
import { exportModels } from "./services/exportService";
import { useUIState } from "./hooks/useUIState";
import { useSyncState } from "./hooks/useSyncState";
import { useValidationState } from "./hooks/useValidationState";
import { useModalState } from "./hooks/useModalState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useWindowEvents } from "./hooks/useWindowEvents";
import { useConsoleLogging } from "./hooks/useConsoleLogging";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useSyncHistory } from "./hooks/useSyncHistory";
import { Header } from "./components/layout/Header";
import { Toolbar } from "./components/layout/Toolbar";
import { MainLayout } from "./components/layout/MainLayout";
import { ToastContainer } from "./components/toasts/ToastContainer";
import { UndoToast } from "./components/toasts/UndoToast";
import { ConsoleButton } from "./components/console/ConsoleButton";

/**
 * Main content component for the AI Model Database Pro application.
 * Manages model browsing, filtering, synchronization, validation, and export functionality.
 */
function AIModelDBProContent() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { updateAvailable, updateVersion } = useUpdate();
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  // Show toast when update becomes available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateToast(true);
      const t = setTimeout(() => setShowUpdateToast(false), 8000);
      return () => clearTimeout(t);
    }
  }, [updateAvailable]);

  // Custom hooks for state management
  const uiState = useUIState();
  const syncState = useSyncState();
  const validationState = useValidationState();
  const modalState = useModalState();
  const consoleLogging = useConsoleLogging();
  const isOnline = useOnlineStatus();
  const syncHistory = useSyncHistory();

  // Track if API keys are available
  const [hasApiProvider, setHasApiProvider] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Model management from useModels hook
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
  } = useModels();

  // Filtering and pagination
  const {
    filtered,
    total,
    page,
    setPage,
    totalPages,
    pageItems
  } = useModelFiltering(models, {
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
    favoritesOnly: uiState.favoritesOnly
  });

  // Lazy loading for "All" mode
  const { visibleItems, hasMore, displayCount, totalCount, sentinelRef } = useLazyLoad({
    items: pageItems,
    initialCount: 50,
    incrementCount: 25,
    enabled: uiState.pageSize === null,
  });

  // Keyboard shortcuts and window events
  useKeyboardShortcuts(searchRef, () => syncAll(true));
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
  }, [settings.apiConfig]);

  // Update API config and log incomplete models
  useEffect(() => {
    if (settings?.apiConfig) {
      const hasEnabledProvider = Object.entries(settings.apiConfig)
        .some(([_, cfg]) => (cfg as any).enabled && (cfg as any).apiKey);

      if (hasEnabledProvider) {
        setApiConfig(settings.apiConfig);
        const incompleteModels = models.filter(isModelIncomplete);
        if (incompleteModels.length > 0) {
          consoleLogging.addConsoleLog(`Found ${incompleteModels.length} models with incomplete data.`);
        }
      }
    }
  }, [settings?.apiConfig, models, setApiConfig, consoleLogging.addConsoleLog]);

  // Auto-hide import toast
  useEffect(() => {
    if (!modalState.importToast) return;
    const t = window.setTimeout(() => modalState.setImportToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [modalState.importToast, modalState.setImportToast]);

  // Auto-hide validation toast
  useEffect(() => {
    if (!validationState.validationToast) return;
    const t = window.setTimeout(() => validationState.setValidationToast(null), 6000);
    return () => window.clearTimeout(t);
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

  // Show import toast after sync
  useEffect(() => {
    if (!lastMergeStats) return;
    const added = lastMergeStats.added || 0;
    const updated = lastMergeStats.updated || 0;
    const found = syncState.syncSummary?.found ?? (added + updated);
    const flagged = syncState.syncSummary?.flagged ?? 0;
    const duplicates = syncState.syncSummary?.duplicates ?? 0;
    modalState.setImportToast({ found, added, updated, flagged, duplicates });
    syncState.setSyncSummary(null);
    if (updated > 0) {
      consoleLogging.addConsoleLog(`Update complete: ${updated} models updated`);
    }
  }, [lastMergeStats, syncState.syncSummary, syncState.setSyncSummary, modalState.setImportToast, consoleLogging.addConsoleLog]);

  /**
   * Syncs model data from all configured sources
   */
  async function syncAll(showSpinner = true) {
    try {
      if (showSpinner) syncState.setIsSyncing(true);
      setLastMergeStats(null);

      // Save a snapshot before sync (for rollback)
      if (models.length > 0) {
        syncHistory.saveSnapshot(models, `Pre-sync backup (${models.length} models)`);
        consoleLogging.addConsoleLog("Created pre-sync snapshot for rollback");
      }

      const result = await syncAllSources(
        {
          dataSources: settings.dataSources || {},
          artificialAnalysisApiKey: settings.artificialAnalysisApiKey,
          enableNSFWFiltering: settings.enableNSFWFiltering,
          logNSFWAttempts: settings.logNSFWAttempts,
          apiConfig: settings.apiConfig,
          preferredModelProvider: settings.preferredModelProvider,
          systemPrompt: settings.systemPrompt
        },
        {
          onProgress: syncState.setSyncProgress,
          onLog: consoleLogging.addConsoleLog,
          onModelsUpdate: (newModels) => {
            setModels(prev => dedupe([...(prev || []), ...newModels]));
          }
        }
      );

      const uniqueCount = dedupe(result.complete).length;
      const dups = Math.max(0, result.complete.length - uniqueCount);
      syncState.setSyncSummary({ found: result.complete.length, flagged: result.flagged.length, duplicates: dups });
      mergeInModels(result.complete);
      syncState.setLastSync(new Date().toISOString());
      setPage(1);

      if (result.flagged.length > 0) {
        modalState.setFlaggedModels(result.flagged);
        modalState.setShowFlaggedModal(true);
      }

      setTimeout(() => {
        if (showSpinner) {
          syncState.setSyncProgress(null);
          syncState.setIsSyncing(false);
        }
      }, 1500);
    } catch (error) {
      console.error("Error syncing models:", error);
      consoleLogging.addConsoleLog(`Error syncing models: ${error instanceof Error ? error.message : String(error)}`);
      if (showSpinner) {
        syncState.setSyncProgress(null);
        syncState.setIsSyncing(false);
      }
    }
  }

  /**
   * Handles importing models from file
   */
  function handleImport(importedModels: Model[]) {
    importModels(importedModels);
    modalState.setShowImport(false);
    const cnt = importedModels?.length || 0;
    modalState.setImportToast({ found: cnt, added: cnt, updated: 0, flagged: 0 });
  }

  /**
   * Handles live sync with AI services and custom options
   */
  async function handleLiveSync(options?: {
    autoRefresh?: { enabled: boolean, interval: number, unit: string },
    minDownloadsBypass?: number,
    systemPrompt?: string,
    apiConfig?: ApiDir
  }) {
    if (options?.minDownloadsBypass !== undefined) {
      uiState.setMinDownloads(options.minDownloadsBypass);
    }
    if (options?.systemPrompt && options?.apiConfig) {
      syncState.setIsSyncing(true);
      setLastMergeStats(null);
      try {
        const result = await syncWithLiveOptions(
          {
            dataSources: settings.dataSources || {},
            artificialAnalysisApiKey: settings.artificialAnalysisApiKey,
            enableNSFWFiltering: settings.enableNSFWFiltering,
            logNSFWAttempts: settings.logNSFWAttempts,
            apiConfig: options.apiConfig,
            preferredModelProvider: settings.preferredModelProvider,
            systemPrompt: options.systemPrompt,
            autoRefresh: options.autoRefresh,
            minDownloadsBypass: options.minDownloadsBypass
          },
          {
            onProgress: syncState.setSyncProgress,
            onLog: consoleLogging.addConsoleLog
          }
        );

        const uniqueCount = dedupe(result.complete).length;
        const dups = Math.max(0, result.complete.length - uniqueCount);
        syncState.setSyncSummary({ found: result.complete.length, flagged: result.flagged.length, duplicates: dups });
        mergeInModels(result.complete);
        syncState.setLastSync(new Date().toISOString());
        setPage(1);

        if (result.flagged.length > 0) {
          modalState.setFlaggedModels(result.flagged);
          modalState.setShowFlaggedModal(true);
        }
      } catch (err) {
        console.error("Error syncing models:", err);
        consoleLogging.addConsoleLog(`Error syncing models: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setTimeout(() => {
          syncState.setSyncProgress(null);
          syncState.setIsSyncing(false);
          modalState.setShowSync(false);
        }, 1500);
        return;
      }
    } else {
      await syncAll(true);
    }
    modalState.setShowSync(false);
  }

  /**
   * Checks if API keys are available (local settings only)
   */
  async function hasApiKeys() {
    return settings && settings.apiConfig && Object.values(settings.apiConfig).some(cfg => cfg.enabled && cfg.apiKey);
  }

  /**
   * Syncs models - shows wizard if DB is empty, otherwise just syncs
   */
  async function handleSyncWithApiCheck() {
    if (models.length === 0) {
      // Show onboarding wizard for empty database
      modalState.setShowOnboarding(true);
    } else {
      await syncAll(true);
    }
  }

  /**
   * Handlers for flagged model actions
   */
  const handleApproveFlagged = (model: Model) => {
    setModels((prev: Model[]) => dedupe([...prev, model]));
    modalState.setFlaggedModels(modalState.flaggedModels.filter((m: Model) => m.id !== model.id));
  };
  const handleDenyFlagged = (model: Model) => {
    modalState.setFlaggedModels(modalState.flaggedModels.filter((m: Model) => m.id !== model.id));
  };
  const handleEditFlagged = (model: Model) => {
    modalState.setFlaggedModels(modalState.flaggedModels.map((m: Model) => m.id === model.id ? model : m));
  };

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (model: Model, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(model.id);
      else next.delete(model.id);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // Select all currently filtered/visible items
      setSelectedIds(new Set(pageItems.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleUndoableDelete = (modelsToDelete: Model[]) => {
    // 1. Remove from UI
    const idsToDelete = new Set(modelsToDelete.map(m => m.id));
    setModels(prev => prev.filter(m => !idsToDelete.has(m.id)));

    // Clear selection if any of the deleted items were selected
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const id of idsToDelete) next.delete(id);
      return next;
    });

    // 2. Show Undo Toast
    const count = modelsToDelete.length;
    modalState.setUndoToast({
      message: `Deleted ${count} model${count !== 1 ? 's' : ''}`,
      onUndo: () => {
        // Restore models
        setModels(prev => dedupe([...prev, ...modelsToDelete]));
      },
      duration: 5000
    });
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} models?`)) {
      const modelsToDelete = models.filter(m => selectedIds.has(m.id));
      handleUndoableDelete(modelsToDelete);
      consoleLogging.addConsoleLog(`Bulk deleted ${selectedIds.size} models.`);
    }
  };

  const handleBulkExport = () => {
    const modelsToExport = models.filter(m => selectedIds.has(m.id));
    exportModels({ format: 'json', models: modelsToExport });
    consoleLogging.addConsoleLog(`Exported ${modelsToExport.length} models.`);
  };

  const bgRoot = theme === "dark" ? "bg-black text-zinc-100" : "bg-white text-black";

  // Loading screen
  if (isLoading) {
    const textSubtle = theme === "dark" ? "text-zinc-400" : "text-gray-800";
    return (
      <div className={`min-h-screen ${bgRoot} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4 max-w-md w-full px-4">
          <DatabaseZap className="size-16 animate-pulse text-accent" />
          <div className="text-center w-full">
            <h2 className="text-xl font-semibold mb-2">Loading Model Database</h2>
            <p className={`text-sm ${textSubtle} mb-4`}>Please wait while we load your models...</p>
            {loadingProgress && (
              <div className="w-full">
                <div className="flex justify-between text-xs mb-1">
                  <span>{loadingProgress.current.toLocaleString()} models</span>
                  <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgRoot}`}>
      {/* Update Toast Notification */}
      {showUpdateToast && (
        <div className={`fixed top-24 right-4 z-[100] animate-in slide-in-from-right fade-in duration-300 ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-200'} border shadow-2xl rounded-xl p-4 max-w-sm`}>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-violet-600 rounded-lg text-white">
              <RefreshCw className="size-5" />
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold text-sm mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>New Update Available</h4>
              <p className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`}>
                Version {updateVersion} is available to download.
              </p>
            </div>
            <button onClick={() => setShowUpdateToast(false)} className={`p-1 rounded-md hover:bg-black/5 ${theme === 'dark' ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="bg-amber-500/90 backdrop-blur text-white text-xs font-bold text-center py-1 sticky top-0 z-50">
          ⚠️ OFFLINE MODE - Network features disabled
        </div>
      )}
      <Header
        query={uiState.query}
        onQueryChange={uiState.setQuery}
        searchRef={searchRef}
        isSyncing={syncState.isSyncing}
        onSync={handleSyncWithApiCheck}
        onAddModel={() => modalState.setShowAddModel(true)}
        onImport={() => modalState.setShowImport(true)}
        onSettings={() => modalState.setShowSync(true)}
        theme={theme}
        hasUpdate={updateAvailable}
      />

      <div className="w-full px-4 py-2">
        <Toolbar
          isSyncing={syncState.isSyncing}
          syncProgress={syncState.syncProgress}
          lastSync={syncState.lastSync}
          pageItems={pageItems}
          total={total}
          minDownloads={uiState.minDownloads}
          pageSize={uiState.pageSize}
          onPageSizeChange={(size) => {
            uiState.setPageSize(size);
            setPage(1);
          }}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalModels={models.length}
          onExport={() => modalState.setShowExportModal(true)}
          onDeleteDatabase={() => {
            modalState.setConfirmationToast({
              title: 'Delete Database',
              message: 'Wipe all local data, caches and IndexedDB for this app? This CANNOT be undone.',
              type: 'error',
              confirmText: 'Delete All Data',
              onConfirm: async () => {
                try {
                  await (window as any).__hardReset?.();
                } catch { }
                window.dispatchEvent(new CustomEvent('hard-reset'));
              }
            });
          }}
          onValidateModels={validateModels}
          theme={theme}
        />
      </div>

      <MainLayout
        domainPick={uiState.domainPick}
        onDomainChange={uiState.setDomainPick}
        minDownloads={uiState.minDownloads}
        onMinDownloadsChange={uiState.setMinDownloads}
        licenseTypes={uiState.licenseTypes}
        onLicenseTypesChange={uiState.setLicenseTypes}
        commercialAllowed={uiState.commercialAllowed}
        onCommercialAllowedChange={uiState.setCommercialAllowed}
        includeTags={uiState.includeTags}
        onIncludeTagsChange={uiState.setIncludeTags}
        excludeTags={uiState.excludeTags}
        onExcludeTagsChange={uiState.setExcludeTags}
        favoritesOnly={uiState.favoritesOnly}
        onFavoritesOnlyChange={uiState.setFavoritesOnly}
        onClearFilters={() => {
          uiState.setLicenseTypes([]);
          uiState.setCommercialAllowed(null);
          uiState.setIncludeTags([]);
          uiState.setExcludeTags([]);
          uiState.setMinDownloads(0);
          uiState.setDomainPick('All');
          uiState.setFavoritesOnly(false);
        }}
        models={visibleItems}
        sortKey={uiState.sortKey}
        sortDirection={uiState.sortDirection}
        onSortChange={(key, direction) => {
          uiState.setSortKey(key);
          uiState.setSortDirection(direction);
        }}
        onModelOpen={(model, element) => {
          if (uiState.open && uiState.open.id === model.id) {
            uiState.setOpen(null);
            uiState.setTriggerElement(null);
          } else {
            uiState.setOpen(model);
            uiState.setTriggerElement(element || null);
          }
        }}
        hasMore={hasMore && uiState.pageSize === null}
        sentinelRef={sentinelRef}
        displayCount={displayCount}
        totalCount={totalCount}
        openModel={uiState.open}
        onCloseDetail={() => {
          uiState.setOpen(null);
          uiState.setTriggerElement(null);
        }}
        onDeleteModel={(id) => {
          const m = models.find(m => m.id === id);
          if (m) handleUndoableDelete([m]);
        }}
        triggerElement={uiState.triggerElement}
        isSyncing={syncState.isSyncing}
        filteredCount={filtered.length}
        onShowOnboarding={() => modalState.setShowOnboarding(true)}
        onShowImport={() => modalState.setShowImport(true)}
        theme={theme}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        onToggleFavorite={(model) => {
          setModels(prev => prev.map(m => m.id === model.id ? { ...m, isFavorite: !m.isFavorite } : m));
        }}
      />

      <OnboardingWizard
        isOpen={modalState.showOnboarding}
        onClose={() => modalState.setShowOnboarding(false)}
        onComplete={() => {
          modalState.setShowOnboarding(false);
          handleLiveSync();
        }}
      />

      <AddModelModal
        isOpen={modalState.showAddModel}
        onClose={() => modalState.setShowAddModel(false)}
        onAddModel={addModel}
        domains={["All", "LLM", "VLM", "ImageGen", "VideoGen", "Audio", "ASR", "TTS", "3D", "World/Sim", "LoRA", "FineTune", "BackgroundRemoval", "Upscaler", "Other"] as const}
        addConsoleLog={consoleLogging.addConsoleLog}
      />

      <ImportModal
        isOpen={modalState.showImport}
        onClose={() => modalState.setShowImport(false)}
        onImport={handleImport}
        addConsoleLog={consoleLogging.addConsoleLog}
      />

      <SettingsModal
        isOpen={modalState.showSync}
        onClose={() => modalState.setShowSync(false)}
        onSync={handleLiveSync}
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
        onApprove={handleApproveFlagged}
        onDeny={handleDenyFlagged}
        onEdit={handleEditFlagged}
        onClose={() => modalState.setShowFlaggedModal(false)}
        addConsoleLog={consoleLogging.addConsoleLog}
      />

      <ModelEditor
        model={selectedModelForEdit}
        isOpen={showModelEditor}
        onClose={closeModelEditor}
        onSave={saveModelEdit}
      />

      <ExportModal
        isOpen={modalState.showExportModal}
        onClose={() => modalState.setShowExportModal(false)}
        onExport={(format, scope, customCriteria) => {
          if (scope === 'custom' && customCriteria) {
            const fullCriteria = {
              query: '',
              domainPick: 'All',
              sortKey: 'recent',
              sortDirection: 'asc' as const,
              minDownloads: 0,
              pageSize: null,
              ...customCriteria
            } as any;

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

      <SimpleValidationModal
        isOpen={showValidationModal}
        onClose={closeValidationModal}
        onValidateAll={async (opts?: any) => {
          const result = await validateEntireDatabase({
            batchSize: opts?.batchSize ?? 50,
            pauseMs: opts?.pauseMs ?? 60000,
            maxBatches: opts?.maxBatches ?? 0,
            apiConfig: settings.apiConfig,
            preferredModelProvider: settings.preferredModelProvider
          });
          if (result.success && result.updatedModels) {
            setModels(result.updatedModels);
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
        onDismissValidation={() => validationState.setValidationToast(null)}
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
        onCancel={() => modalState.setConfirmationToast(null)}
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

      <ConsoleButton
        showConsole={consoleLogging.showConsole}
        onShowConsole={() => consoleLogging.setShowConsole(true)}
        theme={theme}
      />
    </div>
  );
}

/**
 * Main AI Model Database Pro component with context providers.
 * Provides theme, settings, and update context to the application.
 */
export default function AIModelDBPro() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <UpdateProvider>
          <AIModelDBProContent />
        </UpdateProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
