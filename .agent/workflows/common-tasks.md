---
description: Step-by-step guides for common development tasks
---

# Common Development Tasks

This document provides step-by-step workflows for common tasks in AI Model DB.

---

## Adding a New Data Source

### Overview
Data sources are fetched via the `Fetcher` interface and registered in the `SyncOrchestrator`.

### Steps

1. **Create the fetcher file**
   ```
   src/services/api/fetchers/my-source.ts
   ```

2. **Implement the Fetcher interface**
   ```typescript
   import { Model } from '../../../types';
   import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../sync/SyncTypes';

   export const mySourceFetcher: Fetcher = {
     id: 'mySource',
     name: 'My Data Source',
     
     isEnabled: (options: SyncOptions) => {
       return !!options.dataSources?.mySource;
     },
     
     fetch: async (
       options: SyncOptions,
       callbacks?: SyncCallbacks
     ): Promise<SyncResult> => {
       const { onLog } = callbacks || {};
       
       try {
         if (onLog) onLog('Fetching from My Source...');
         
         const response = await fetch('https://api.mysource.com/models');
         const data = await response.json();
         
         const models: Model[] = data.map(item => ({
           id: `mysource-${item.id}`,
           name: item.name,
           source: 'mySource',
           domain: 'LLM',
           // ... map other fields
         }));
         
         if (onLog) onLog(`My Source: Found ${models.length} models`);
         
         return { complete: models, flagged: [] };
       } catch (error) {
         console.error('My Source fetch error:', error);
         if (onLog) onLog(`My Source: Error - ${error.message}`);
         return { complete: [], flagged: [] };
       }
     }
   };
   ```

3. **Export from index**
   
   Edit `src/services/api/fetchers/index.ts`:
   ```typescript
   export { mySourceFetcher } from './my-source';
   ```

4. **Register in SyncOrchestrator**
   
   Edit `src/services/sync/SyncOrchestrator.ts`:
   ```typescript
   import { mySourceFetcher } from '../api/fetchers';
   
   // In orchestrateSync function:
   registry.register(mySourceFetcher);
   ```

5. **Add settings toggle**
   
   Edit `src/context/SettingsContext.tsx`:
   ```typescript
   // In defaultSettings.dataSources:
   dataSources: {
     // ...existing
     mySource: false,  // Default off
   }
   ```

6. **Add UI toggle**
   
   Edit `src/components/settings/DataSourcesSection.tsx`:
   ```tsx
   <ToggleRow
     label="My Data Source"
     description="Description of the source"
     checked={settings.dataSources.mySource}
     onChange={(checked) => saveSettings({
       dataSources: { ...settings.dataSources, mySource: checked }
     })}
   />
   ```

7. **Add translation keys**
   
   Edit `src/i18n/locales/en.json`:
   ```json
   {
     "settings": {
       "sources": {
         "mySource": "My Data Source",
         "mySourceDesc": "Description of the source"
       }
     }
   }
   ```

---

## Adding a New Component

### Steps

1. **Create component file**
   ```
   src/components/MyComponent.tsx
   ```

2. **Basic structure**
   ```tsx
   import React from 'react';
   import { useTranslation } from 'react-i18next';

   interface Props {
     title: string;
     onAction: () => void;
   }

   export function MyComponent({ title, onAction }: Props) {
     const { t } = useTranslation();
     
     return (
       <div className="p-4 bg-bg-secondary rounded-lg">
         <h2 className="text-lg font-semibold">{title}</h2>
         <button
           onClick={onAction}
           className="mt-2 px-4 py-2 bg-accent-color text-white rounded"
         >
           {t('common.action')}
         </button>
       </div>
     );
   }
   ```

3. **Add translations if needed**
   
   Edit locales files with any new keys.

4. **Import and use in parent**
   ```tsx
   import { MyComponent } from './MyComponent';
   
   <MyComponent title="Hello" onAction={() => console.log('clicked')} />
   ```

---

## Adding a New Setting

### Steps

1. **Add to Settings interface**
   
   Edit `src/context/SettingsContext.tsx`:
   ```typescript
   interface Settings {
     // ... existing
     myNewSetting: boolean;
   }
   ```

2. **Add default value**
   ```typescript
   const defaultSettings: Settings = {
     // ... existing
     myNewSetting: false,
   };
   ```

3. **Add UI control**
   
   Choose appropriate settings section and add:
   ```tsx
   <ToggleRow
     label={t('settings.myNewSetting')}
     checked={settings.myNewSetting}
     onChange={(checked) => saveSettings({ myNewSetting: checked })}
   />
   ```

4. **Add translations**
   ```json
   {
     "settings": {
       "myNewSetting": "My New Setting"
     }
   }
   ```

5. **Use the setting**
   ```tsx
   const { settings } = useSettings();
   
   if (settings.myNewSetting) {
     // Do something
   }
   ```

---

## Adding a New Modal

### Steps

1. **Create modal component**
   ```
   src/components/MyModal.tsx
   ```

