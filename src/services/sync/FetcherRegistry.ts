import { Fetcher } from "./SyncTypes";

/**
 * Registry for managing available data source fetchers.
 * Allows dynamic registration and retrieval of fetchers.
 */
export class FetcherRegistry {
    private fetchers: Map<string, Fetcher> = new Map();

    /**
     * Register a new fetcher
     */
    register(fetcher: Fetcher): void {
        if (this.fetchers.has(fetcher.id)) {
            console.warn(`Fetcher with ID '${fetcher.id}' is already registered. Overwriting.`);
        }
        this.fetchers.set(fetcher.id, fetcher);
    }

    /**
     * Get a fetcher by ID
     */
    get(id: string): Fetcher | undefined {
        return this.fetchers.get(id);
    }

    /**
     * Get all registered fetchers
     */
    getAll(): Fetcher[] {
        return Array.from(this.fetchers.values());
    }

    /**
     * Clear all fetchers (mostly for testing)
     */
    clear(): void {
        this.fetchers.clear();
    }
}

// Export a singleton instance
export const fetcherRegistry = new FetcherRegistry();
