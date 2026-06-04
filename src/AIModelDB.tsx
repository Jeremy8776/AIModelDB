import { useMemo, useState, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { UpdateProvider } from "./context/UpdateContext";
import { ModalProvider } from "./context/ModalContext";
import { EntityTypeProvider, useEntityType } from "./context/EntityTypeContext";
import { useDashboardController } from "./hooks/useDashboardController";
import { useMCPServers } from "./hooks/useMCPServers";
import { ModalManager } from "./components/ModalManager";
import { LoadingScreen } from "./components/LoadingScreen";
import { Header } from "./components/layout/Header";
import { Toolbar } from "./components/layout/Toolbar";
import { MainLayout } from "./components/layout/MainLayout";
import { FiltersSidebar } from "./components/layout/FiltersSidebar";
import { FloatingToolbar } from "./components/layout/FloatingToolbar";
import { EntityTabs } from "./components/layout/EntityTabs";
import { MCPView } from "./components/views/MCPView";
import { MCPFiltersSidebar, MCPTransportFilter, MCPRegistryFilter, MCPVerifiedFilter } from "./components/views/MCPFiltersSidebar";
import { MCPDetailPanel } from "./components/views/MCPDetailPanel";
import { MCPSortKey } from "./components/views/MCPTableHeader";
import { SkillsView } from "./components/views/SkillsView";
import { SkillsFiltersSidebar, SkillTypeFilter, SkillOriginFilter } from "./components/views/SkillsFiltersSidebar";
import { SkillsDetailPanel } from "./components/views/SkillsDetailPanel";
import { SkillSortKey } from "./components/views/SkillsTableHeader";
import { useSkills } from "./hooks/useSkills";
import { TitleBar } from "./components/TitleBar";
import { UpdateProgress } from "./components/UpdateProgress";
import { ModelTable } from "./components/table/ModelTable";
import { DetailPanel } from "./components/DetailPanel";
import { SkeletonRow } from "./components/ModelRow";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EmptyState } from "./components/EmptyState";
import { MCPServer } from "./types";

/**
 * Main content component for the AI Model Database application.
 *
 * Single unified layout — Header + Toolbar + MainLayout(sidebar/content/detail).
 * The active entity tab (Models | MCP | Skills) swaps the contents of each
 * slot but never the layout itself. Tabs sit at the top of the content
 * column, styled as Chrome-style tabs that visually merge with the card below.
 */
