import { useState, useEffect, useRef } from 'react';

interface UseLazyLoadOptions {
    items: any[];
    initialCount?: number;
    incrementCount?: number;
    enabled?: boolean;
}

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
