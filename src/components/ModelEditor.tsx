import React, { useState, useEffect, useContext } from 'react';
import { Model, Domain } from '../types';
import ThemeContext from '../context/ThemeContext';

interface ModelEditorProps {
  model: Model | null;
  onSave: (updatedModel: Model) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ModelEditor({ model, onSave, onClose, isOpen }: ModelEditorProps) {
  const { theme } = useContext(ThemeContext);
  const [editedModel, setEditedModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available domains for selection
  const domains: Domain[] = [
    "LLM", "VLM", "Vision", "ImageGen", "VideoGen",
    "Audio", "ASR", "TTS", "3D", "World/Sim", "Other"
  ];

  // Inline styles for inputs to ensure background is visible
  const inputStyle = {
    backgroundColor: theme === "dark" ? "rgba(24, 24, 27, 0.6)" : "#ffffff"
  };

  // Reset form when model changes
  useEffect(() => {
    if (model) {
      setEditedModel({ ...model });
      setError(null);
    }
  }, [model]);

  if (!isOpen || !editedModel) return null;

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Handle nested properties with dot notation
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedModel(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          [parent]: {
            ...prev[parent as keyof Model] as any,
            [child]: value
          }
        };
      });
    } else {
      setEditedModel(prev => {
        if (!prev) return prev;
        return { ...prev, [name]: value };
      });
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedModel(prev => {
        if (!prev) return prev;

        return {
          ...prev,
          [parent]: {
            ...prev[parent as keyof Model] as any,
            [child]: checked
          }
        };
      });
    } else {
      setEditedModel(prev => {
        if (!prev) return prev;
        return { ...prev, [name]: checked };
      });
    }
  };

  // Handle tags input
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsString = e.target.value;
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);

    setEditedModel(prev => {
      if (!prev) return prev;
      return { ...prev, tags: tagsArray };
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!editedModel?.name || !editedModel.provider || !editedModel.domain) {
      setError('Name, provider, and domain are required fields');
      return;
    }

    // Save the edited model
    onSave(editedModel);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 ${theme === "dark" ? "border-zinc-800" : "border-zinc-200"}`}
        style={{
          backgroundColor: theme === "dark" ? "#09090b" : "#ffffff",
          color: theme === "dark" ? "#fafafa" : "#000000"
        }}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Model: {model?.name}</h2>

          {error && (
            <div className="text-red-700 dark:bg-red-900/30 dark:text-red-200 p-3 rounded-md mb-4 border border-red-600 dark:border-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-medium text-lg border-b pb-1 dark:border-zinc-700">Basic Information</h3>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editedModel.name || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Provider</label>
                  <input
                    type="text"
                    name="provider"
                    value={editedModel.provider || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Domain</label>
                  <select
                    name="domain"
                    value={editedModel.domain || ''}
                    onChange={handleChange}
                    style={inputStyle}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  >
                    <option value="" disabled>Select domain</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Parameters</label>
                  <input
                    type="text"
                    name="parameters"
                    value={editedModel.parameters || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="e.g., 7B, 13B, etc."
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Context Window</label>
                  <input
                    type="text"
                    name="context_window"
                    value={editedModel.context_window || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="e.g., 8K, 32K, etc."
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Tags (comma separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={editedModel.tags?.join(', ') || ''}
                    onChange={handleTagsChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="tag1, tag2, tag3..."
                  />
                </div>
              </div>

              {/* License Information */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-medium text-lg border-b pb-1 dark:border-zinc-700">License Information</h3>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">License Name</label>
                  <input
                    type="text"
                    name="license.name"
                    value={editedModel.license?.name || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="e.g., MIT, Apache-2.0, etc."
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">License Type</label>
                  <select
                    name="license.type"
                    value={editedModel.license?.type || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  >
                    <option value="" disabled>Select type</option>
                    <option value="OSI">Open Source (OSI)</option>
                    <option value="Proprietary">Proprietary</option>
                    <option value="Copyleft">Copyleft</option>
                    <option value="Non-Commercial">Non-Commercial</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="commercial_use"
                      name="license.commercial_use"
                      checked={editedModel.license?.commercial_use || false}
                      onChange={handleCheckboxChange}
                      className="mr-2"
                    />
                    <label htmlFor="commercial_use" className="text-sm">Commercial use allowed</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="attribution_required"
                      name="license.attribution_required"
                      checked={editedModel.license?.attribution_required || false}
                      onChange={handleCheckboxChange}
                      className="mr-2"
                    />
                    <label htmlFor="attribution_required" className="text-sm">Attribution required</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="share_alike"
                      name="license.share_alike"
                      checked={editedModel.license?.share_alike || false}
                      onChange={handleCheckboxChange}
                      className="mr-2"
                    />
                    <label htmlFor="share_alike" className="text-sm">Share alike required</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="copyleft"
                      name="license.copyleft"
                      checked={editedModel.license?.copyleft || false}
                      onChange={handleCheckboxChange}
                      className="mr-2"
                    />
                    <label htmlFor="copyleft" className="text-sm">Copyleft</label>
                  </div>
                </div>
              </div>

              {/* URL and Date Information */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-medium text-lg border-b pb-1 dark:border-zinc-700">Links & Dates</h3>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Model URL</label>
                  <input
                    type="text"
                    name="url"
                    value={editedModel.url || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Repository URL</label>
                  <input
                    type="text"
                    name="repo"
                    value={editedModel.repo || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                    placeholder="https://github.com/..."
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Release Date</label>
                  <input
                    type="date"
                    name="release_date"
                    value={editedModel.release_date ? new Date(editedModel.release_date).toISOString().split('T')[0] : ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Updated At</label>
                  <input
                    type="date"
                    name="updated_at"
                    value={editedModel.updated_at ? new Date(editedModel.updated_at).toISOString().split('T')[0] : ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Downloads (approximate)</label>
                  <input
                    type="number"
                    name="downloads"
                    value={editedModel.downloads || ''}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-2 py-1.5 text-sm ${theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white"}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg border transition-colors ${theme === "dark" ? "border-zinc-700 text-white bg-black hover:bg-accent" : "border-zinc-300 text-black bg-white hover:bg-accent"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg border-0 bg-accent text-white hover:bg-accent-dark transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
