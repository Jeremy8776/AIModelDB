# Architecture Deep Dive

This document explains the architectural decisions and patterns in AI Model DB.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ELECTRON SHELL                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────┐│
│  │ Main Process│  │   Preload   │  │      Renderer (React)        ││
│  │  (Node.js)  │◄─┤   Bridge    │◄─┤                              ││
│  │             │  │             │  │                              ││
│  │ • Window    │  │ • IPC       │  │  ┌────────────────────────┐ ││
│  │ • Updates   │  │ • Context   │  │  │   Context Providers    │ ││
│  │ • Proxy     │  │   Bridge    │  │  │ Settings|Theme|Update  │ ││
│  │ • Translate │  │             │  │  └────────────────────────┘ ││
│  └─────────────┘  └─────────────┘  │  ┌────────────────────────┐ ││
│                                     │  │      Components        │ ││
│                                     │  │  Layout|Table|Modals   │ ││
│                                     │  └────────────────────────┘ ││
│                                     │  ┌────────────────────────┐ ││
│                                     │  │    Custom Hooks        │ ││
│                                     │  │ Controller|Sync|State  │ ││
│                                     │  └────────────────────────┘ ││
│                                     │  ┌────────────────────────┐ ││
│                                     │  │      Services          │ ││
│                                     │  │ Sync|Validation|API    │ ││
│                                     │  └────────────────────────┘ ││
│                                     └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
            ┌──────────────┐                   ┌──────────────┐
            │ localStorage │                   │ External APIs│
            │              │                   │              │
            │ • Models     │                   │ • HuggingFace│
            │ • Settings   │                   │ • Civitai    │
            │ • Theme      │                   │ • OpenAI     │
            │ • History    │                   │ • Google     │
            └──────────────┘                   └──────────────┘
```

---

## Layer Responsibilities

### 1. Electron Main Process

**Location**: `electron/main.js`

The main process runs in Node.js and handles:

| Responsibility | Why Here? |
|---------------|-----------|
| Window management | Only main process can create windows |
| Auto-updates | Requires file system access |
| Proxy requests | CORS bypass for external APIs |
| Translation | Google Translate library needs Node.js |

**Key Pattern**: The main process acts as a **proxy** for requests that would be blocked by CORS in the browser.

```
Renderer                     Main Process                  External API
   │                              │                              │
   │─── proxyRequest(config) ────►│                              │
   │                              │─── fetch(url, options) ─────►│
   │                              │◄── response ─────────────────│
   │◄── result ───────────────────│                              │
```

### 2. Preload Script

**Location**: `electron/preload.js`

The preload script is the **secure bridge** between renderer and main:

```javascript
// Preload exposes safe APIs
contextBridge.exposeInMainWorld('electronAPI', {
  // Read-only info
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls (no direct access to BrowserWindow)
  minimize: () => ipcRenderer.send('minimize'),
  
  // Proxied requests (sanitized)
  proxyRequest: (config) => ipcRenderer.invoke('proxy-request', config),
});
```

**Security Principle**: The renderer never gets direct Node.js access. All capabilities go through defined IPC channels.

### 3. React Application

The React app follows a **layered architecture**:

```
┌────────────────────────────────────────┐
│            Context Providers            │  ◄─ Global state
├────────────────────────────────────────┤
│              Components                 │  ◄─ UI rendering
├────────────────────────────────────────┤
│             Custom Hooks                │  ◄─ State logic
├────────────────────────────────────────┤
│               Services                  │  ◄─ Business logic
├────────────────────────────────────────┤
│              Utilities                  │  ◄─ Pure functions
└────────────────────────────────────────┘
```

---

## Data Flow

### Model Sync Flow

```
User clicks "Sync"
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                     useSyncOperations Hook                     │
│  • Manages sync state (isSyncing, progress)                   │
│  • Creates AbortController for cancellation                   │
│  • Calls syncAllSources()                                     │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                      SyncOrchestrator                          │
│  1. Initialize FetcherRegistry                                │
│  2. Filter to enabled fetchers                                │
│  3. Execute fetchers in parallel (Promise.all)                │
│  4. Run SafetyService (NSFW filtering)                        │
│  5. Run DiscoveryService (optional LLM discovery)             │
│  6. Run TranslationService (CJK name translation)             │
│  7. Return combined { complete: Model[], flagged: Model[] }   │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                    useModelPersistence Hook                    │
│  • Merges new models with existing (smart merge)              │
│  • Preserves user flags (favorites, NSFW flags)               │
│  • Saves to localStorage                                      │
│  • Updates React state                                        │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
    UI Updates via React state
