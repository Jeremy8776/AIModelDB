import { useState, useEffect, useRef } from 'react';

/**
 * Options for the useLazyLoad hook
 */
interface UseLazyLoadOptions {
    /** Array of items to lazy load */
    items: any[];
    /** Initial number of items to display (default: 50) */
    initialCount?: number;
    /** Number of items to add when scrolling (default: 25) */
    incrementCount?: number;
    /** Whether lazy loading is enabled (default: true) */
    enabled?: boolean;
}

/**
 * Lazy Loading Hook
 * 
 * Implements infinite scroll functionality using IntersectionObserver.
 * Progressively loads items as the user scrolls down, improving performance
 * for large lists.
 * 
 * @param options - Configuration options
 * @returns Object with visible items, sentinel ref, and loading state
 * 
 * @example
 * ```tsx
 * const { visibleItems, hasMore, sentinelRef } = useLazyLoad({
 *   items: allModels,
 *   initialCount: 50,
 *   incrementCount: 25,
 *   enabled: pageSize === null // Enable only when showing "All"
 * });
 * 
 * return (
 *   <>
 *     {visibleItems.map(item => <Row key={item.id} {...item} />)}
 *     {hasMore && <div ref={sentinelRef}>Loading more...</div>}
 *   </>
 * );
 * ```
 */
export function useLazyLoad({ items, initialCount = 50, incrementCount = 25, enabled = true }: UseLazyLoadOptions) {
    const [displayCount, setDisplayCount] = useState(initialCount);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const prevItemsRef = useRef<any[]>([]);

    // Reset display count when items actually change (not just length)
    useEffect(() => {
        // Check if items array actually changed (different items, not just reordered)
        const itemsChanged = items.length !== prevItemsRef.current.length ||
            items.some((item, idx) => {
                const prevItem = prevItemsRef.current[idx];
                return !prevItem || item.id !== prevItem.id || item.source !== prevItem.source;
            });

        if (itemsChanged) {
            setDisplayCount(initialCount);
            prevItemsRef.current = items;
        }
    }, [items, initialCount]);

    // Setup intersection observer for infinite scroll
    useEffect(() => {
        if (!enabled) return;

        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && displayCount < items.length) {
                setDisplayCount(prev => Math.min(prev + incrementCount, items.length));
            }
        };

        observerRef.current = new IntersectionObserver(handleIntersection, {
            root: null,
            rootMargin: '200px', // Start loading 200px before reaching the end
            threshold: 0.1,
        });

        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [displayCount, items.length, incrementCount, enabled]);

    const visibleItems = enabled ? items.slice(0, displayCount) : items;
    const hasMore = displayCount < items.length;

    return {
        visibleItems,
        hasMore,
        displayCount,
        totalCount: items.length,
        sentinelRef,
    };
}