function AIModelDBContent() {
  const { activeEntity } = useEntityType();
  const controller = useDashboardController();
  const mcp = useMCPServers();
  const skills = useSkills();

  // MCP-specific filter state (lives here so the MainLayout sidebar slot is
  // entity-agnostic; both the FiltersSidebar and MCPFiltersSidebar pull from
  // local state that matches their shape).
  const [mcpTransport, setMcpTransport] = useState<MCPTransportFilter>('all');
  const [mcpRegistry, setMcpRegistry] = useState<MCPRegistryFilter>('all');
  const [mcpVerified, setMcpVerified] = useState<MCPVerifiedFilter>('all');
  const [mcpFavoritesOnly, setMcpFavoritesOnly] = useState(false);
  const [mcpHasPackagesOnly, setMcpHasPackagesOnly] = useState(false);
  const [mcpHasRemotesOnly, setMcpHasRemotesOnly] = useState(false);
  const [mcpSelected, setMcpSelected] = useState<MCPServer | null>(null);
  const [mcpSortKey, setMcpSortKey] = useState<MCPSortKey>('updatedAt');
  const [mcpSortDirection, setMcpSortDirection] = useState<'asc' | 'desc'>('desc');
  const [mcpSelectedIds, setMcpSelectedIds] = useState<Set<string>>(new Set());
  const [mcpPage, setMcpPage] = useState(1);
  const [mcpPageSize, setMcpPageSize] = useState<number | null>(100);

  // Skills filter / sort / pagination / selection state (parallel to MCP).
  const [skillType, setSkillType] = useState<SkillTypeFilter>('all');
  const [skillOrigin, setSkillOrigin] = useState<SkillOriginFilter>('all');
  const [skillFamily, setSkillFamily] = useState<string>('all');
  const [skillFavoritesOnly, setSkillFavoritesOnly] = useState(false);
  const [skillSelected, setSkillSelected] = useState<import('./types').Skill | null>(null);
  const [skillSortKey, setSkillSortKey] = useState<SkillSortKey>('name');
  const [skillSortDirection, setSkillSortDirection] = useState<'asc' | 'desc'>('asc');
  const [skillSelectedIds, setSkillSelectedIds] = useState<Set<string>>(new Set());
  const [skillPage, setSkillPage] = useState(1);
  const [skillPageSize, setSkillPageSize] = useState<number | null>(100);

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
    isSaving,
  } = controller;

  // ─── Filtered MCP list — applies sidebar filters + the global search query ───
  // Declared above the loading early-return so hook order stays stable.
  const mcpFiltered = useMemo(() => {
    const q = uiState.query.trim().toLowerCase();
    return mcp.servers.filter(s => {
      if (mcpFavoritesOnly && !s.isFavorite) return false;
      if (mcpHasPackagesOnly && !(s.packages && s.packages.length)) return false;
      if (mcpHasRemotesOnly && !(s.remotes && s.remotes.length)) return false;
      if (mcpTransport !== 'all') {
        const types = (s.remotes || []).map(r => r.type);
        if (!types.includes(mcpTransport)) return false;
      }
      if (mcpRegistry !== 'all') {
        const types = (s.packages || []).map(p => p.registryType);
        if (!types.includes(mcpRegistry as typeof types[number])) return false;
      }
      if (mcpVerified === 'namespace' && !s.namespaceVerified) return false;
      if (mcpVerified === 'image' && !s.imageVerified) return false;
      if (mcpVerified === 'directory' && !s.directoryVerified) return false;
      if (q && !`${s.name} ${s.description ?? ''} ${s.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mcp.servers, mcpTransport, mcpRegistry, mcpVerified, mcpFavoritesOnly, mcpHasPackagesOnly, mcpHasRemotesOnly, uiState.query]);

  // MCP pagination — same page-size semantics as Models (null = show all).
  const mcpTotalPages = mcpPageSize ? Math.max(1, Math.ceil(mcpFiltered.length / mcpPageSize)) : 1;
  const mcpPageItems = useMemo(() => {
    if (!mcpPageSize) return mcpFiltered;
    const start = (mcpPage - 1) * mcpPageSize;
    return mcpFiltered.slice(start, start + mcpPageSize);
  }, [mcpFiltered, mcpPage, mcpPageSize]);

  // Snap back to page 1 if filters shrink the list below the current page.
  useEffect(() => {
    if (mcpPage > mcpTotalPages) setMcpPage(1);
  }, [mcpPage, mcpTotalPages]);

  // ─── Skills: distinct categories (for the filter dropdown) ───
  const skillFamilies = useMemo(() => {
    const set = new Set<string>();
    skills.skills.forEach(s => { if (s.family) set.add(s.family); });
    return Array.from(set).sort();
  }, [skills.skills]);

  // ─── Skills: filtered list (sidebar filters + global search) ───
  const skillsFiltered = useMemo(() => {
    const q = uiState.query.trim().toLowerCase();
    return skills.skills.filter(s => {
      if (skillFavoritesOnly && !s.isFavorite) return false;
      if (skillType !== 'all' && s.type !== skillType) return false;
      if (skillOrigin !== 'all' && s.origin !== skillOrigin) return false;
      if (skillFamily !== 'all' && s.family !== skillFamily) return false;
      if (q && !`${s.name} ${s.description ?? ''} ${s.id} ${(s.tags || []).join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [skills.skills, skillType, skillOrigin, skillFamily, skillFavoritesOnly, uiState.query]);

  const skillTotalPages = skillPageSize ? Math.max(1, Math.ceil(skillsFiltered.length / skillPageSize)) : 1;
  const skillPageItems = useMemo(() => {
    if (!skillPageSize) return skillsFiltered;
    const start = (skillPage - 1) * skillPageSize;
    return skillsFiltered.slice(start, start + skillPageSize);
  }, [skillsFiltered, skillPage, skillPageSize]);

  useEffect(() => {
    if (skillPage > skillTotalPages) setSkillPage(1);
  }, [skillPage, skillTotalPages]);

  // Loading screen
  if (isLoading) {
    return (
      <LoadingScreen
        theme={theme === 'dark' ? 'dark' : 'light'}
        progress={loadingProgress}
      />
    );
  }

  // ─── Entity-aware sync dispatcher (Header Sync button) ───
  const handleSync = () => {
    if (activeEntity === 'mcp') {
      mcp.syncOfficialRegistry();
    } else if (activeEntity === 'skills') {
      skills.syncOfficialMarketplace();
    } else if (activeEntity === 'models') {
      handleSyncWithApiCheck();
    }
  };

  // ─── Build the slot contents per entity ───

  // Sidebar
  let sidebarNode: React.ReactNode = null;
  if (activeEntity === 'models') {
    sidebarNode = (
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
    );
  } else if (activeEntity === 'mcp') {
    sidebarNode = (
      <ErrorBoundary name="MCP Filters">
        <MCPFiltersSidebar
          transport={mcpTransport}
          onTransportChange={setMcpTransport}
          registry={mcpRegistry}
          onRegistryChange={setMcpRegistry}
          verified={mcpVerified}
          onVerifiedChange={setMcpVerified}
          favoritesOnly={mcpFavoritesOnly}
          onFavoritesOnlyChange={setMcpFavoritesOnly}
          hasPackagesOnly={mcpHasPackagesOnly}
          onHasPackagesOnlyChange={setMcpHasPackagesOnly}
          hasRemotesOnly={mcpHasRemotesOnly}
          onHasRemotesOnlyChange={setMcpHasRemotesOnly}
          onClearFilters={() => {
            setMcpTransport('all');
            setMcpRegistry('all');
            setMcpVerified('all');
            setMcpFavoritesOnly(false);
            setMcpHasPackagesOnly(false);
            setMcpHasRemotesOnly(false);
          }}
        />
      </ErrorBoundary>
    );
  } else {
    sidebarNode = (
      <ErrorBoundary name="Skills Filters">
        <SkillsFiltersSidebar
          type={skillType}
          onTypeChange={setSkillType}
          origin={skillOrigin}
          onOriginChange={setSkillOrigin}
          family={skillFamily}
          onFamilyChange={setSkillFamily}
          families={skillFamilies}
          favoritesOnly={skillFavoritesOnly}
          onFavoritesOnlyChange={setSkillFavoritesOnly}
          onClearFilters={() => {
            setSkillType('all');
            setSkillOrigin('all');
            setSkillFamily('all');
            setSkillFavoritesOnly(false);
          }}
        />
      </ErrorBoundary>
    );
  }

  // Inner content (without the EntityTabs wrapper — wrapped below)
  let innerContent: React.ReactNode;
  if (activeEntity === 'models') {
    innerContent = (
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
    );
  } else if (activeEntity === 'mcp') {
    innerContent = (
      <ErrorBoundary name="MCP Table">
        <MCPView
          servers={mcpPageItems}
          totalCount={mcp.servers.length}
          isSyncing={mcp.isSyncing}
          syncProgress={mcp.syncProgress}
          lastError={mcp.meta.lastError}
          sortKey={mcpSortKey}
          sortDirection={mcpSortDirection}
          onSortChange={(key, dir) => {
            setMcpSortKey(key);
            setMcpSortDirection(dir);
          }}
          activeServerId={mcpSelected?.id ?? null}
          onOpen={(server) => setMcpSelected(prev => (prev?.id === server.id ? null : server))}
          onToggleFavorite={mcp.toggleFavorite}
          selectedIds={mcpSelectedIds}
          onSelect={(server, selected) => {
            setMcpSelectedIds(prev => {
              const next = new Set(prev);
              if (selected) next.add(server.id);
              else next.delete(server.id);
              return next;
            });
          }}
          onSelectAll={(selected) => {
            if (selected) {
              setMcpSelectedIds(new Set(mcpPageItems.map(s => s.id)));
            } else {
              setMcpSelectedIds(new Set());
            }
          }}
          theme={theme}
        />
      </ErrorBoundary>
    );
  } else {
    innerContent = (
      <ErrorBoundary name="Skills Table">
        <SkillsView
          skills={skillPageItems}
          totalCount={skills.skills.length}
          isSyncing={skills.isSyncing}
          syncProgress={skills.syncProgress}
          lastError={skills.meta.lastError}
          sortKey={skillSortKey}
          sortDirection={skillSortDirection}
          onSortChange={(key, dir) => {
            setSkillSortKey(key);
            setSkillSortDirection(dir);
          }}
          activeSkillId={skillSelected?.id ?? null}
          onOpen={(skill) => setSkillSelected(prev => (prev?.id === skill.id ? null : skill))}
          onToggleFavorite={skills.toggleFavorite}
          selectedIds={skillSelectedIds}
          onSelect={(skill, selected) => {
            setSkillSelectedIds(prev => {
              const next = new Set(prev);
              if (selected) next.add(skill.id);
              else next.delete(skill.id);
              return next;
            });
          }}
          onSelectAll={(selected) => {
            if (selected) setSkillSelectedIds(new Set(skillPageItems.map(s => s.id)));
            else setSkillSelectedIds(new Set());
          }}
          theme={theme}
        />
      </ErrorBoundary>
    );
  }

  // Tabs sit directly above the content's own card; the active tab's bottom
  // edge overlaps (and effectively paints over) the table's top border so it
  // appears merged with the workspace beneath. No outer wrapper card — that
  // would produce double borders since ModelTable / MCPTable each already
  // render their own card chrome.
  const contentNode = (
    <div>
      <EntityTabs />
      {innerContent}
    </div>
  );

  // Detail panel
  let detailPanelNode: React.ReactNode = null;
  if (activeEntity === 'models' && uiState.open) {
    detailPanelNode = (
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
    );
  } else if (activeEntity === 'mcp' && mcpSelected) {
    detailPanelNode = (
      <ErrorBoundary name="MCP Detail Panel" onReset={() => setMcpSelected(null)}>
        <MCPDetailPanel
          server={mcpSelected}
          onClose={() => setMcpSelected(null)}
          onToggleFavorite={mcp.toggleFavorite}
          onDelete={mcp.deleteServer}
          className="lg:max-h-[calc(100vh-100px)]"
        />
      </ErrorBoundary>
    );
  } else if (activeEntity === 'skills' && skillSelected) {
    detailPanelNode = (
      <ErrorBoundary name="Skills Detail Panel" onReset={() => setSkillSelected(null)}>
        <SkillsDetailPanel
          skill={skillSelected}
          onClose={() => setSkillSelected(null)}
          onToggleFavorite={skills.toggleFavorite}
          onDelete={skills.deleteSkill}
          className="lg:max-h-[calc(100vh-100px)]"
        />
      </ErrorBoundary>
    );
  }

  // Floating bulk-action toolbar is Models-specific (multi-select). Only render on Models.
  const floatingToolbarNode = activeEntity === 'models' && filtered.length > 0 ? (
    <FloatingToolbar
      selectedIds={selectedIds}
      models={visibleItems}
      theme={theme}
      onBulkDelete={handleBulkDelete}
      onBulkExport={handleBulkExport}
      onSelectAll={handleSelectAll}
    />
  ) : undefined;

  return (
    <>
      <TitleBar />
      <div className={`min-h-screen ${bgRoot}`}>
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
          isSyncing={
            (activeEntity === 'mcp' ? mcp.isSyncing : syncState.isSyncing) || isSaving
          }
          onSync={handleSync}
          onAddModel={() => modalState.setShowAddModel(true)}
          onImport={() => modalState.setShowImport(true)}
          onSettings={() => modalState.setShowSync(true)}
          theme={theme}
          hasUpdate={updateState.updateAvailable}
        />

        {/* Toolbar — pagination/actions are Models-specific; on other tabs we
            still want the row's vertical rhythm but with neutral content. */}
        <div className="w-full px-4 py-3 pb-6 sticky top-8 z-30 bg-bg">
          {activeEntity === 'models' ? (
            <Toolbar
              isSyncing={syncState.isSyncing || isSaving}
              syncProgress={syncState.syncProgress}
              lastSync={syncState.lastSync}
              pageSize={uiState.pageSize}
              onPageSizeChange={(size) => {
                uiState.setPageSize(size);
                setPage(1);
              }}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={models.length}
              itemLabel={t('entityTabs.models', { defaultValue: 'models' }).toLowerCase()}
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
          ) : activeEntity === 'mcp' ? (
            <Toolbar
              isSyncing={mcp.isSyncing}
              syncProgress={mcp.syncProgress
                ? { current: mcp.syncProgress.page, total: 0, statusMessage: `Syncing — ${mcp.syncProgress.fetched.toLocaleString()} fetched` }
                : null}
              lastSync={mcp.meta.lastSync}
              pageSize={mcpPageSize}
              onPageSizeChange={(size) => {
                setMcpPageSize(size);
                setMcpPage(1);
              }}
              page={mcpPage}
              totalPages={mcpTotalPages}
              onPageChange={setMcpPage}
              totalItems={mcp.servers.length}
              itemLabel="servers"
              onExport={() => mcp.exportServers?.()}
              onDeleteDatabase={() => {
                modalState.setConfirmationToast({
                  title: t('mcp.clearConfirmTitle', { defaultValue: 'Clear MCP cache?' }),
                  message: t('mcp.clearConfirmMessage', { defaultValue: 'This removes all locally cached MCP servers. You can re-sync from the registry at any time.' }),
                  type: 'error',
                  confirmText: t('mcp.clearConfirmButton', { defaultValue: 'Clear cache' }),
                  onConfirm: () => mcp.clearAll(),
                });
              }}
              theme={theme}
              hasDetailOpen={!!mcpSelected}
            />
          ) : (
            <Toolbar
              isSyncing={skills.isSyncing}
              syncProgress={skills.syncProgress
                ? { current: skills.syncProgress.page, total: 0, statusMessage: `Syncing — ${skills.syncProgress.fetched.toLocaleString()} fetched` }
                : null}
              lastSync={skills.meta.lastSync}
              pageSize={skillPageSize}
              onPageSizeChange={(size) => {
                setSkillPageSize(size);
                setSkillPage(1);
              }}
              page={skillPage}
              totalPages={skillTotalPages}
              onPageChange={setSkillPage}
              totalItems={skills.skills.length}
              itemLabel="skills"
              onExport={() => skills.exportSkills?.()}
              onDeleteDatabase={() => {
                modalState.setConfirmationToast({
                  title: t('skills.clearConfirmTitle', { defaultValue: 'Clear skills cache?' }),
                  message: t('skills.clearConfirmMessage', { defaultValue: 'This removes all locally cached skills. You can re-sync at any time.' }),
                  type: 'error',
                  confirmText: t('skills.clearConfirmButton', { defaultValue: 'Clear cache' }),
                  onConfirm: () => skills.clearAll(),
                });
              }}
              theme={theme}
              hasDetailOpen={!!skillSelected}
            />
          )}
        </div>

        <MainLayout
          sidebar={sidebarNode}
          content={contentNode}
          detailPanel={detailPanelNode}
          toolbar={floatingToolbarNode}
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
            <EntityTypeProvider>
              <AIModelDBContent />
            </EntityTypeProvider>
          </ModalProvider>
        </UpdateProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