```

### Model Validation Flow

```
User clicks "Validate"
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                   useModelValidation Hook                      │
│  • Collects incomplete models                                 │
│  • Shows validation modal                                     │
│  • Calls validateAllModels()                                  │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                    ValidationService                           │
│  1. Find enabled LLM provider with valid API key              │
│  2. Estimate token count                                      │
│  3. Choose batch or single-request strategy                   │
│  4. Generate validation prompt                                │
│  5. Call LLM provider                                         │
│  6. Parse response (CSV or JSON)                              │
│  7. Merge validated data with originals                       │
│  8. Return updated models                                     │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
    Models updated in state + localStorage
```

---

## State Management Strategy

### Why Context + Hooks (Not Redux)?

| Factor | Decision |
|--------|----------|
| App complexity | Medium - doesn't warrant Redux overhead |
| State shape | Mostly independent concerns (settings, theme, models) |
| Performance | Context with useMemo/useCallback is sufficient |
| Bundle size | Smaller without Redux |

### State Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                         App State                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  Global, persisted                       │
│  │ SettingsContext  │  • API keys, preferences, data sources   │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐  Global, persisted                       │
│  │  ThemeContext    │  • Colors, custom CSS                    │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐  Global, ephemeral                       │
│  │  UpdateContext   │  • Update availability, download progress │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐  Component tree, mixed                   │
│  │ useDashboardCtrl │  • Models, filters, selection, UI state  │
│  └──────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Controller Hook Pattern

The main dashboard uses a **controller hook** to orchestrate complex state:

```typescript
// useDashboardController combines multiple concerns
function useDashboardController() {
  // Compose smaller hooks
  const persistence = useModelPersistence();
  const filtering = useModelFiltering(persistence.models);
  const selection = useModelSelection();
  const sync = useSyncOperations(persistence);
  const ui = useUIState();
  
  // Return unified interface
  return {
    // Data
    models: filtering.filteredModels,
    selectedIds: selection.ids,
    
    // Actions
    syncModels: sync.startSync,
    selectModel: selection.select,
    openDetails: ui.openDetailPanel,
    
    // State
    isSyncing: sync.isSyncing,
    syncProgress: sync.progress,
  };
}
```

**Benefits**:
- Main component stays thin (just renders)
- Logic is testable in isolation
- Easy to understand data flow

---

## Service Architecture

### Fetcher Registry Pattern

Data sources are registered as pluggable fetchers:

```
┌─────────────────────────────────────────────────────────────┐
│                     FetcherRegistry                          │
├─────────────────────────────────────────────────────────────┤
│  register(fetcher)      Add a fetcher                       │
│  getAll()               Get all registered fetchers         │
│  getEnabled(options)    Get enabled fetchers based on opts  │
└─────────────────────────────────────────────────────────────┘
        │
        │ Contains
        ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ HuggingFace  │ │  CivitasBay  │ │   Ollama     │ ...
│   Fetcher    │ │   Fetcher    │ │   Fetcher    │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Adding a new data source**:

1. Create fetcher in `src/services/api/fetchers/`
2. Implement the `Fetcher` interface
3. Register in `SyncOrchestrator.ts`
4. Add UI toggle in settings

### API Provider Abstraction

LLM providers are abstracted behind a common interface:

```typescript
// All providers called through unified function
async function callProviderText(
  providerKey: string,
  providerConfig: ProviderCfg,
  prompt: string,
  systemPrompt?: string
): Promise<string>
```

The implementation routes to provider-specific handlers based on `protocol`:

```
callProviderText(key, config, prompt)
        │
        ├─── protocol: 'openai'    ──► OpenAI-compatible API
        ├─── protocol: 'anthropic' ──► Anthropic API
        ├─── protocol: 'google'    ──► Google Gemini API
        └─── protocol: 'ollama'    ──► Local Ollama API
```

---

## Persistence Strategy

### localStorage Schema

```
┌─────────────────────────────────────────────────────────────┐
│                       localStorage                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  aiModelDB_models     ──► Model[]                          │
│                           Full model database               │
│                                                             │
│  aiModelDB_settings   ──► Settings                         │
│                           User preferences, API keys        │
│                                                             │
│  aiModelDB_theme      ──► ThemeConfig                      │
│                           Theme selection + custom CSS      │
│                                                             │
│  aiModelDB_syncHistory ──► SyncSnapshot[]                  │
│                            Last 5 sync states for rollback  │
│                                                             │
│  aiModelDB_wizardComplete ──► boolean                      │
│                               Onboarding completed flag     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Merge Strategy

When syncing, new data is **merged** with existing, not replaced:

```
Existing Data                   New Data
┌────────────────────┐         ┌────────────────────┐
│ id: "model-1"      │         │ id: "model-1"      │
│ name: "GPT-4"      │         │ name: "GPT-4"      │
│ downloads: 1000    │    +    │ downloads: 1500    │  ◄─ Updated
│ isFavorite: true   │         │                    │  ◄─ Preserved
│ isNSFWFlagged: false│        │                    │  ◄─ Preserved
└────────────────────┘         └────────────────────┘
                    │
                    ▼
            ┌────────────────────┐
            │ id: "model-1"      │
            │ name: "GPT-4"      │
            │ downloads: 1500    │  ◄─ New value
            │ isFavorite: true   │  ◄─ User flag preserved
            │ isNSFWFlagged: false│  ◄─ User flag preserved
            └────────────────────┘
