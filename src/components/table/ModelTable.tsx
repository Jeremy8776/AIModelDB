/**
 * Model Table Component
 * 
 * Main table component displaying the list of AI models.
 * Includes sortable header, model rows, and lazy loading sentinel.
 * 
 * @module ModelTable
 */

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Model } from '../../types';
import { SortKey } from '../../hooks/useUIState';
import { ModelRow } from '../ModelRow';
import { TableHeader } from './TableHeader';
import { LazyLoadSentinel } from './LazyLoadSentinel';
import { ArrowUp } from 'lucide-react';

/**
 * Props for the ModelTable component
 */
export interface ModelTableProps {
    models: Model[];
    sortKey: SortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SortKey, direction: 'asc' | 'desc') => void;
    onModelOpen: (model: Model, element: HTMLElement) => void;
    hasMore: boolean;
    sentinelRef: React.RefObject<HTMLDivElement>;
    displayCount: number;
    totalCount: number;
    theme: 'light' | 'dark';

    // Selection
    selectedIds?: Set<string>;
    onSelect?: (model: Model, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    onToggleFavorite?: (model: Model) => void;
    onToggleNSFWFlag?: (model: Model) => void;
    activeModelId?: string | null;
}

export function ModelTable({
    models,
    sortKey,
    sortDirection,
    onSortChange,
    onModelOpen,
    hasMore,
    sentinelRef,
    displayCount,
    totalCount,
    theme,
    selectedIds,
    onSelect,
    onSelectAll,
    onToggleFavorite,
    onToggleNSFWFlag,
    activeModelId
}: ModelTableProps) {
    // Styling based on theme
    const bgCard = 'border-border bg-bg-card';

    // Ref for the table body container to measure offset
    const parentRef = useRef<HTMLDivElement>(null);
    const [offsetTop, setOffsetTop] = useState(0);

    // Measure the offset of the table relative to the scroll container (#root)
    useLayoutEffect(() => {
        const updateOffset = () => {
            if (parentRef.current) {
                const scrollEl = document.getElementById('root');
                if (scrollEl) {
                    const rect = parentRef.current.getBoundingClientRect();
                    setOffsetTop(rect.top + scrollEl.scrollTop);
                }
            }
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);
        return () => window.removeEventListener('resize', updateOffset);
    }, []);

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: models.length,
        getScrollElement: () => document.getElementById('root'),
        estimateSize: () => 64, // Estimated row height + gap
        overscan: 10,
        scrollMargin: offsetTop,
    });

    const totalSize = rowVirtualizer.getTotalSize();
    const virtualItems = rowVirtualizer.getVirtualItems();

    // Keyboard Navigation
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Reset focus when models change significantly (e.g. filtering)
    useEffect(() => {
        setFocusedIndex(-1);
    }, [models.length]); // Reset on length change

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (['input', 'textarea', 'select'].includes(activeTag || '')) return;

            if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
                e.preventDefault();
                setFocusedIndex(current => {
                    const next = Math.min(current + 1, models.length - 1);
                    rowVirtualizer.scrollToIndex(next, { align: 'auto' });
                    return next;
                });
            } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setFocusedIndex(current => {
                    const next = Math.max(current - 1, 0);
                    rowVirtualizer.scrollToIndex(next, { align: 'auto' });
                    return next;
                });
            } else if (e.key === 'Enter') {
                setFocusedIndex(current => {
                    if (current >= 0 && current < models.length) {
                        e.preventDefault();
                        const el = parentRef.current?.querySelector(`[data-index="${current}"]`) as HTMLElement;
                        onModelOpen(models[current], el);
                    }
                    return current;
                });
            } else if (e.key === ' ' || e.key.toLowerCase() === 'x') {
                setFocusedIndex(current => {
                    if (current >= 0 && current < models.length && onSelect && selectedIds) {
                        e.preventDefault();
                        const m = models[current];
                        onSelect(m, !selectedIds.has(m.id));
                    }
                    return current;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [models, rowVirtualizer, onModelOpen, onSelect, selectedIds]);

    // Check if all visible models are selected
    const isAllSelected = models.length > 0 && selectedIds && models.every(m => selectedIds.has(m.id));

    // Extract border color for split styling
    const borderColor = 'border-border';
    const bgColor = 'bg-bg';

    // Scroll to top visibility
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const root = document.getElementById('root');
            if (root) {
                setShowBackToTop(root.scrollTop > 500);
            }
        };

        const root = document.getElementById('root');
        if (root) {
            root.addEventListener('scroll', handleScroll);
            // Initial check
            handleScroll();
        }

        return () => {
            const root = document.getElementById('root');
            if (root) {
                root.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    return (
        <div className="w-full">
            {/* Table Header - Sticky */}
            <div className={`sticky top-[6.2rem] z-20 ${bgColor} ${borderColor} border-t border-x rounded-t-2xl`}>
                <TableHeader
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                    theme={theme}
                    isAllSelected={!!isAllSelected}
                    onSelectAll={onSelectAll}
                />
            </div>

            {/* Spacer for proper visual separation between header and first row */}
            <div className={`h-4 ${borderColor} border-x ${bgColor}`}></div>

            {/* Table Body - Virtualized */}
            <div
                ref={parentRef}
                className={`p-2 relative ${borderColor} border-x ${bgColor}`}
                style={{
                    height: `${totalSize}px`,
                    minHeight: '200px',
                }}
            >
                {virtualItems.map((virtualRow) => {
                    const m = models[virtualRow.index];
                    const isSelected = selectedIds?.has(m.id);

                    return (
                        <div
                            key={`${m.source}-${m.id}-${virtualRow.index}`}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                paddingLeft: '0.5rem', // Match p-2 (0.5rem) from container
                                paddingRight: '0.5rem',
                                transform: `translateY(${virtualRow.start - offsetTop}px)`,
                            }}
                        >
                            <div className="pb-2">
                                <ModelRow
                                    m={m}
                                    onOpen={(model, element) => {
                                        if (element) {
                                            onModelOpen(model, element);
                                        }
                                    }}
                                    isSelected={isSelected}
                                    isActive={activeModelId === m.id}
                                    onSelect={onSelect}
                                    isFocused={focusedIndex === virtualRow.index}
                                    onToggleFavorite={onToggleFavorite}
                                    onToggleNSFWFlag={onToggleNSFWFlag}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lazy load sentinel - placed after the virtual list */}
            <div className={`${borderColor} border-x border-b rounded-b-2xl ${bgColor}`}>
                {hasMore && (
                    <div className="p-2 border-t border-transparent">
                        <LazyLoadSentinel
                            sentinelRef={sentinelRef}
                            displayCount={displayCount}
                            totalCount={totalCount}
                            theme={theme}
                        />
                    </div>
                )}
                {!hasMore && <div className="h-2"></div>}
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={() => {
                    const root = document.getElementById('root');
                    root?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-all duration-300 transform ${showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
                    } bg-bg-card text-text hover:bg-bg/10 border-border`}
                title="Scroll to top"
            >
                <ArrowUp size={20} />
            </button>
        </div>
    );
}
