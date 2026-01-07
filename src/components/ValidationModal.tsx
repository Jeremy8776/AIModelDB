import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidationSource } from '../services/validation';
import { Model } from '../types';
import { ApiDir, ProviderCfg } from '../types';
import ThemeContext from '../context/ThemeContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidate: (models: Model[], sources: ValidationSource[]) => void;
  models: Model[];
  selectedModels?: string[];
  apiConfig?: ApiDir;
  onValidateDatabase?: () => Promise<{ success: boolean; updatedModels?: Model[]; error?: string }>;
}

export function ValidationModal({
  isOpen,
  onClose,
  onValidate,
  models,
  selectedModels = [],
  apiConfig,
  onValidateDatabase
}: ValidationModalProps) {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedModels));

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);
  const [sources, setSources] = useState<Set<ValidationSource>>(
    new Set([ValidationSource.API])
  );
  const [validationMode, setValidationMode] = useState<'individual' | 'database'>('individual');
  const [isValidatingDatabase, setIsValidatingDatabase] = useState(false);

  if (!isOpen) return null;

  // Check if any LLM providers are enabled and configured
  const hasEnabledProvider = apiConfig && Object.entries(apiConfig)
    .some(([_, cfg]) => (cfg as ProviderCfg).enabled && (cfg as ProviderCfg).apiKey);

  // Handle model selection toggle
  const handleToggleModel = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  // Handle source selection toggle
  const handleToggleSource = (source: ValidationSource) => {
    const newSources = new Set(sources);
    if (newSources.has(source)) {
      if (newSources.size > 1) { // Don't allow removing all sources
        newSources.delete(source);
      }
    } else {
      newSources.add(source);
    }
    setSources(newSources);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selected.size === models.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(models.map(model => model.id)));
    }
  };

  // Handle database validation
  const handleDatabaseValidation = async () => {
    if (!onValidateDatabase) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.unavailableTitle'),
          message: t('validationModal.alerts.unavailableMessage'),
          type: 'alert',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
      return;
    }

    if (!hasEnabledProvider) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.providerRequiredTitle'),
          message: t('validationModal.alerts.providerRequiredMessage'),
          type: 'alert',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
      return;
    }

    setIsValidatingDatabase(true);

    try {
      const result = await onValidateDatabase();

      if (result.success && result.updatedModels) {
        window.dispatchEvent(new CustomEvent('show-confirmation', {
          detail: {
            title: t('validationModal.alerts.completeTitle'),
            message: t('validationModal.alerts.completeMessage', { count: result.updatedModels.length }),
            type: 'success',
            confirmText: t('common.ok'),
            onConfirm: () => onClose()
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('show-confirmation', {
          detail: {
            title: t('validationModal.alerts.failedTitle'),
            message: t('validationModal.alerts.failedMessage', { error: result.error || t('common.unknown') }),
            type: 'error',
            confirmText: t('common.ok'),
            onConfirm: () => { }
          }
        }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.errorTitle'),
          message: t('validationModal.alerts.failedMessage', { error: error instanceof Error ? error.message : String(error) }),
          type: 'error',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
    } finally {
      setIsValidatingDatabase(false);
    }
  };

  // Handle individual validation
  const handleIndividualValidation = () => {
    // Check preconditions before submitting
    if (!hasEnabledProvider) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.providerRequiredTitle'),
          message: t('validationModal.alerts.providerRequiredMessage'),
          type: 'alert',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
      return;
    }

    if (sources.size === 0) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.sourceRequiredTitle'),
          message: t('validationModal.alerts.sourceRequiredMessage'),
          type: 'alert',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
      return;
    }

    if (selected.size === 0) {
      window.dispatchEvent(new CustomEvent('show-confirmation', {
        detail: {
          title: t('validationModal.alerts.modelsRequiredTitle'),
          message: t('validationModal.alerts.modelsRequiredMessage'),
          type: 'alert',
          confirmText: t('common.ok'),
          onConfirm: () => { }
        }
      }));
      return;
    }

    const selectedModels = models.filter(model => selected.has(model.id));
    onValidate(selectedModels, Array.from(sources));
    onClose();
  };

  // Handle submit based on mode
  const handleSubmit = () => {
    if (validationMode === 'database') {
      handleDatabaseValidation();
    } else {
      handleIndividualValidation();
    }
  };

  // Get models with incomplete data to suggest for validation
  const incompleteModels = models.filter(model => {
    const hasLicense = model.license &&
      model.license.name &&
      model.license.type &&
      model.license.commercial_use !== undefined;

    const hasParameters = model.parameters || (model.domain !== 'LLM' && model.domain !== 'ImageGen');
    const hasContextWindow = model.context_window || model.domain !== 'LLM';
    const hasTags = model.tags && model.tags.length > 0;

    return !hasLicense || !hasParameters || !hasContextWindow || !hasTags;
  });

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 border-border bg-bg">
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-text">{t('validationModal.title')}</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-grow">
            {!hasEnabledProvider && (
              <div className="mb-5 p-3 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200 border border-yellow-600 dark:border-yellow-700 rounded-md">
                <p className="text-sm">
                  <strong>{t('validationModal.noProviders')}</strong> {t('validationModal.configureProviders')}
                </p>
              </div>
            )}

            {/* Validation Mode */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">{t('validationModal.mode')}</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="validationMode"
                    value="individual"
                    checked={validationMode === 'individual'}
                    onChange={(e) => setValidationMode(e.target.value as 'individual' | 'database')}
                    className="mt-1 text-violet-500 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-text">{t('validationModal.individual')}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{t('validationModal.individualDesc')}</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="validationMode"
                    value="database"
                    checked={validationMode === 'database'}
                    onChange={(e) => setValidationMode(e.target.value as 'individual' | 'database')}
                    className="mt-1 text-violet-500 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-text">{t('validationModal.database')}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{t('validationModal.databaseDesc')}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Validation Sources */}
            {validationMode === 'individual' && (
              <div className="mb-5">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">{t('validationModal.selectSources')}</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sources.has(ValidationSource.API)}
                      onChange={() => handleToggleSource(ValidationSource.API)}
                      className="rounded border-zinc-300 dark:border-zinc-600 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">API</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sources.has(ValidationSource.WEBSEARCH)}
                      onChange={() => handleToggleSource(ValidationSource.WEBSEARCH)}
                      className="rounded border-zinc-300 dark:border-zinc-600 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('validationResults.webSearchUsed').replace(' Used', '')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sources.has(ValidationSource.SCRAPING)}
                      onChange={() => handleToggleSource(ValidationSource.SCRAPING)}
                      className="rounded border-zinc-300 dark:border-zinc-600 text-violet-500 focus:ring-violet-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Scraping</span>
                  </label>
                </div>
              </div>
            )}

            {/* Model Selection */}
            {validationMode === 'individual' && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t('validationModal.selectModels')}</h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
                  >
                    {selected.size === models.length ? t('validationModal.deselectAll') : t('validationModal.selectAll')}
                  </button>
                </div>

                {incompleteModels.length > 0 && (
                  <div className="mb-3 p-2.5 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200 rounded-md text-sm border border-yellow-600 dark:border-yellow-800">
                    <p className="font-medium text-yellow-700 dark:text-yellow-200">
                      {t('validationModal.incompleteWarning', { count: incompleteModels.length })}
                    </p>
                    <button
                      className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 text-xs mt-1"
                      onClick={() => setSelected(new Set(incompleteModels.map(m => m.id)))}
                    >
                      {t('validationModal.selectIncomplete')}
                    </button>
                  </div>
                )}

                {/* Models Table */}
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden">
                  <div className="max-h-[35vh] overflow-y-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-10">
                            <span className="sr-only">Select</span>
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('table.name')}</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('table.provider')}</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{t('table.domain')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {models.map(model => (
                          <tr
                            key={model.id}
                            className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${selected.has(model.id) ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                              }`}
                            onClick={() => handleToggleModel(model.id)}
                          >
                            <td className="py-2 px-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selected.has(model.id)}
                                onChange={() => handleToggleModel(model.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-zinc-300 dark:border-zinc-600 text-violet-500 focus:ring-violet-500"
                              />
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-sm text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                              {model.name}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                              {model.provider}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                              {model.domain}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  {t('validationModal.modelsSelected', { count: selected.size, total: models.length })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border transition-colors border-border bg-card text-text hover:bg-accent hover:text-white"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !hasEnabledProvider ||
                isValidatingDatabase ||
                (validationMode === 'individual' && (sources.size === 0 || selected.size === 0))
              }
              className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title={!hasEnabledProvider
                ? t('validationModal.configureProviders')
                : validationMode === 'individual' && sources.size === 0
                  ? t('validationModal.alerts.sourceRequiredMessage')
                  : validationMode === 'individual' && selected.size === 0
                    ? t('validationModal.alerts.modelsRequiredMessage')
                    : validationMode === 'database'
                      ? t('validationModal.startDatabase')
                      : t('validationModal.startIndividual')}
            >
              {isValidatingDatabase && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {validationMode === 'database'
                ? (isValidatingDatabase ? t('validationModal.validatingDatabase') : t('validationModal.startDatabase'))
                : t('validationModal.startIndividual')
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

