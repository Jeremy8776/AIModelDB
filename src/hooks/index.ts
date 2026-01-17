/**
 * @fileoverview Custom React hooks for the AI Model DB application.
 * These hooks encapsulate reusable stateful logic and side effects.
 */

// State Management Hooks
export { useUIState, type UIState, type SortKey, type LicenseType } from './useUIState';
export { useSyncState, type SyncState } from './useSyncState';
export { useValidationState } from './useValidationState';
export { useModalState, type ModalState, type ImportToastData, type ConfirmationToastData } from './useModalState';

// Model Management Hooks
export { useModels, isModelIncomplete } from './useModels';
export { useModelFiltering } from './useModelFiltering';
export { useModelCRUD } from './useModelCRUD';
export { useModelPersistence } from './useModelPersistence';
export { useModelMerge } from './useModelMerge';
export { useModelValidation } from './useModelValidation';
export { useModelSelection } from './useModelSelection';

// Sync & Data Hooks
export { useSyncHistory } from './useSyncHistory';
export { useSyncOperations } from './useSyncOperations';

// UI & UX Hooks
export { useLazyLoad } from './useLazyLoad';
export { useBodyScrollLock } from './useBodyScrollLock';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useWindowEvents } from './useWindowEvents';
export { useConsoleLogging, type ConsoleLogging } from './useConsoleLogging';
export { useOnlineStatus } from './useOnlineStatus';

// Dashboard Controller
export { useDashboardController, type DashboardController } from './useDashboardController';

