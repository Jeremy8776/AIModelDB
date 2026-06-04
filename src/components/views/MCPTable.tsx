import React, { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUp } from 'lucide-react';
import { MCPServer } from '../../types';
import { MCPRow } from './MCPRow';
import { MCPTableHeader, MCPSortKey } from './MCPTableHeader';

/**
 * MCP Servers table — visually identical to ModelTable.
 *   - Sticky sortable header (12-col grid)
 *   - Virtualized rows via @tanstack/react-virtual (matches Models)
 *   - Same border-x / rounded-t-2xl / rounded-b-2xl card treatment
 *   - Same spacer between header and first row
 *   - Same scroll-to-top button behavior
 *
 * Differences are content-only: column titles and row cells render MCP
 * fields instead of Model fields. Layout dimensions are identical so
 * switching tabs doesn't shift anything on the page.
 */

export interface MCPTableProps {
    servers: MCPServer[];
    sortKey: MCPSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: MCPSortKey, direction: 'asc' | 'desc') => void;
    onOpen: (server: MCPServer, element?: HTMLElement) => void;
    theme: 'light' | 'dark';

    selectedIds?: Set<string>;
    onSelect?: (server: MCPServer, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    activeServerId?: string | null;
    onToggleFavorite?: (id: string) => void;
}

export function MCPTable({
    servers,
    sortKey,
    sortDirection,
    onSortChange,
    onOpen,
    theme,
    selectedIds,
    onSelect,
    onSelectAll,
    activeServerId,
    onToggleFavorite,
}: MCPTableProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [offsetTop, setOffsetTop] = useState(0);

    // Sort servers using the same key/direction semantics as Models
    const sorted = useMemo(() => {
        const arr = [...servers];
        const dir = sortDirection === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            // Favorites always float to the top regardless of sort
            const favDelta = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            if (favDelta !== 0) return favDelta;
            switch (sortKey) {
                case 'name':
                    return a.name.localeCompare(b.name) * dir;
                case 'updatedAt': {
                    const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                    const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                    return (aT - bT) * dir;
                }
                case 'transport': {
                    const aT = (a.remotes?.[0]?.type) || 'zzz';
                    const bT = (b.remotes?.[0]?.type) || 'zzz';
                    return aT.localeCompare(bT) * dir;
                }
                case 'registry': {
                    const aR = (a.packages?.[0]?.registryType) || 'zzz';
                    const bR = (b.packages?.[0]?.registryType) || 'zzz';
                    return aR.localeCompare(bR) * dir;
                }
                case 'verified': {
                    const score = (s: MCPServer) =>
                        (s.namespaceVerified ? 4 : 0) +
                        (s.imageVerified ? 2 : 0) +
                        (s.directoryVerified ? 1 : 0);
                    return (score(a) - score(b)) * dir;
                }
                default:
                    return 0;
            }
        });
        return arr;
    }, [servers, sortKey, sortDirection]);

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

    const rowVirtualizer = useVirtualizer({
        count: sorted.length,
        getScrollElement: () => document.getElementById('root'),
        estimateSize: () => 64,
        overscan: 10,
        scrollMargin: offsetTop,
    });

    const totalSize = rowVirtualizer.getTotalSize();
    const virtualItems = rowVirtualizer.getVirtualItems();

    // Keyboard navigation
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);
    useEffect(() => { setFocusedIndex(-1); }, [sorted.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (['input', 'textarea', 'select'].includes(activeTag || '')) return;

            if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
                e.preventDefault();
                setFocusedIndex(curr => {
                    const next = Math.min(curr + 1, sorted.length - 1);
                    rowVirtualizer.scrollToIndex(next, { align: 'auto' });
                    return next;
                });
            } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setFocusedIndex(curr => {
                    const next = Math.max(curr - 1, 0);
                    rowVirtualizer.scrollToIndex(next, { align: 'auto' });
                    return next;
                });
            } else if (e.key === 'Enter') {
                setFocusedIndex(curr => {
                    if (curr >= 0 && curr < sorted.length) {
                        e.preventDefault();
                        const el = parentRef.current?.querySelector(`[data-index="${curr}"]`) as HTMLElement;
                        onOpen(sorted[curr], el);
                    }
                    return curr;
                });
            } else if (e.key === ' ' || e.key.toLowerCase() === 'x') {
                setFocusedIndex(curr => {
                    if (curr >= 0 && curr < sorted.length && onSelect && selectedIds) {
                        e.preventDefault();
                        const s = sorted[curr];
                        onSelect(s, !selectedIds.has(s.id));
                    }
                    return curr;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sorted, rowVirtualizer, onOpen, onSelect, selectedIds]);

    const isAllSelected = sorted.length > 0 && selectedIds && sorted.every(s => selectedIds.has(s.id));
    const borderColor = 'border-border';
    const bgColor = 'bg-bg';

    // Back-to-top
    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            const root = document.getElementById('root');
            if (root) setShowBackToTop(root.scrollTop > 500);
        };
        const root = document.getElementById('root');
        if (root) {
            root.addEventListener('scroll', handleScroll);
            handleScroll();
        }
        return () => {
            const root = document.getElementById('root');
            if (root) root.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="w-full">
            {/* Table Header - Sticky (same offset as ModelTable for visual parity).
                rounded-t-lg matches the entity tab radius for a clean merge. */}
            <div className={`sticky top-[6.2rem] z-20 ${bgColor} ${borderColor} border-t border-x rounded-t-lg`}>
                <MCPTableHeader
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                    theme={theme}
                    isAllSelected={!!isAllSelected}
                    onSelectAll={onSelectAll}
                />
            </div>

            {/* Spacer between header and first row */}
            <div className={`h-4 ${borderColor} border-x ${bgColor}`} />

            {/* Virtualized body */}
            <div
                ref={parentRef}
                className={`p-2 relative ${borderColor} border-x ${bgColor}`}
                style={{ height: `${totalSize}px`, minHeight: '200px' }}
            >
                {virtualItems.map((virtualRow) => {
                    const s = sorted[virtualRow.index];
                    const isSelected = selectedIds?.has(s.id);
                    return (
                        <div
                            key={`${s.id}-${virtualRow.index}`}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                paddingLeft: '0.5rem',
                                paddingRight: '0.5rem',
                                transform: `translateY(${virtualRow.start - offsetTop}px)`,
                            }}
                        >
                            <div className="pb-2">
                                <MCPRow
                                    server={s}
                                    onOpen={onOpen}
                                    isSelected={isSelected}
                                    isActive={activeServerId === s.id}
                                    onSelect={onSelect}
                                    isFocused={focusedIndex === virtualRow.index}
                                    onToggleFavorite={onToggleFavorite}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer cap (matches ModelTable) */}
            <div className={`${borderColor} border-x border-b rounded-b-2xl ${bgColor}`}>
                <div className="h-2" />
            </div>

            <button
                onClick={() => {
                    const root = document.getElementById('root');
                    root?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`fixed bottom-8 right-8 z-50 p-3 rounded-full shadow-lg transition-all duration-300 transform ${
                    showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
                } bg-bg-card text-text hover:bg-bg/10 border-border`}
                title="Scroll to top"
            >
                <ArrowUp size={20} />
            </button>
        </div>
    );
}
