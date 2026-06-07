import React from 'react';
import { parseSources, HasSourceField } from '../../utils/sourceHelpers';

interface SourceBadgesProps {
    /** An entity with a comma-joined `source` string, or the raw string itself. */
    entity: HasSourceField | string | null | undefined;
    className?: string;
}

/**
 * Renders every data source an entity was aggregated from as a row of
 * button-style pills. Shared across the Models / MCP / Skills detail panels so
 * multi-source provenance reads identically everywhere.
 *
 * Uses parseSources() so the brittle comma-joined `source` string is split,
 * trimmed, and de-duplicated consistently (no more `source === 'HuggingFace'`
 * exact-match assumptions).
 */
export function SourceBadges({ entity, className = '' }: SourceBadgesProps) {
    const sources = parseSources(entity);
    if (sources.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {sources.map(source => (
                <span
                    key={source.toLowerCase()}
                    title={source}
                    className="inline-flex items-center rounded-lg border border-border bg-bg px-2.5 py-1 text-[11px] font-semibold text-text-secondary capitalize"
                >
                    {source.replace(/[-_]/g, ' ')}
                </span>
            ))}
        </div>
    );
}
