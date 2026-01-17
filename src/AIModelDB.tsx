import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { UpdateProvider } from "./context/UpdateContext";
import { ModalProvider } from "./context/ModalContext";
import { useDashboardController } from "./hooks/useDashboardController";
import { ModalManager } from "./components/ModalManager";
import { LoadingScreen } from "./components/LoadingScreen";
import { Header } from "./components/layout/Header";
import { Toolbar } from "./components/layout/Toolbar";
import { MainLayout } from "./components/layout/MainLayout";
import { FiltersSidebar } from "./components/layout/FiltersSidebar";
import { FloatingToolbar } from "./components/layout/FloatingToolbar";
import { TitleBar } from "./components/TitleBar";
import { UpdateProgress } from "./components/UpdateProgress";
import { ModelTable } from "./components/table/ModelTable";
import { DetailPanel } from "./components/DetailPanel";
import { SkeletonRow } from "./components/ModelRow";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EmptyState } from "./components/EmptyState";

/**
 * Main content component for the AI Model Database application.
 * Uses useDashboardController for all business logic and state management.
 */
function AIModelDBContent() {
  const controller = useDashboardController();
  const {
    t,
    theme,
    bgRoot,
    settings,
    saveSettings,
    updateState,
    showUpdateProgress,
    setShowUpdateProgress,
    showShortcutsModal,
    setShowShortcutsModal,
    uiState,
    syncState,
    validationState,
    validationSummary,
    setValidationSummary,
    showComponentValidationResults,
    setShowComponentValidationResults,
    handleViewValidationDetails,
    modalState,
    consoleLogging,
    isOnline,
    hasApiProvider,
    searchRef,
    flagModalOpen,
    setFlagModalOpen,
    modelToFlag,
    setModelToFlag,
    models,
    setModels,
    addModel,
    importModels,
    validateModels,
    isValidating,
    validationJobs,
    pauseValidation,
    resumeValidation,
    stopValidation,
    clearFinishedValidationJobs,
    selectedModelForEdit,
    showModelEditor,
    closeModelEditor,
    saveModelEdit,
    showValidationModal,
    closeValidationModal,
    validateEntireDatabase,
    isLoading,
    loadingProgress,
    validationProgress,
    filtered,
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    visibleItems,
    hasMore,
    displayCount,
    totalCount,
    sentinelRef,
    syncAll,
    handleLiveSync,
    handleSyncWithApiCheck,
    selectedIds,
    handleSelect,
    handleSelectAll,
    handleUndoableDelete,
    handleBulkDelete,
    handleBulkExport,
    handleToggleFavorite,
    handleToggleNSFWFlag,
    handleToggleImageNSFW,
  } = controller;

  // Loading screen
  if (isLoading) {
    return (
      <LoadingScreen
        theme={theme === 'dark' ? 'dark' : 'light'}
        progress={loadingProgress}
      />
    );
  }

  return (
    <>
      <TitleBar />
      <div className={`min-h-screen ${bgRoot}`}>
        {/* Update Progress Toast */}
        <UpdateProgress
          show={showUpdateProgress}
          onDismiss={() => setShowUpdateProgress(false)}
        />

        {!isOnline && (
          <div className="bg-amber-500/90 backdrop-blur text-white text-xs font-bold text-center py-1 sticky top-0 z-50">
            {t('app.offlineMode')}
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
          hasUpdate={updateState.updateAvailable}
        />

        <div className="w-full px-4 py-3 pb-6 sticky top-8 z-30 bg-black">
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
                title: t('settings.system.maintenance.deleteDbConfirmTitle'),
                message: t('settings.system.maintenance.deleteDbConfirmMessage'),
                type: 'error',
                confirmText: t('settings.system.maintenance.deleteDbConfirmButton'),
                onConfirm: () => {
                  window.dispatchEvent(new CustomEvent('hard-reset'));
                }
              });
            }}
            onValidateModels={validateModels}
            theme={theme}
            hasDetailOpen={!!uiState.open}
          />
        </div>

        <MainLayout
          sidebar={
            <ErrorBoundary name="Filters">
              <FiltersSidebar
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
                hideNSFW={uiState.hideNSFW}
                onHideNSFWChange={uiState.setHideNSFW}
                onClearFilters={() => {
                  uiState.setLicenseTypes([]);
                  uiState.setCommercialAllowed(null);
                  uiState.setIncludeTags([]);
                  uiState.setExcludeTags([]);
                  uiState.setMinDownloads(0);
                  uiState.setDomainPick('All');
                  uiState.setFavoritesOnly(false);
                  uiState.setHideNSFW(false);
                }}
                theme={theme}
              />
            </ErrorBoundary>
          }
          content={
            <ErrorBoundary name="Model Table">
              {syncState.isSyncing && filtered.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  onSetupSources={() => modalState.setShowOnboarding(true)}
                  onImport={() => modalState.setShowImport(true)}
                />
              ) : (
                <ModelTable
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
                  theme={theme}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  activeModelId={uiState.open?.id}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleNSFWFlag={handleToggleNSFWFlag}
                />
              )}
            </ErrorBoundary>
          }
          detailPanel={
            uiState.open ? (
              <ErrorBoundary name="Detail Panel" onReset={() => {
                uiState.setOpen(null);
                uiState.setTriggerElement(null);
              }}>
                <DetailPanel
                  model={visibleItems.find(m => m.id === uiState.open?.id) || uiState.open}
                  onClose={() => {
                    uiState.setOpen(null);
                    uiState.setTriggerElement(null);
                  }}
                  onDelete={(id) => {
                    const m = models.find(m => m.id === id);
                    if (m) handleUndoableDelete([m]);
                  }}
                  triggerElement={uiState.triggerElement}
                  hideNSFW={uiState.hideNSFW}
                  className="lg:max-h-[calc(100vh-100px)]"
                  onToggleFavorite={handleToggleFavorite}
                  onToggleNSFWFlag={handleToggleNSFWFlag}
                  onToggleImageNSFW={handleToggleImageNSFW}
                />
              </ErrorBoundary>
            ) : null
          }
          toolbar={
            filtered.length > 0 && (
              <FloatingToolbar
                selectedIds={selectedIds}
                models={visibleItems}
                theme={theme}
                onBulkDelete={handleBulkDelete}
                onBulkExport={handleBulkExport}
                onSelectAll={handleSelectAll}
              />
            )
          }
        />

        <ModalManager
          models={models}
          setModels={setModels}
          theme={theme === 'dark' ? 'dark' : 'light'}
          settings={settings}
          saveSettings={saveSettings}
          uiState={uiState}
          consoleLogging={consoleLogging}
          validationState={validationState}
          validationSummary={validationSummary}
          setValidationSummary={setValidationSummary}
          showComponentValidationResults={showComponentValidationResults}
          setShowComponentValidationResults={setShowComponentValidationResults}
          showValidationModal={showValidationModal}
          closeValidationModal={closeValidationModal}
          validateEntireDatabase={validateEntireDatabase}
          validationJobs={validationJobs}
          isValidating={isValidating}
          stopValidation={stopValidation}
          clearFinishedValidationJobs={clearFinishedValidationJobs}
          pauseValidation={pauseValidation}
          resumeValidation={resumeValidation}
          validationProgress={validationProgress}
          setValidationToast={validationState.setValidationToast}
          flagModalOpen={flagModalOpen}
          setFlagModalOpen={setFlagModalOpen}
          modelToFlag={modelToFlag}
          setModelToFlag={setModelToFlag}
          onAddModel={addModel}
          onImport={importModels}
          onLiveSync={handleLiveSync}
          syncAll={syncAll}
          selectedModelForEdit={selectedModelForEdit}
          showModelEditor={showModelEditor}
          onCloseModelEditor={closeModelEditor}
          onSaveModelEdit={saveModelEdit}
          hasApiProvider={hasApiProvider}
          showShortcutsModal={showShortcutsModal}
          setShowShortcutsModal={setShowShortcutsModal}
          handleViewValidationDetails={handleViewValidationDetails}
        />
      </div>
    </>
  );
}

export default function AIModelDB() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <UpdateProvider>
          <ModalProvider>
            <AIModelDBContent />
          </ModalProvider>
        </UpdateProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
