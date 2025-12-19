/**
 * Lazy Load Sentinel Component
 * 
 * Invisible element that triggers loading more items when scrolled into view.
 * Uses Intersection Observer API for efficient scroll detection.
 * 
 * @module LazyLoadSentinel
 */

import React from 'react';

/**
 * Props for the LazyLoadSentinel component
 */
export interface LazyLoadSentinelProps {
    sentinelRef: React.RefObject<HTMLDivElement>;
    displayCount: number;
    totalCount: number;
    theme: 'light' | 'dark';
}

/**
 * Lazy load sentinel component for infinite scrolling.
 * 
 * This component is placed at the bottom of the model list and triggers
 * loading more items when it becomes visible in the viewport.
 * 
 * @param props - LazyLoadSentinel component props
 * @returns JSX.Element
 */
export function LazyLoadSentinel({
    sentinelRef,
    displayCount,
    totalCount,
    theme
}: LazyLoadSentinelProps) {
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-800';

    return (
        <div ref={sentinelRef} className="py-4 text-center">
            <div className={`text-sm ${textSubtle}`}>
                Loading more... ({displayCount} of {totalCount})
            </div>
        </div>
    );
}
