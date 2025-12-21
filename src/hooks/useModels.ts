import { useState } from 'react';
import { Model } from '../types';
import { useModelPersistence } from './useModelPersistence';
import { useModelCRUD } from './useModelCRUD';
import { useModelMerge } from './useModelMerge';
import { useModelValidation } from './useModelValidation';

// Function to check if a model has missing or incomplete data
export function isModelIncomplete(model: Model): boolean {
  if (!model.name || !model.provider || !model.domain) return true;
  if (!model.parameters && (model.domain === 'LLM' || model.domain === 'ImageGen')) return true;
  if (!model.context_window && model.domain === 'LLM') return true;
  if (!model.license || !model.license.name) return true;
  if (!model.updated_at && !model.release_date) return true;
  if (!model.tags || model.tags.length === 0) return true;
  return false;
}

export function useModels() {
  // Sync state (kept here as it's shared UI state for the main sync process)
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);

  // Compose hooks
  const persistence = useModelPersistence();
  const crud = useModelCRUD(persistence.setModels);
  const merge = useModelMerge(persistence.models, persistence.setModels);
  const validation = useModelValidation(
    persistence.models,
    persistence.setModels,
    persistence.apiConfig,
    persistence.setLastSync
  );

  // Legacy wrapper for validateModels
  const validateModels = async () => {
    validation.openValidationModal();
    // Incomplete model filtering logic is now handled in the modal or caller
  };

  return {
    // Persistence
    models: persistence.models,
    setModels: persistence.setModels,
    lastSync: persistence.lastSync,
    setLastSync: persistence.setLastSync,
    isLoading: persistence.isLoading,
    loadingProgress: persistence.loadingProgress,
    apiConfig: persistence.apiConfig,
    setApiConfig: persistence.setApiConfig,
    clearAllModels: persistence.clearAllModels,
    resetToDefault: persistence.resetToDefault,
    hardResetDatabase: persistence.hardResetDatabase,

    // CRUD
    addModel: crud.addModel,
    updateModel: crud.updateModel,
    deleteModel: crud.deleteModel,
    selectedModelForEdit: crud.selectedModelForEdit,
    showModelEditor: crud.showModelEditor,
    openModelEditor: crud.openModelEditor,
    closeModelEditor: crud.closeModelEditor,
    saveModelEdit: crud.saveModelEdit,

    // Merge
    importModels: merge.importModels,
    mergeInModels: merge.mergeInModels,
    lastMergeStats: merge.lastMergeStats,
    setLastMergeStats: merge.setLastMergeStats,

    // Validation
    isValidating: validation.isValidating,
    validationJobs: validation.validationJobs,
    validationProgress: validation.validationProgress,
    startValidation: validation.startValidation,
    pauseValidation: validation.pauseValidation,
    resumeValidation: validation.resumeValidation,
    stopValidation: validation.stopValidation,
    clearFinishedValidationJobs: validation.clearFinishedValidationJobs,
    hasConfiguredProviders: validation.hasConfiguredProviders,
    getEnabledProviders: validation.getEnabledProviders,
    showValidationModal: validation.showValidationModal,
    openValidationModal: validation.openValidationModal,
    closeValidationModal: validation.closeValidationModal,
    validateEntireDatabase: validation.validateEntireDatabase,
    validateModels, // Legacy

    // Sync state
    isSyncing,
    setIsSyncing,
    syncProgress,
    setSyncProgress
  };
}
