import { useState, useEffect, useMemo } from 'react';
import { Model } from '../types';
import { filterModels, FilterOptions } from '../utils/filterLogic';

export type { FilterOptions };

export function useModelFiltering(models: Model[], options: FilterOptions) {
  const { query, domainPick, sortKey, sortDirection = 'asc', minDownloads, pageSize, licenseTypes = [], commercialAllowed = null, includeTags = [], excludeTags = [], favoritesOnly = false, hideNSFW = false } = options;
  const [page, setPage] = useState(1);
  // Arrays are compared by content, so key them as strings once instead of inside each dependency list.
  const licenseKey = licenseTypes.join(',');
  const includeKey = includeTags.join(',');
  const excludeKey = excludeTags.join(',');

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, domainPick, sortKey, sortDirection, minDownloads, licenseKey, commercialAllowed, includeKey, excludeKey, favoritesOnly, hideNSFW]);

  const filtered = useMemo(() => {
    return filterModels(models, options);
    // `options` is rebuilt every render; the primitive fields below are what actually change the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    models,
    query,
    domainPick,
    sortKey,
    sortDirection,
    minDownloads,
    pageSize,
    licenseKey,
    commercialAllowed,
    includeKey,
    excludeKey,
    favoritesOnly,
    hideNSFW
  ]);

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
