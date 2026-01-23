# Code Conventions & Patterns

This document describes the coding standards and patterns used throughout AI Model DB. Follow these conventions to maintain consistency.

---

## TypeScript Standards

### Strict Typing

- **No `any` types** - Use proper interfaces or `unknown` with type guards
- **Null handling** - Use `T | null` for optional values that can be explicitly null
- **Type exports** - Export types from `src/types/index.ts`

```typescript
// ✅ Good
function processModel(model: Model): ProcessedModel { ... }

// ❌ Bad
function processModel(model: any): any { ... }
```

### Interface vs Type

- Use `type` for unions, intersections, and simple shapes
- Use `interface` for objects that might be extended

```typescript
// Type for unions
type Domain = "LLM" | "ImageGen" | "Audio";

// Interface for extensible objects
interface Fetcher {
  id: string;
  name: string;
  fetch: (options: SyncOptions) => Promise<SyncResult>;
}
```

### Null Coalescing

```typescript
// ✅ Prefer nullish coalescing
const value = input ?? defaultValue;

// ❌ Avoid logical OR for defaults (treats 0, "" as falsy)
const value = input || defaultValue;
```

---

## React Patterns

### Component Structure

Components follow this order:

```tsx
// 1. Imports
import React from 'react';
import { useTranslation } from 'react-i18next';

// 2. Types/Interfaces
interface Props {
  model: Model;
  onSelect: (id: string) => void;
}

// 3. Component
export function ModelCard({ model, onSelect }: Props) {
  // 3a. Hooks (always at top, never conditional)
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // 3b. Derived state / memos
  const displayName = useMemo(() => formatName(model.name), [model.name]);
  
  // 3c. Callbacks
  const handleClick = useCallback(() => {
    onSelect(model.id);
  }, [model.id, onSelect]);
  
  // 3d. Effects
  useEffect(() => {
    // side effects
  }, [dependencies]);
  
  // 3e. Early returns
  if (!model) return null;
  
  // 3f. Render
  return (
    <div onClick={handleClick}>
      {displayName}
    </div>
  );
}
```

### Hook Rules

```typescript
// ✅ Hooks always at component top level
function MyComponent() {
  const { t } = useTranslation();
  const [state, setState] = useState(null);
  
  if (someCondition) return null; // Early return AFTER hooks
}

// ❌ Never call hooks conditionally
function MyComponent() {
  if (someCondition) return null;
  const { t } = useTranslation(); // VIOLATION
}
```

### Custom Hooks

- Prefix with `use`
- Return objects for multiple values (easier to extend)
- Keep focused on single responsibility

```typescript
// ✅ Good - object return
function useModelSelection() {
  return {
    selectedIds,
    selectModel,
    deselectModel,
    clearSelection,
    isSelected,
  };
}

// Usage: const { selectedIds, selectModel } = useModelSelection();
```

### Context Pattern

```typescript
// 1. Create context with type
interface SettingsContextType {
  settings: Settings;
  saveSettings: (s: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

// 2. Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  
  const saveSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);
  
  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// 3. Custom hook for consumption
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
```

---

## File Organization

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ModelCard.tsx` |
| Hooks | camelCase with `use` prefix | `useModelSelection.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase | `Model`, `SyncResult` |
| Constants | SCREAMING_SNAKE | `DEFAULT_PAGE_SIZE` |
| Test files | Same name + `.test` | `format.test.ts` |

### Directory Structure

```
src/
├── components/
│   ├── ComponentName.tsx      # Component and local types
│   └── subfolder/             # Related components grouped
├── hooks/
│   ├── useHookName.ts         # Hook implementation
│   └── index.ts               # Re-exports
├── services/
│   ├── serviceName.ts         # Service implementation
│   └── serviceName.test.ts    # Service tests
├── utils/
│   ├── utilityName.ts         # Utility functions
│   └── utilityName.test.ts    # Utility tests
└── types/
    └── index.ts               # Central type definitions
```

### Import Order

```typescript
// 1. React and framework imports
import React, { useState, useCallback } from 'react';

// 2. Third-party libraries
import { useTranslation } from 'react-i18next';

// 3. Internal - absolute imports
import { Model } from '../types';
import { useSettings } from '../context';

// 4. Internal - relative imports
import { formatDate } from './utils';

// 5. Styles (if any)
import './styles.css';
```

---

## Service Layer Patterns

### Fetcher Pattern

All data source fetchers implement the `Fetcher` interface:

```typescript
interface Fetcher {
  id: string;           // Unique identifier
  name: string;         // Display name
  isEnabled: (options: SyncOptions) => boolean;
  fetch: (options: SyncOptions, callbacks?: SyncCallbacks) => Promise<SyncResult>;
}

// Implementation
const myFetcher: Fetcher = {
  id: 'mySource',
  name: 'My Data Source',
  isEnabled: (opts) => !!opts.dataSources?.mySource,
  fetch: async (opts, callbacks) => {
    const { onLog } = callbacks || {};
    if (onLog) onLog('Fetching from My Source...');
    
    try {
      const data = await fetchData();
      return { complete: data, flagged: [] };
    } catch (error) {
      console.error('Error:', error);
      return { complete: [], flagged: [] };
    }
  }
};
```

