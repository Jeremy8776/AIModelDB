/**
 * Filters Sidebar Component
 * 
 * Sidebar panel containing all filter controls for the model database.
 * Provides domain, downloads, license, commercial use, and tag filtering.
 * 
 * @module FiltersSidebar
 */

import { ThemedSelect } from "../ThemedSelect";
import { RoundCheckbox } from "../RoundCheckbox";
import { Domain } from "../../types";

/**
 * Available license type filters
 */
export type LicenseType = "Proprietary" | "OSI" | "Copyleft" | "Non-Commercial" | "Custom";

/**
 * Props for the FiltersSidebar component
 */
export interface FiltersSidebarProps {
    domainPick: Domain | "All";
    onDomainChange: (domain: Domain | "All") => void;
    minDownloads: number;
    onMinDownloadsChange: (min: number) => void;
    licenseTypes: LicenseType[];
    onLicenseTypesChange: (types: LicenseType[]) => void;
    commercialAllowed: boolean | null;
    onCommercialAllowedChange: (allowed: boolean | null) => void;
    includeTags: string[];
    onIncludeTagsChange: (tags: string[]) => void;
    excludeTags: string[];
    onExcludeTagsChange: (tags: string[]) => void;
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (enabled: boolean) => void;
    onClearFilters: () => void;
    theme: "light" | "dark";
}

export function FiltersSidebar({
    domainPick,
    onDomainChange,
    minDownloads,
    onMinDownloadsChange,
    licenseTypes,
    onLicenseTypesChange,
    commercialAllowed,
    onCommercialAllowedChange,
    includeTags,
    onIncludeTagsChange,
    excludeTags,
    onExcludeTagsChange,
    onClearFilters,
    favoritesOnly,
    onFavoritesOnlyChange,
    theme
}: FiltersSidebarProps) {
    // Available domains - consolidate Vision under VLM for selection (Vision kept for legacy data but hidden here)
    const DOMAINS: (Domain | "All")[] = [
        "All", "LLM", "VLM", "ImageGen", "VideoGen",
        "Audio", "ASR", "TTS", "3D", "World/Sim", "LoRA", "FineTune", "BackgroundRemoval", "Upscaler", "Other"
    ];

    // Styling based on theme
    const bgCard = theme === "dark" ? "border-zinc-800 bg-black" : "border-gray-400 bg-white shadow-sm";
    const bgInput = theme === "dark"
        ? "border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        : "border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500";

    return (
        <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-20 h-max">
            <div className={`rounded-2xl border p-4 ${bgCard}`}>
                <div className="text-lg font-semibold mb-4 text-center">Filters</div>

                {/* Favorites Filter */}
                <div className="mb-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <RoundCheckbox
                            checked={favoritesOnly}
                            onChange={(checked) => onFavoritesOnlyChange(checked)}
                        />
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-zinc-200 group-hover:text-white' : 'text-gray-700 group-hover:text-black'} transition-colors`}>
                            Favorites Only
                        </span>
                    </label>
                </div>

                {/* Domain Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Domain</label>
                    <ThemedSelect
                        value={domainPick as any}
                        onChange={(v: any) => onDomainChange(v)}
                        options={DOMAINS as any}
                    />
                </div>
                {/* Downloads Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Min Downloads</label>
                    <input
                        type="number"
                        value={minDownloads}
                        min={0}
                        onChange={e => onMinDownloadsChange(Math.max(0, Number(e.target.value) || 0))}
                        className={`w-full rounded-xl border ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                        placeholder="0"
                    />
                </div>

                {/* License Type Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>License Type</label>
                    <ThemedSelect
                        value={licenseTypes.length === 1 ? (licenseTypes[0] as string) : ""}
                        onChange={(v) => onLicenseTypesChange(v ? [v as any] : [])}
                        options={[
                            { value: "", label: "All Licenses" },
                            { value: "OSI", label: "OSI Approved" },
                            "Copyleft",
                            "Non-Commercial",
                            "Proprietary",
                            "Custom"
                        ]}
                        ariaLabel="License type"
                    />
                </div>

                {/* Commercial Use Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Commercial Use</label>
                    <ThemedSelect
                        value={commercialAllowed === null ? "" : commercialAllowed.toString()}
                        onChange={(v) => onCommercialAllowedChange(v === "" ? null : v === "true")}
                        options={[
                            { value: "", label: "All" },
                            { value: "true", label: "Allowed" },
                            { value: "false", label: "Not Allowed" }
                        ]}
                        ariaLabel="Commercial use"
                    />
                </div>

                {/* Tags Filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Include Tags</label>
                    <input
                        value={includeTags.join(", ")}
                        onChange={e => onIncludeTagsChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                        placeholder="e.g. transformers, diffusion"
                        className={`w-full rounded-xl border ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Exclude Tags</label>
                    <input
                        value={excludeTags.join(", ")}
                        onChange={e => onExcludeTagsChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                        placeholder="e.g. deprecated, beta"
                        className={`w-full rounded-xl border ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                    />
                </div>

                {/* Clear Filters Button */}
                <button
                    onClick={onClearFilters}
                    className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition-colors ${bgInput} hover:bg-gray-200 dark:hover:bg-gray-700`}
                >
                    Clear All Filters
                </button>
            </div>
        </aside>
    );
}