```

**Key principle**: User-managed flags (`isFavorite`, `isNSFWFlagged`, `flaggedImageUrls`) are never overwritten by sync.

---

## Security Model

### API Key Storage

API keys are stored in localStorage (browser sandboxed storage):

```
┌─────────────────────────────────────────────────────────────┐
│  Threat Model                                               │
├─────────────────────────────────────────────────────────────┤
│  ✓ Protected from: Other apps, other websites              │
│  ✓ Protected from: Network interception (stored locally)   │
│  ✗ NOT protected from: Local machine access                │
│  ✗ NOT protected from: Malicious extensions                │
├─────────────────────────────────────────────────────────────┤
│  Mitigation: This is a desktop app, so the user controls   │
│  the machine. Same security model as any desktop app       │
│  storing credentials.                                       │
└─────────────────────────────────────────────────────────────┘
```

### CORS Bypass

External API requests are proxied through Electron main process:

```
Renderer                    Main Process                 External
   │                             │                          │
   │  Blocked by CORS ──────────────────────────────────────X
   │                             │                          │
   │  proxyRequest() ───────────►│                          │
   │                             │  fetch() ───────────────►│
   │                             │◄─────────────────────────│
   │◄────────────────────────────│                          │
   OK (Electron has no CORS)
```

### Content Filtering

NSFW content is filtered through multiple layers:

1. **Keyword matching** - 400+ explicit terms
2. **Pattern matching** - Regex for variations
3. **Safe patterns** - Whitelist for general-purpose models
4. **Source blocking** - High-risk sources blocked in strict mode
5. **LLM analysis** - Optional AI content review

---

## Performance Considerations

### Virtualization

Large model lists use virtualization (only render visible rows):

```
┌─────────────────────────────────────┐
│          Viewport (visible)         │
│  ┌─────────────────────────────┐   │
│  │ Row 50                      │   │ ◄─ Rendered
│  │ Row 51                      │   │ ◄─ Rendered
│  │ Row 52                      │   │ ◄─ Rendered
│  │ Row 53                      │   │ ◄─ Rendered
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
        ▲
        │ Scroll
        │
  Row 0..49 (not in DOM)
  Row 54..10000 (not in DOM)
```

**Library**: `@tanstack/react-virtual`

### Parallel Fetching

Data sources are fetched in parallel:

```typescript
// All fetchers run simultaneously
const results = await Promise.all(
  enabledFetchers.map(f => executeFetcher(f))
);
```

### Rate Limiting

External API calls are rate-limited (50 req/min default):

```typescript
// RateLimiter class enforces limits
const limiter = new RateLimiter({ requestsPerMinute: 50 });
await limiter.acquire(); // Blocks if over limit
await fetch(url);
```

### Web Workers

Heavy operations run in Web Workers to prevent UI freezing:

- Model merging (large datasets)
- Import file processing
- NSFW scanning

---

## Extension Points

### Adding a New Data Source

1. **Create fetcher** in `src/services/api/fetchers/`
2. **Implement interface**:
   ```typescript
   const myFetcher: Fetcher = {
     id: 'mySource',
     name: 'My Source',
     isEnabled: (opts) => !!opts.dataSources?.mySource,
     fetch: async (opts, callbacks) => { ... }
   };
   ```
3. **Register** in `SyncOrchestrator.ts`
4. **Add toggle** in `DataSourcesSection.tsx`
5. **Add setting** in `SettingsContext.tsx`

### Adding a New LLM Provider

1. **Add provider config** in `src/services/api/config.ts`
2. **Create handler** if new protocol in `src/services/api/providers/`
3. **Add to UI** in `APIConfigSection.tsx`

### Adding a New Theme

1. **Create theme file** in `src/data/themes/`
2. **Define CSS variables**
3. **Register** in `ThemeContext.tsx`

---

## Debugging

### Console Logging

The app has a built-in console accessible via the toolbar:

- Logs sync progress
- API request/response details
- Error messages

### DevTools

In development, Chrome DevTools are available:
- React DevTools for component inspection
- Network tab for API debugging
- Application tab for localStorage inspection

### Common Debug Points

| Issue | Where to Look |
|-------|---------------|
| Sync failures | Console + `SyncOrchestrator.ts` |
| API errors | Network tab + `src/services/api/` |
| State bugs | React DevTools + relevant hook |
| Styling issues | Elements tab + `index.css` |
