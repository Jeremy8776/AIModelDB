import { useMemo, useState, useEffect, useRef } from "react";
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
import { getRuntimeLabel, getSetupRequirement, RUNTIME_SORT_WEIGHT, SETUP_SORT_WEIGHT } from "./utils/mcpDisplay";
import { countQueryMatches } from "./utils/searchMatch";
import { buildSearchSuggestions } from "./utils/searchSuggestions";
import { buildDatabaseExportBundle } from "./utils/exportBundle";
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
import { SectionEmptyState } from "./components/SectionEmptyState";
import { MCPServer } from "./types";
import { isElectron } from "./utils/electron";
import { shouldShowDatabaseWelcome } from "./utils/databaseVisibility";

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
  const globalSyncStartCounts = useRef<{ models: number; mcp: number; skills: number } | null>(null);
  const globalSyncWasSyncing = useRef(false);

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
    lastMergeStats,
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
  const mcpSorted = useMemo(() => {
    const arr = [...mcpFiltered];
    const dir = mcpSortDirection === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      const favDelta = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      if (favDelta !== 0) return favDelta;
      if (mcpSortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (mcpSortKey === 'runtime') {
        const ra = getRuntimeLabel(a);
        const rb = getRuntimeLabel(b);
        const kindDelta = RUNTIME_SORT_WEIGHT[ra.kind] - RUNTIME_SORT_WEIGHT[rb.kind];
        if (kindDelta !== 0) return kindDelta * dir;
        return ra.detail.localeCompare(rb.detail) * dir;
      }
      if (mcpSortKey === 'setup') {
        return (SETUP_SORT_WEIGHT[getSetupRequirement(a)] - SETUP_SORT_WEIGHT[getSetupRequirement(b)]) * dir;
      }
      if (mcpSortKey === 'verified') {
        const score = (s: MCPServer) => (s.namespaceVerified ? 4 : 0) + (s.imageVerified ? 2 : 0) + (s.directoryVerified ? 1 : 0);
        return (score(a) - score(b)) * dir;
      }
      // Default sort = release date (published preferred, fallback updated).
      const aV = a.publishedAt ?? a.updatedAt;
      const bV = b.publishedAt ?? b.updatedAt;
      return ((aV ? Date.parse(aV) : 0) - (bV ? Date.parse(bV) : 0)) * dir;
    });
  }, [mcpFiltered, mcpSortKey, mcpSortDirection]);

  const mcpTotalPages = mcpPageSize ? Math.max(1, Math.ceil(mcpSorted.length / mcpPageSize)) : 1;
  const mcpPageItems = useMemo(() => {
    if (!mcpPageSize) return mcpSorted;
    const start = (mcpPage - 1) * mcpPageSize;
    return mcpSorted.slice(start, start + mcpPageSize);
  }, [mcpSorted, mcpPage, mcpPageSize]);

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

  const skillsSorted = useMemo(() => {
    const arr = [...skillsFiltered];
    const dir = skillSortDirection === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      const favDelta = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      if (favDelta !== 0) return favDelta;
      if (skillSortKey === 'release_date') {
        const aT = a.updated_at ? Date.parse(a.updated_at) : 0;
        const bT = b.updated_at ? Date.parse(b.updated_at) : 0;
        return (aT - bT) * dir;
      }
      if (skillSortKey === 'type') return a.type.localeCompare(b.type) * dir;
      if (skillSortKey === 'family') return (a.family || 'zzz').localeCompare(b.family || 'zzz') * dir;
      if (skillSortKey === 'origin') return a.origin.localeCompare(b.origin) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [skillsFiltered, skillSortKey, skillSortDirection]);

  const skillTotalPages = skillPageSize ? Math.max(1, Math.ceil(skillsSorted.length / skillPageSize)) : 1;
  const skillPageItems = useMemo(() => {
    if (!skillPageSize) return skillsSorted;
    const start = (skillPage - 1) * skillPageSize;
    return skillsSorted.slice(start, start + skillPageSize);
  }, [skillsSorted, skillPage, skillPageSize]);

  useEffect(() => {
    if (skillPage > skillTotalPages) setSkillPage(1);
  }, [skillPage, skillTotalPages]);

  const currentMcpSelected = useMemo(
    () => mcpSelected ? mcp.servers.find(server => server.id === mcpSelected.id) || null : null,
    [mcpSelected, mcp.servers]
  );
  const currentSkillSelected = useMemo(
    () => skillSelected ? skills.skills.find(skill => skill.id === skillSelected.id) || null : null,
    [skillSelected, skills.skills]
  );

  // Cross-tab search match counts — must sit ABOVE the isLoading early return
  // so hook order stays stable across loading/loaded renders.
  const trimmedQuery = uiState.query.trim();
  const hasActiveQuery = trimmedQuery.length > 0;
  const matchCounts = useMemo(
    () => countQueryMatches(models, mcp.servers, skills.skills, trimmedQuery),
    [models, mcp.servers, skills.skills, trimmedQuery]
  );
  const searchSuggestions = useMemo(
    () => buildSearchSuggestions({
      query: uiState.query,
      models,
      mcp: mcp.servers,
      skills: skills.skills,
    }),
    [uiState.query, models, mcp.servers, skills.skills]
  );
  const anyGlobalSyncing = syncState.isSyncing || mcp.isSyncing || skills.isSyncing || isSaving;
  const databaseCounts = useMemo(() => ({
    models: models.length,
    mcp: mcp.servers.length,
    skills: skills.skills.length,
  }), [models.length, mcp.servers.length, skills.skills.length]);
  const showDatabaseWelcome = shouldShowDatabaseWelcome(databaseCounts, anyGlobalSyncing);

  useEffect(() => {
    if (!globalSyncStartCounts.current) return;
    if (anyGlobalSyncing) {
      globalSyncWasSyncing.current = true;
      return;
    }
    if (!globalSyncWasSyncing.current) return;

    const startedWith = globalSyncStartCounts.current;
    const modelsAdded = Math.max(0, models.length - startedWith.models);
    const mcpAdded = Math.max(0, mcp.servers.length - startedWith.mcp);
    const skillsAdded = Math.max(0, skills.skills.length - startedWith.skills);

    modalState.setImportToast({
      scope: 'sync',
      found: models.length,
      added: modelsAdded + mcpAdded + skillsAdded,
      updated: lastMergeStats?.updated || 0,
      flagged: syncState.syncSummary?.flagged || 0,
      duplicates: (lastMergeStats?.duplicates || 0) + (syncState.syncSummary?.duplicates || 0),
      entityBreakdown: {
        models: models.length,
        mcp: mcp.servers.length,
        skills: skills.skills.length,
      },
    });
    globalSyncStartCounts.current = null;
    globalSyncWasSyncing.current = false;
  }, [
    anyGlobalSyncing,
    models.length,
    mcp.servers.length,
    skills.skills.length,
    lastMergeStats,
    syncState.syncSummary,
    modalState,
  ]);

  // Loading screen
  if (isLoading) {
    return (
      <LoadingScreen
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    );
  }

  // ─── Entity-aware sync dispatcher (Header Sync button) ───
  // The Header's Sync button is a GLOBAL sync — it refreshes every entity type
  // (Models + MCP servers + Skills) in one click, regardless of the active tab.
  // Each entity only syncs the data sources enabled in Settings; each hook also
  // guards its own in-flight state, so re-clicking is a no-op per source.
  const handleSync = () => {
    globalSyncStartCounts.current = {
      models: models.length,
      mcp: mcp.servers.length,
      skills: skills.skills.length,
    };
    globalSyncWasSyncing.current = false;
    handleSyncWithApiCheck();          // Models (full sync; may prompt for API check)
    mcp.syncAll();                     // MCP servers (every enabled source)
    skills.syncAll();                  // Skills (every enabled source)
  };

  const handleGlobalExport = () => {
    const bundle = buildDatabaseExportBundle(models, mcp.servers, skills.skills);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-model-db-all-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    consoleLogging.addConsoleLog(`Exported all data: ${models.length} models, ${mcp.servers.length} MCP servers, ${skills.skills.length} skills.`);
  };

  const handleGlobalDeleteDatabase = () => {
    modalState.setConfirmationToast({
      title: 'Delete all local database data?',
      message: 'This removes models, MCP servers, skills, sync metadata, caches, and local database records. Settings and API keys are preserved.',
      type: 'error',
      confirmText: 'Delete all data',
      onConfirm: () => {
        window.dispatchEvent(new CustomEvent('hard-reset'));
        mcp.clearAll();
        skills.clearAll();
        consoleLogging.addConsoleLog('Deleted all local database data.');
      }
    });
  };

  // ─── Build the slot contents per entity ───

  // Sidebar
  let sidebarNode: React.ReactNode = null;
  if (showDatabaseWelcome) {
    sidebarNode = null;
  } else if (activeEntity === 'models') {
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
        ) : models.length === 0 ? (
          <SectionEmptyState
            title="No models in the local database"
            description="Use Sync All to refresh every enabled source, or import custom data when you want to manage this section manually."
            onSyncAll={handleSync}
            onImportCustom={() => modalState.setShowImport(true)}
          />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] p-8 text-center">
            <p className="text-sm text-text-secondary">
              No models match the current filters.
            </p>
          </div>
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
          onSyncAll={handleSync}
          onImportCustom={() => modalState.setShowImport(true)}
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
          onSyncAll={handleSync}
          onImportCustom={() => modalState.setShowImport(true)}
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
  const contentNode = showDatabaseWelcome ? (
    <EmptyState
      onSetupSources={() => modalState.setShowOnboarding(true)}
      onImport={() => modalState.setShowImport(true)}
    />
  ) : (
    <div>
      <EntityTabs matchCounts={matchCounts} hasActiveQuery={hasActiveQuery} />
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
  } else if (activeEntity === 'mcp' && currentMcpSelected) {
    detailPanelNode = (
      <ErrorBoundary name="MCP Detail Panel" onReset={() => setMcpSelected(null)}>
        <MCPDetailPanel
          server={currentMcpSelected}
          onClose={() => setMcpSelected(null)}
          onToggleFavorite={mcp.toggleFavorite}
          onDelete={mcp.deleteServer}
          className="lg:max-h-[calc(100vh-100px)]"
        />
      </ErrorBoundary>
    );
  } else if (activeEntity === 'skills' && currentSkillSelected) {
    detailPanelNode = (
      <ErrorBoundary name="Skills Detail Panel" onReset={() => setSkillSelected(null)}>
        <SkillsDetailPanel
          skill={currentSkillSelected}
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
      {/* --titlebar-h drives every sticky offset below. It's 2rem when the
          Electron custom title bar is present, 0 in the browser (where TitleBar
          renders nothing) — so the toolbar and table headers stick flush to the
          real top in both environments, with no uncovered strip for rows to
          bleed through. */}
      <div
        className={`min-h-screen ${bgRoot}`}
        style={{ ['--titlebar-h' as string]: isElectron() ? '2rem' : '0px' } as React.CSSProperties}
      >
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
          searchSuggestions={searchSuggestions}
          searchPlaceholder={
            activeEntity === 'mcp'
              ? t('header.searchPlaceholderMcp', { defaultValue: 'Search MCP servers, models, and skills…' })
              : activeEntity === 'skills'
                ? t('header.searchPlaceholderSkills', { defaultValue: 'Search skills, models, and MCP servers…' })
                : t('header.searchPlaceholderAll', { defaultValue: 'Search models, MCP servers, and skills…' })
          }
          isSyncing={syncState.isSyncing || mcp.isSyncing || skills.isSyncing || isSaving}
          onSync={handleSync}
          onAddModel={() => modalState.setShowAddModel(true)}
          onImport={() => modalState.setShowImport(true)}
          onSettings={() => modalState.setShowSync(true)}
          theme={theme}
          hasUpdate={updateState.updateAvailable}
        />

        {/* Toolbar — pagination/actions are Models-specific; on other tabs we
            still want the row's vertical rhythm but with neutral content. */}
        {/* Fixed-height toolbar (sticks at top-8 = 32px, height 64px -> bottom at
            96px). The table headers below stick at top-[6rem] (96px) so they butt
            against the toolbar exactly with no gap for rows to bleed through. */}
        {!showDatabaseWelcome && (
        <div className="w-full px-4 sticky top-[var(--titlebar-h)] z-40 bg-bg grid items-center py-3 lg:py-0 lg:h-16">
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
              onExport={handleGlobalExport}
              onDeleteDatabase={handleGlobalDeleteDatabase}
              onValidateModels={validateModels}
              theme={theme}
              hasDetailOpen={!!uiState.open}
            />
          ) : activeEntity === 'mcp' ? (
            <Toolbar
              isSyncing={mcp.isSyncing}
              syncProgress={mcp.syncProgress
                ? { current: mcp.syncProgress.page, total: 0, source: mcp.syncProgress.source, statusMessage: `${mcp.syncProgress.fetched.toLocaleString()} fetched` }
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
              onExport={handleGlobalExport}
              onDeleteDatabase={handleGlobalDeleteDatabase}
              onValidateModels={validateModels}
              theme={theme}
              hasDetailOpen={!!mcpSelected}
            />
          ) : (
            <Toolbar
              isSyncing={skills.isSyncing}
              syncProgress={skills.syncProgress
                ? { current: skills.syncProgress.page, total: 0, source: skills.syncProgress.source, statusMessage: `${skills.syncProgress.fetched.toLocaleString()} fetched` }
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
              onExport={handleGlobalExport}
              onDeleteDatabase={handleGlobalDeleteDatabase}
              onValidateModels={validateModels}
              theme={theme}
              hasDetailOpen={!!skillSelected}
            />
          )}
        </div>
        )}

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
