import React, { memo } from 'react';
import { Skill } from '../../types';
import { RoundCheckbox } from '../RoundCheckbox';

interface SkillsRowProps {
    skill: Skill;
    onOpen: (skill: Skill, element?: HTMLElement) => void;
    isActive?: boolean;
    isSelected?: boolean;
    onSelect?: (skill: Skill, selected: boolean) => void;
    isFocused?: boolean;
    onToggleFavorite?: (id: string) => void;
}

/**
 * Skill row. Shares the exact styling rules of ModelRow / MCPRow:
 * no decorative leading icon, no inline favorite star (favoriting happens
 * in the detail panel), 12-col grid, identical row states. Pure text +
 * text chips.
 */
export const SkillsRow = memo(function SkillsRow({
    skill,
    onOpen,
    isActive,
    isSelected,
    onSelect,
    isFocused,
}: SkillsRowProps) {
    const rowBg = isActive
        ? 'border-accent/50 bg-accent/10 shadow-[0_0_15px_rgba(var(--accent-rgb,139,92,246),0.1)]'
        : 'border-border bg-bg-card';

    const textMain = 'text-text';
    const textSecondary = 'text-text-secondary';
    const subtleText = 'text-text-subtle';

    const originLabel = skill.origin.replace(/-/g, ' ');

    return (
        <div
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) return;
                onOpen(skill, e.currentTarget);
            }}
            className={`group/row relative grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${rowBg} px-3 py-2 text-left transition cursor-pointer hover:border-accent ${isFocused ? 'ring-2 ring-accent z-10' : ''}`}
        >
            <div className="col-span-1 flex justify-start items-center h-full pl-6">
                <RoundCheckbox
                    checked={!!isSelected}
                    onChange={(checked) => onSelect && onSelect(skill, checked)}
                    size="sm"
                    ariaLabel={`Select ${skill.name}`}
                />
            </div>

            <div className="col-span-3 flex min-w-0 items-center gap-2 overflow-hidden text-left">
                <div className="flex min-w-0 flex-col">
                    <span className={`truncate text-sm ${textMain}`} title={skill.name}>{skill.name}</span>
                    <span className={`truncate text-xs ${subtleText}`} title={skill.id}>{skill.id}</span>
                </div>
            </div>

            <div className={`col-span-2 text-sm ${textSecondary}`}>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono capitalize">{skill.type}</span>
            </div>

            <div className={`col-span-2 truncate text-sm ${textSecondary} capitalize`} title={skill.family || ''}>
                {skill.family || '—'}
            </div>

            <div className={`col-span-2 truncate text-sm ${textSecondary} capitalize`} title={originLabel}>
                {originLabel}
            </div>

            <div className={`col-span-2 truncate text-xs ${textSecondary} font-mono`} title={skill.source}>
                {skill.source}
            </div>
        </div>
    );
});
