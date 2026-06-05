import React, { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUp } from 'lucide-react';
import { Skill } from '../../types';
import { SkillsRow } from './SkillsRow';
import { SkillsTableHeader, SkillSortKey } from './SkillsTableHeader';

/**
 * Skills table — virtualized, visually identical to ModelTable / MCPTable.
 * Same sticky flat-top header, same card chrome, same keyboard nav.
 */

export interface SkillsTableProps {
    skills: Skill[];
    sortKey: SkillSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SkillSortKey, direction: 'asc' | 'desc') => void;
    onOpen: (skill: Skill, element?: HTMLElement) => void;
    theme: 'light' | 'dark';
    selectedIds?: Set<string>;
    onSelect?: (skill: Skill, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    activeSkillId?: string | null;
    onToggleFavorite?: (id: string) => void;
}

export function SkillsTable({
    skills,
    sortKey,
    sortDirection,
    onSortChange,
    onOpen,
    theme,
    selectedIds,
    onSelect,
    onSelectAll,
    activeSkillId,
    onToggleFavorite,
}: SkillsTableProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [offsetTop, setOffsetTop] = useState(0);

    const sorted = useMemo(() => {
        const arr = [...skills];
        const dir = sortDirection === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            const favDelta = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            if (favDelta !== 0) return favDelta;
            switch (sortKey) {
                case 'name': return a.name.localeCompare(b.name) * dir;
                case 'type': return a.type.localeCompare(b.type) * dir;
                case 'family': return (a.family || 'zzz').localeCompare(b.family || 'zzz') * dir;
                case 'origin': return a.origin.localeCompare(b.origin) * dir;
                case 'source': return a.source.localeCompare(b.source) * dir;
                default: return 0;
            }
        });
        return arr;
    }, [skills, sortKey, sortDirection]);

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

    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            const root = document.getElementById('root');
            if (root) setShowBackToTop(root.scrollTop > 500);
        };
        const root = document.getElementById('root');
        if (root) { root.addEventListener('scroll', handleScroll); handleScroll(); }
        return () => {
            const root = document.getElementById('root');
            if (root) root.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="w-full">
            {/* Sticky header offset = title-bar height + 4rem toolbar (parity with
                Models/MCP, works in Electron + browser). Flat top merges with the tab. */}
            <div className={`sticky top-[calc(var(--titlebar-h)_+_4rem)] z-20 ${bgColor} ${borderColor} border-t border-x`}>
                <SkillsTableHeader
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                    theme={theme}
                    isAllSelected={!!isAllSelected}
                    onSelectAll={onSelectAll}
                />
            </div>

            <div className={`h-4 ${borderColor} border-x ${bgColor}`} />

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
                                <SkillsRow
                                    skill={s}
                                    onOpen={onOpen}
                                    isSelected={isSelected}
                                    isActive={activeSkillId === s.id}
                                    onSelect={onSelect}
                                    isFocused={focusedIndex === virtualRow.index}
                                    onToggleFavorite={onToggleFavorite}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className={`${borderColor} border-x border-b rounded-b-2xl ${bgColor}`}>
                <div className="h-2" />
            </div>

            {/* Scroll-to-top — fixed overlay mirroring the sidebar|table|detail
                columns so the button stays centered over the table. */}
            <div className="fixed bottom-8 inset-x-0 z-50 px-4 pointer-events-none">
                <div className="flex gap-5">
                    <div className="hidden lg:block lg:w-72 flex-shrink-0" />
                    <div className={`flex-1 flex justify-center ${activeSkillId ? 'lg:w-3/5' : 'w-full'}`}>
                        <button
                            onClick={() => document.getElementById('root')?.scrollTo({ top: 0, behavior: 'smooth' })}
                            className={`pointer-events-auto p-3 rounded-full shadow-lg transition-all duration-300 transform border border-white/20 bg-accent text-white hover:opacity-90 ${showBackToTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
                            title="Scroll to top"
                        >
                            <ArrowUp size={20} />
                        </button>
                    </div>
                    {activeSkillId && <div className="hidden lg:block lg:w-2/5 flex-shrink-0" />}
                </div>
            </div>
        </div>
    );
}
