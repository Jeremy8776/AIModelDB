import React from 'react';
import { RefreshCw, Upload } from 'lucide-react';

interface SectionEmptyStateProps {
    title: string;
    description: string;
    onSyncAll: () => void;
    onImportCustom: () => void;
}

export function SectionEmptyState({ title, description, onSyncAll, onImportCustom }: SectionEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[36vh] p-8 text-center">
            <div className="max-w-xl">
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-sm text-text-secondary mb-5">{description}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={onSyncAll}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-accent text-white hover:bg-accent-dark"
                    >
                        <RefreshCw className="size-4" />
                        Sync All
                    </button>
                    <button
                        type="button"
                        onClick={onImportCustom}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border border-border bg-bg-card text-text hover:bg-bg/70"
                    >
                        <Upload className="size-4" />
                        Import Custom Data
                    </button>
                </div>
            </div>
        </div>
    );
}
