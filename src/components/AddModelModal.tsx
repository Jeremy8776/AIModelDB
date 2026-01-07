import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Domain, Hosting, LicenseInfo, Model } from '../types';
import { cleanId } from '../utils/format';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddModel: (model: Model) => void;
  domains: readonly (Domain | 'All')[];
  addConsoleLog: (msg: string) => void;
}

export function AddModelModal({ isOpen, onClose, onAddModel, domains, addConsoleLog }: AddModelModalProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  const [newModel, setNewModel] = useState<Partial<Model>>({
    id: "",
    name: "",
    provider: "",
    domain: "LLM" as Domain,
    source: "Manual",
    license: {
      name: "Unknown",
      type: "OSI",
      commercial_use: true,
      attribution_required: false,
      share_alike: false,
      copyleft: false
    },
    hosting: {
      weights_available: true,
      api_available: false,
      on_premise_friendly: true
    },
    updated_at: new Date().toISOString().split('T')[0],
    downloads: 0
  });

  if (!isOpen) return null;

  const bgInput = "border border-border bg-input text-text";

  function handleAddModel() {
    const modelToAdd: Model = {
      id: newModel.id || cleanId(newModel.name || `manual-${Date.now()}`),
      name: newModel.name || `Model ${Date.now()}`,
      provider: newModel.provider || null,
      domain: newModel.domain as Domain || "Other" as Domain,
      source: "Manual",
      url: newModel.url || null,
      repo: newModel.repo || null,
      license: newModel.license as LicenseInfo || {
        name: "Unknown",
        type: "Custom",
        commercial_use: true,
        attribution_required: false,
        share_alike: false,
        copyleft: false
      },
      pricing: newModel.pricing || [],
      updated_at: newModel.updated_at || new Date().toISOString(),
      release_date: newModel.release_date || null,
      tags: newModel.tags || [],
      parameters: newModel.parameters || null,
      context_window: newModel.context_window || null,
      indemnity: newModel.indemnity as "None" | "VendorProgram" | "EnterpriseOnly" | "Unknown" || "None",
      data_provenance: newModel.data_provenance || null,
      usage_restrictions: newModel.usage_restrictions || [],
      hosting: newModel.hosting as Hosting || {
        weights_available: true,
        api_available: false,
        on_premise_friendly: true
      },
      downloads: newModel.downloads || 0
    };
    addConsoleLog(`AddModelModal: Added model ${modelToAdd.name}`);
    onAddModel(modelToAdd);
    setNewModel({
      id: "",
      name: "",
      provider: "",
      domain: "LLM" as Domain,
      source: "Manual",
      license: {
        name: "Unknown",
        type: "OSI",
        commercial_use: true,
        attribution_required: false,
        share_alike: false,
        copyleft: false
      },
      hosting: {
        weights_available: true,
        api_available: false,
        on_premise_friendly: true
      },
      updated_at: new Date().toISOString().split('T')[0],
      downloads: 0
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 border-border bg-bg text-text">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="size-5" />
            <h3 className="text-base font-semibold">{t('addModel.title')}</h3>
          </div>
          <button onClick={onClose} className={`rounded-xl ${bgInput} px-3 py-1 text-xs`}>{t('common.close')}</button>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className="rounded-xl border p-4 border-border bg-card">
            <h4 className="mb-3 font-medium">{t('addModel.basicInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">{t('addModel.modelName')} <span className="text-rose-500">*</span></label>
                <input
                  value={newModel.name || ''}
                  onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder={t('addModel.modelNamePlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.provider')}</label>
                <input
                  value={newModel.provider || ''}
                  onChange={e => setNewModel({ ...newModel, provider: e.target.value })}
                  placeholder={t('addModel.providerPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.domain')} <span className="text-rose-500">*</span></label>
                <select
                  value={newModel.domain || 'LLM'}
                  onChange={e => setNewModel({ ...newModel, domain: e.target.value as Domain })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                >
                  {domains.filter(d => d !== 'All').map(domain => (
                    <option key={domain} value={domain}>{t(`domains.${domain}`, domain)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.parameters')}</label>
                <input
                  value={newModel.parameters || ''}
                  onChange={e => setNewModel({ ...newModel, parameters: e.target.value })}
                  placeholder={t('addModel.parametersPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          {/* URLs & Resources */}
          <div className="rounded-xl border p-4 border-border bg-card">
            <h4 className="mb-3 font-medium">{t('addModel.urlsAndResources')}</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs mb-1">{t('addModel.modelUrl')}</label>
                <input
                  value={newModel.url || ''}
                  onChange={e => setNewModel({ ...newModel, url: e.target.value })}
                  placeholder={t('addModel.modelUrlPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.repoUrl')}</label>
                <input
                  value={newModel.repo || ''}
                  onChange={e => setNewModel({ ...newModel, repo: e.target.value })}
                  placeholder={t('addModel.repoUrlPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          {/* License Information */}
          <div className="rounded-xl border p-4 border-border bg-card">
            <h4 className="mb-3 font-medium">{t('addModel.licenseInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">{t('addModel.licenseName')} <span className="text-rose-500">*</span></label>
                <input
                  value={newModel.license?.name || ''}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        name: e.target.value || "Unknown"
                      }
                    });
                  }}
                  placeholder={t('addModel.licenseNamePlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.licenseType')}</label>
                <select
                  value={newModel.license?.type || 'OSI'}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        type: e.target.value as LicenseInfo['type']
                      }
                    });
                  }}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                >
                  <option value="OSI">{t('addModel.licenseTypeOSI')}</option>
                  <option value="Copyleft">{t('licenses.Copyleft')}</option>
                  <option value="Non-Commercial">{t('licenses.Non-Commercial')}</option>
                  <option value="Custom">{t('licenses.Custom')}</option>
                  <option value="Proprietary">{t('licenses.Proprietary')}</option>
                </select>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.license?.commercial_use}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        commercial_use: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                {t('filters.commercialUse')}
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.license?.attribution_required}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        attribution_required: e.target.checked
                      }
                    });
                  }}
                />
                {t('comparison.attributes.attributionRequired')}
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.license?.share_alike}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        share_alike: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                Share-Alike
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.license?.copyleft}
                  onChange={e => {
                    const currentLicense = newModel.license || {
                      name: "Unknown",
                      type: "OSI",
                      commercial_use: true,
                      attribution_required: false,
                      share_alike: false,
                      copyleft: false
                    };
                    setNewModel({
                      ...newModel,
                      license: {
                        ...currentLicense,
                        copyleft: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                {t('licenses.Copyleft')}
              </label>
            </div>
          </div>

          {/* Hosting & Availability */}
          <div className="rounded-xl border p-4 border-border bg-card">
            <h4 className="mb-3 font-medium">{t('addModel.additionalInfo')}</h4>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.hosting?.weights_available}
                  onChange={e => {
                    const currentHosting = newModel.hosting || {
                      weights_available: true,
                      api_available: false,
                      on_premise_friendly: true
                    };
                    setNewModel({
                      ...newModel,
                      hosting: {
                        ...currentHosting,
                        weights_available: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                {t('modelDetail.weightsAvailable')}
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.hosting?.api_available}
                  onChange={e => {
                    const currentHosting = newModel.hosting || {
                      weights_available: true,
                      api_available: false,
                      on_premise_friendly: true
                    };
                    setNewModel({
                      ...newModel,
                      hosting: {
                        ...currentHosting,
                        api_available: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                {t('modelDetail.apiAvailable')}
              </label>
              <label className="flex items-center text-xs">
                <input
                  type="checkbox"
                  checked={!!newModel.hosting?.on_premise_friendly}
                  onChange={e => {
                    const currentHosting = newModel.hosting || {
                      weights_available: true,
                      api_available: false,
                      on_premise_friendly: true
                    };
                    setNewModel({
                      ...newModel,
                      hosting: {
                        ...currentHosting,
                        on_premise_friendly: e.target.checked
                      }
                    });
                  }}
                  className="mr-2"
                />
                {t('modelDetail.onPremiseFriendly')}
              </label>
            </div>
          </div>

          {/* Dates & Additional Info */}
          <div className="rounded-xl border p-4 border-border bg-card">
            <h4 className="mb-3 font-medium">{t('addModel.additionalInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">{t('addModel.updatedDate')}</label>
                <input
                  type="date"
                  value={newModel.updated_at?.split('T')[0] || ''}
                  onChange={e => setNewModel({ ...newModel, updated_at: e.target.value })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.releaseDate')}</label>
                <input
                  type="date"
                  value={newModel.release_date?.split('T')[0] || ''}
                  onChange={e => setNewModel({ ...newModel, release_date: e.target.value })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.contextWindow')}</label>
                <input
                  value={newModel.context_window || ''}
                  onChange={e => setNewModel({ ...newModel, context_window: e.target.value })}
                  placeholder={t('addModel.contextWindowPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('addModel.downloads')}</label>
                <input
                  type="number"
                  value={newModel.downloads || 0}
                  onChange={e => setNewModel({ ...newModel, downloads: Number(e.target.value) })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">{t('addModel.tags')}</label>
                <input
                  value={(newModel.tags || []).join(', ')}
                  onChange={e => setNewModel({
                    ...newModel,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  placeholder={t('addModel.tagsPlaceholder')}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className={`rounded-xl ${bgInput} px-4 py-2 text-sm`}>{t('common.cancel')}</button>
            <button
              onClick={handleAddModel}
              disabled={!newModel.name}
              className={`rounded-xl ${bgInput} px-4 py-2 text-sm ${!newModel.name ? 'opacity-50' : 'hover:bg-zinc-800'}`}
            >
              {t('addModel.addModelButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

