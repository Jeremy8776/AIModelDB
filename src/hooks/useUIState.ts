/**
 * UI State Hook
 * 
 * Manages all UI-related state for the AIModelDBPro component including
 * search, filters, sorting, pagination, and detail panel state.
 * 
 * @module useUIState
 */

import { useState } from 'react';
import { Domain, Model } from '../types';

/**
 * Available sort keys for model table
 */
export type SortKey = 'recent' | 'name' | 'provider' | 'downloads' | 'release_date' | 'domain' | 'parameters' | 'license';

/**
 * Available license type filters
 */
export type LicenseType = 'Proprietary' | 'OSI' | 'Copyleft' | 'Non-Commercial' | 'Custom';

/**
 * UI state interface containing all UI-related state and setters
 */
export interface UIState {
    // Search and domain
    query: string;
    setQuery: (query: string) => void;
    domainPick: Domain | 'All';
    setDomainPick: (domain: Domain | 'All') => void;

    // Sorting
    sortKey: SortKey;
    setSortKey: (key: SortKey) => void;
    sortDirection: 'asc' | 'desc';
    setSortDirection: (dir: 'asc' | 'desc') => void;

    // Pagination
    pageSize: number | null;
    setPageSize: (size: number | null) => void;

    // Filters
    minDownloads: number;
    setMinDownloads: (min: number) => void;
    licenseTypes: LicenseType[];
    setLicenseTypes: (types: LicenseType[]) => void;
    commercialAllowed: boolean | null;
    setCommercialAllowed: (allowed: boolean | null) => void;
    includeTags: string[];
    setIncludeTags: (tags: string[]) => void;
    excludeTags: string[];
    setExcludeTags: (tags: string[]) => void;

    // Detail panel
    open: Model | null;
    setOpen: (model: Model | null) => void;
    triggerElement: HTMLElement | null;
    setTriggerElement: (element: HTMLElement | null) => void;
}

/**
 * Custom hook for managing UI state.
 * 
 * Provides centralized state management for all UI-related concerns including:
 * - Search query and domain filtering
 * - Table sorting (key and direction)
 * - Pagination (page size)
 * - Advanced filters (downloads, licenses, commercial use, tags)
 * - Detail panel (open model and trigger element)
 * 
 * @returns UIState object with all state values and setter functions
 * 
 * @example
 * ```tsx
 * const uiState = useUIState();
 * 
 * // Update search query
 * uiState.setQuery('gpt-4');
 * 
 * // Change sort order
 * uiState.setSortKey('downloads');
 * uiState.setSortDirection('desc');
 * ```
 */
export function useUIState(): UIState {
    // Search and domain state
    const [query, setQuery] = useState("");
    const [domainPick, setDomainPick] = useState<Domain | "All">("All");

    // Sorting state
    const [sortKey, setSortKey] = useState<SortKey>("release_date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Pagination state
    const [pageSize, setPageSize] = useState<number | null>(50);

    // Filter state
    const [minDownloads, setMinDownloads] = useState<number>(0);
    const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
    const [commercialAllowed, setCommercialAllowed] = useState<boolean | null>(null);
    const [includeTags, setIncludeTags] = useState<string[]>([]);
    const [excludeTags, setExcludeTags] = useState<string[]>([]);

    // Detail panel state
    const [open, setOpen] = useState<Model | null>(null);
    const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

    return {
        query,
        setQuery,
        domainPick,
        setDomainPick,
        sortKey,
        setSortKey,
        sortDirection,
        setSortDirection,
        pageSize,
        setPageSize,
        minDownloads,
        setMinDownloads,
        licenseTypes,
        setLicenseTypes,
        commercialAllowed,
        setCommercialAllowed,
        includeTags,
        setIncludeTags,
        excludeTags,
        setExcludeTags,
        open,
        setOpen,
        triggerElement,
        setTriggerElement,
    };
}