2. **Basic modal structure**
   ```tsx
   import React from 'react';
   import { useTranslation } from 'react-i18next';
   import { X } from 'lucide-react';

   interface Props {
     isOpen: boolean;
     onClose: () => void;
   }

   export function MyModal({ isOpen, onClose }: Props) {
     const { t } = useTranslation();
     
     if (!isOpen) return null;
     
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center">
         {/* Backdrop */}
         <div
           className="absolute inset-0 bg-black/50"
           onClick={onClose}
         />
         
         {/* Modal */}
         <div className="relative bg-bg-primary rounded-lg shadow-xl w-full max-w-md mx-4">
           {/* Header */}
           <div className="flex items-center justify-between p-4 border-b border-border-color">
             <h2 className="text-lg font-semibold">{t('myModal.title')}</h2>
             <button onClick={onClose} className="p-1 hover:bg-bg-secondary rounded">
               <X size={20} />
             </button>
           </div>
           
           {/* Content */}
           <div className="p-4">
             {/* Modal content here */}
           </div>
           
           {/* Footer */}
           <div className="flex justify-end gap-2 p-4 border-t border-border-color">
             <button onClick={onClose} className="px-4 py-2 bg-bg-secondary rounded">
               {t('common.cancel')}
             </button>
             <button className="px-4 py-2 bg-accent-color text-white rounded">
               {t('common.confirm')}
             </button>
           </div>
         </div>
       </div>
     );
   }
   ```

3. **Add state management**
   
   In parent component:
   ```tsx
   const [isMyModalOpen, setIsMyModalOpen] = useState(false);
   
   <button onClick={() => setIsMyModalOpen(true)}>Open Modal</button>
   <MyModal isOpen={isMyModalOpen} onClose={() => setIsMyModalOpen(false)} />
   ```

4. **Or use ModalContext for global modals**
   
   Add to `ModalManager.tsx` if it needs to be triggered from anywhere.

---

## Adding a New Custom Hook

### Steps

1. **Create hook file**
   ```
   src/hooks/useMyHook.ts
   ```

2. **Implement hook**
   ```typescript
   import { useState, useCallback, useEffect } from 'react';

   interface UseMyHookOptions {
     initialValue?: string;
   }

   interface UseMyHookReturn {
     value: string;
     setValue: (v: string) => void;
     reset: () => void;
     isModified: boolean;
   }

   export function useMyHook(options: UseMyHookOptions = {}): UseMyHookReturn {
     const { initialValue = '' } = options;
     
     const [value, setValueState] = useState(initialValue);
     const [isModified, setIsModified] = useState(false);
     
     const setValue = useCallback((newValue: string) => {
       setValueState(newValue);
       setIsModified(true);
     }, []);
     
     const reset = useCallback(() => {
       setValueState(initialValue);
       setIsModified(false);
     }, [initialValue]);
     
     return {
       value,
       setValue,
       reset,
       isModified,
     };
   }
   ```

3. **Export from index**
   
   Edit `src/hooks/index.ts`:
   ```typescript
   export { useMyHook } from './useMyHook';
   ```

4. **Write tests**
   ```
   src/hooks/useMyHook.test.ts
   ```

---

## Adding Translation Keys

### Steps

1. **Add to English first** (`src/i18n/locales/en.json`)
   ```json
   {
     "myFeature": {
       "title": "My Feature",
       "description": "This is my feature",
       "button": {
         "save": "Save",
         "cancel": "Cancel"
       }
     }
   }
   ```

2. **Use in component**
   ```tsx
   const { t } = useTranslation();
   
   <h1>{t('myFeature.title')}</h1>
   <p>{t('myFeature.description')}</p>
   <button>{t('myFeature.button.save')}</button>
   ```

3. **Update other locales**
   
   Add the same keys to:
   - `zh.json` (Chinese)
   - `ja.json` (Japanese)
   - `ko.json` (Korean)
   - `es.json` (Spanish)
   - `fr.json` (French)
   - `de.json` (German)
   - `pt.json` (Portuguese)
   - `ru.json` (Russian)
   - `ar.json` (Arabic)

4. **Check i18n status**
   
   See `.agent/i18n_status.md` for which files are up to date.

---

## Writing Tests

### Unit Test for Utility

```typescript
// src/utils/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myUtil';

describe('myFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });
  
  it('should handle edge case', () => {
    expect(myFunction(null)).toBe('default');
  });
  
  it('should throw on invalid input', () => {
    expect(() => myFunction(-1)).toThrow('Invalid input');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- myUtil.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## Updating the Changelog

### Format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature Name**: Description of new feature

### Changed
- **Area**: Description of change

### Fixed
- **Bug Name**: Description of fix

### Removed
- **Feature Name**: Description of removal
```

### Guidelines

- Use present tense ("Add feature" not "Added feature")
- Start with the most impactful change
- Group related changes
- Include issue/PR numbers if applicable

---

## Building for Production

### Local Build

```bash
# Build web assets
npm run build

# Build Electron for current platform
npm run electron:build

# Or specific platform
npm run electron:build:win
npm run electron:build:mac
npm run electron:build:linux
```

### Output

Installers are created in `release/` directory:
- Windows: `AI-Model-DB-Setup.exe`
- macOS: `AI-Model-DB.dmg`
- Linux: `AI-Model-DB.AppImage`

### Pre-Build Checklist

1. ✅ `npm test` passes
2. ✅ `npm run lint` has no errors
3. ✅ TypeScript compiles (`npm run build:check`)
4. ✅ Changelog updated
5. ✅ Version bumped in `package.json`
