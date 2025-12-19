import { useState, useEffect, useMemo } from 'react';
import { Domain, Model } from '../types';

interface FilterOptions {
  query: string;
  domainPick: Domain | 'All';
  sortKey: 'recent' | 'name' | 'provider' | 'downloads' | 'release_date' | 'domain' | 'parameters' | 'license';
  sortDirection?: 'asc' | 'desc';
  minDownloads: number;
  pageSize: number | null;
  licenseTypes?: Array<'Proprietary' | 'OSI' | 'Copyleft' | 'Non-Commercial' | 'Custom'>;
  commercialAllowed?: boolean | null;
  includeTags?: string[];
  excludeTags?: string[];
}

export function useModelFiltering(models: Model[], options: FilterOptions) {
  const { query, domainPick, sortKey, sortDirection = 'asc', minDownloads, pageSize, licenseTypes = [], commercialAllowed = null, includeTags = [], excludeTags = [] } = options;
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, domainPick, sortKey, sortDirection, minDownloads, licenseTypes.join(','), commercialAllowed, includeTags.join(','), excludeTags.join(',')]);



  const filtered = useMemo(() => {
    // Early return if no models
    if (!models || models.length === 0) return [];

    let list = models.slice();

    // gate for web sources only; imports bypass
    if (minDownloads > 0) {
      list = list.filter(m => m.source === "Import" || (m.downloads ?? 0) >= minDownloads);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(m => {
        // Optimize: build search string once instead of creating array and joining
        const searchStr = `${m.name} ${m.provider || ''} ${m.source || ''} ${m.license?.name || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
        return searchStr.includes(q);
      });
    }

    if (domainPick !== "All") {
      list = list.filter(m => m.domain === domainPick);
    }

    if (licenseTypes.length) {
      list = list.filter(m => m.license && licenseTypes.includes(m.license.type));
    }

    if (commercialAllowed !== null) {
      list = list.filter(m => (m.license?.commercial_use ?? false) === commercialAllowed);
    }

    if (includeTags.length) {
      const inc = includeTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
      list = list.filter(m => {
        const tags = (m.tags || []).map(t => String(t).toLowerCase());
        return inc.every(t => tags.includes(t));
      });
    }

    if (excludeTags.length) {
      const exc = excludeTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
      list = list.filter(m => {
        const tags = (m.tags || []).map(t => String(t).toLowerCase());
        return exc.every(t => !tags.includes(t));
      });
    }

    list.sort((a, b) => {
      // Safety check - if either model is undefined/null, push to end
      if (!a || !b) return 0;

      // Determine sort direction multiplier (1 for ascending, -1 for descending)
      const dir = sortDirection === 'asc' ? 1 : -1;

      if (sortKey === "name") {
        const aName = a.name ?? "";
        const bName = b.name ?? "";
        return dir * aName.localeCompare(bName);
      }
      if (sortKey === "provider") {
        const aProv = a.provider ?? "";
        const bProv = b.provider ?? "";
        return dir * aProv.localeCompare(bProv);
      }
      if (sortKey === "domain") {
        const aDom = a.domain ?? "";
        const bDom = b.domain ?? "";
        return dir * aDom.localeCompare(bDom);
      }
      if (sortKey === "license") {
        const aLic = a.license?.name ?? "";
        const bLic = b.license?.name ?? "";
        return dir * aLic.localeCompare(bLic);
      }
      if (sortKey === "recent") {
        const aDate = a?.updated_at ? Date.parse(a.updated_at) : 0;
        const bDate = b?.updated_at ? Date.parse(b.updated_at) : 0;
        // Push invalid/missing dates to the end regardless of sort direction
        if (isNaN(aDate) || aDate === 0) return 1;
        if (isNaN(bDate) || bDate === 0) return -1;
        if (aDate === 0 && bDate === 0) return 0;
        return dir * (aDate - bDate);
      }
      if (sortKey === "downloads") {
        const aDownloads = a?.downloads ?? 0;
        const bDownloads = b?.downloads ?? 0;
        return dir * (aDownloads - bDownloads);
      }
      if (sortKey === "release_date") {
        const aDate = a?.release_date ? Date.parse(a.release_date) : 0;
        const bDate = b?.release_date ? Date.parse(b.release_date) : 0;
        // Push invalid/missing dates to the end regardless of sort direction
        if (isNaN(aDate) || aDate === 0) return 1;
        if (isNaN(bDate) || bDate === 0) return -1;
        if (aDate === 0 && bDate === 0) return 0;
        return dir * (aDate - bDate);
      }
      if (sortKey === "parameters") {
        const extractCost = (model: Model | null | undefined) => {
          if (!model || !model.pricing || model.pricing.length === 0) return 0;
          const pricing = model.pricing[0];

          // Prioritize API costs over subscription costs for sorting
          if (pricing.input != null) return pricing.input * 1000;
          if (pricing.output != null) return pricing.output * 1000;
          if (pricing.flat != null) {
            const unit = pricing.unit?.toLowerCase() || '';
            const isSubscription = unit.includes('month') || unit.includes('year') ||
              unit.includes('annual') || unit.includes('subscription') || unit.includes('plan');
            return isSubscription ? pricing.flat / 12 : pricing.flat;
          }
          return 0;
        };
        const aVal = extractCost(a);
        const bVal = extractCost(b);
        return dir * (aVal - bVal);
      }

      // Default fallback sort by updated date
      const aFallback = a?.updated_at ? Date.parse(a.updated_at) : 0;
      const bFallback = b?.updated_at ? Date.parse(b.updated_at) : 0;
      return (isNaN(bFallback) ? 0 : bFallback) - (isNaN(aFallback) ? 0 : aFallback);
    });

    return list;
  }, [models, query, domainPick, sortKey, sortDirection, minDownloads, licenseTypes.join(','), commercialAllowed, includeTags.join(','), excludeTags.join(',')]);

  const total = filtered.length;
  const perPage = pageSize ?? total;
  const totalPages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
  const pageSafe = Math.min(page, totalPages);
  const start = perPage ? (pageSafe - 1) * perPage : 0;
  const end = perPage ? start + perPage : total;
  const pageItems = filtered.slice(start, end);

  return {
    filtered,
    total,
    page,
    setPage,
    totalPages,
    pageItems,
    pageSafe
  };
}
