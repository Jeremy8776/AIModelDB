import React, { useContext, useState } from 'react';
import { DatabaseZap } from 'lucide-react';
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

  const bgInput = "border border-zinc-700 bg-zinc-900/60";

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
      <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black" : "border-zinc-200 bg-white"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DatabaseZap className="size-5" />
            <h3 className="text-base font-semibold">Add New Model</h3>
          </div>
          <button onClick={onClose} className={`rounded-xl ${bgInput} px-3 py-1 text-xs`}>Close</button>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h4 className="mb-3 font-medium">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">Model Name <span className="text-rose-500">*</span></label>
                <input
                  value={newModel.name || ''}
                  onChange={e => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="e.g., Llama 3 70B"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Provider/Developer</label>
                <input
                  value={newModel.provider || ''}
                  onChange={e => setNewModel({ ...newModel, provider: e.target.value })}
                  placeholder="e.g., Meta"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Domain <span className="text-rose-500">*</span></label>
                <select
                  value={newModel.domain || 'LLM'}
                  onChange={e => setNewModel({ ...newModel, domain: e.target.value as Domain })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                >
                  {domains.filter(d => d !== 'All').map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Parameters</label>
                <input
                  value={newModel.parameters || ''}
                  onChange={e => setNewModel({ ...newModel, parameters: e.target.value })}
                  placeholder="e.g., 70B"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          {/* URLs & Resources */}
          <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h4 className="mb-3 font-medium">URLs & Resources</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs mb-1">Model URL</label>
                <input
                  value={newModel.url || ''}
                  onChange={e => setNewModel({ ...newModel, url: e.target.value })}
                  placeholder="e.g., https://huggingface.co/meta-llama/Llama-3-70b"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Repository URL</label>
                <input
                  value={newModel.repo || ''}
                  onChange={e => setNewModel({ ...newModel, repo: e.target.value })}
                  placeholder="e.g., https://github.com/meta-llama/llama"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          {/* License Information */}
          <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h4 className="mb-3 font-medium">License Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">License Name <span className="text-rose-500">*</span></label>
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
                  placeholder="e.g., Apache-2.0, MIT, Custom"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">License Type</label>
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
                  <option value="OSI">OSI (Open Source)</option>
                  <option value="Copyleft">Copyleft</option>
                  <option value="Non-Commercial">Non-Commercial</option>
                  <option value="Custom">Custom</option>
                  <option value="Proprietary">Proprietary</option>
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
                Commercial Use
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
                  className="mr-2"
                />
                Attribution Required
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
                Copyleft
              </label>
            </div>
          </div>

          {/* Hosting & Availability */}
          <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h4 className="mb-3 font-medium">Hosting & Availability</h4>
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
                Weights Available
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
                API Available
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
                On-Premise Friendly
              </label>
            </div>
          </div>

          {/* Dates & Additional Info */}
          <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
            <h4 className="mb-3 font-medium">Additional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1">Updated Date</label>
                <input
                  type="date"
                  value={newModel.updated_at?.split('T')[0] || ''}
                  onChange={e => setNewModel({ ...newModel, updated_at: e.target.value })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Release Date</label>
                <input
                  type="date"
                  value={newModel.release_date?.split('T')[0] || ''}
                  onChange={e => setNewModel({ ...newModel, release_date: e.target.value })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Context Window</label>
                <input
                  value={newModel.context_window || ''}
                  onChange={e => setNewModel({ ...newModel, context_window: e.target.value })}
                  placeholder="e.g., 4k, 8k, 32k"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Downloads</label>
                <input
                  type="number"
                  value={newModel.downloads || 0}
                  onChange={e => setNewModel({ ...newModel, downloads: Number(e.target.value) })}
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">Tags (comma separated)</label>
                <input
                  value={(newModel.tags || []).join(', ')}
                  onChange={e => setNewModel({
                    ...newModel,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  placeholder="e.g., transformer, optimized, 8-bit"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className={`rounded-xl ${bgInput} px-4 py-2 text-sm`}>Cancel</button>
            <button
              onClick={handleAddModel}
              disabled={!newModel.name}
              className={`rounded-xl ${bgInput} px-4 py-2 text-sm ${!newModel.name ? 'opacity-50' : 'hover:bg-zinc-800'}`}
            >
              Add Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

