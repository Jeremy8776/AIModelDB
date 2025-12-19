import { Model } from "../../../../types";

/**
 * Fetch recent models from ModelScope
 * 
 * ModelScope disabled per product scope; keeping stub to avoid build breaks
 * 
 * @param limit - Maximum number of models to fetch (unused in stub)
 * @returns Empty array
 */
export async function fetchModelScopeRecent(limit = 30): Promise<Model[]> {
    return [];
}