### Callback Pattern

Long-running operations use callbacks for progress reporting:

```typescript
interface OperationCallbacks {
  onProgress?: (progress: { current: number; total: number }) => void;
  onLog?: (message: string) => void;
  onCancel?: () => boolean;  // Return true if cancelled
  abortSignal?: AbortSignal; // For cancellation
}

async function longOperation(callbacks?: OperationCallbacks) {
  const { onProgress, onLog, abortSignal } = callbacks || {};
  
  for (let i = 0; i < items.length; i++) {
    // Check for cancellation
    if (abortSignal?.aborted) {
      throw new DOMException('Operation cancelled', 'AbortError');
    }
    
    // Report progress
    if (onProgress) onProgress({ current: i + 1, total: items.length });
    if (onLog) onLog(`Processing item ${i + 1}...`);
    
    await processItem(items[i]);
  }
}
```

### Error Handling

```typescript
// Service functions return Result types or throw
async function fetchModels(): Promise<Model[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch models:', error);
    throw error; // Re-throw for caller to handle
  }
}

// UI layer catches and displays
try {
  const models = await fetchModels();
  setModels(models);
} catch (error) {
  showToast({ type: 'error', message: 'Failed to fetch models' });
}
```

---

## Styling Patterns

### CSS Variables

Use CSS custom properties for theming:

```css
/* Define in :root or theme class */
:root {
  --bg-primary: #000000;
  --text-primary: #ffffff;
  --accent-color: #3b82f6;
}

/* Use in components */
.component {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

### Tailwind Usage

```tsx
// ✅ Use semantic class grouping
<div className="
  flex items-center gap-2
  px-4 py-2
  bg-bg-secondary rounded-lg
  hover:bg-bg-primary transition-colors
">

// ❌ Avoid extremely long single lines
<div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg border border-border-color hover:bg-bg-primary hover:border-accent-color transition-all duration-200 cursor-pointer">
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="
  flex flex-col      // Mobile: stack
  md:flex-row        // Desktop: row
  gap-2 md:gap-4     // Responsive gap
">
```

---

## Internationalization (i18n)

### Translation Keys

Use nested, descriptive keys:

```json
{
  "settings": {
    "title": "Settings",
    "tabs": {
      "display": "Display",
      "sources": "Data Sources"
    },
    "display": {
      "language": "Language",
      "currency": "Currency"
    }
  }
}
```

### Component Usage

```tsx
import { useTranslation } from 'react-i18next';

function SettingsModal() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('settings.title')}</h1>
      <label>{t('settings.display.language')}</label>
    </div>
  );
}
```

### Dynamic Values

```tsx
// With interpolation
t('sync.found', { count: 42 }) // "Found 42 models"

// In JSON:
{ "sync": { "found": "Found {{count}} models" } }
```

---

## Testing Patterns

### Unit Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatNumber } from './format';

describe('formatNumber', () => {
  it('formats integers without decimals', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });
  
  it('handles null input', () => {
    expect(formatNumber(null)).toBe('-');
  });
  
  it('respects locale option', () => {
    expect(formatNumber(1000, { locale: 'de-DE' })).toBe('1.000');
  });
});
```

### Mocking

```typescript
// Mock a module
vi.mock('../services/api', () => ({
  fetchModels: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
}));

// Mock a function
const onProgress = vi.fn();
await syncModels({ onProgress });
expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 5 });
```

---

## Git Conventions

### Commit Messages

```
<type>: <short description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `style`: Formatting (no code change)
- `test`: Adding tests
- `chore`: Maintenance tasks

### Branch Naming

```
feature/add-model-export
fix/sync-timeout-issue
refactor/validation-service
```

---

## Common Gotchas

### localStorage Prefix

All localStorage keys must use the `aiModelDB_` prefix:

```typescript
// ✅ Correct
localStorage.getItem('aiModelDB_models')

// ❌ Wrong - old prefix
localStorage.getItem('aiModelDBPro_models')
```

### Electron Environment

Always check for Electron context:

```typescript
import { isElectron } from '../utils/electron';

if (isElectron()) {
  // Use electron API
  window.electronAPI.proxyRequest(config);
} else {
  // Use fetch directly
  fetch(url);
}
```

### Async State Updates

```typescript
// ✅ Use functional updates for state based on previous state
setModels(prev => [...prev, newModel]);

// ❌ Don't reference state directly in async callbacks
setModels([...models, newModel]); // 'models' might be stale
```

### AbortController Cleanup

```typescript
useEffect(() => {
  const controller = new AbortController();
  
  fetchData({ signal: controller.signal })
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });
  
  return () => controller.abort(); // Cleanup on unmount
}, []);
```
