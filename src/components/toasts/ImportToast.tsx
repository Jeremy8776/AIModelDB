/**
 * Import Toast Component
 * 
 * Toast notification displayed after import/sync operations complete.
 * Shows summary of found, added, updated, and flagged models.
 * 
 * @module ImportToast
 */

import { Check } from 'lucide-react';
import { ImportToastData } from '../../hooks/useModalState';

/**
 * Props for the ImportToast component
 */
export interface ImportToastProps {
    importToast: ImportToastData;
    onDismiss: () => void;
    theme: 'light' | 'dark';
}

/**
 * Import toast notification component.
 * 
 * Displays a success message with import statistics:
 * - Total models found
 * - Models updated
 * - New models added
 * - Models flagged (if any)
 * 
 * @param props - ImportToast component props
 * @returns JSX.Element
 */
export function ImportToast({ importToast, onDismiss, theme }: ImportToastProps) {
    return (
        <div
            className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] rounded-xl border px-3 py-3 shadow-lg flex items-start gap-3 ${theme === 'dark'
                ? 'border-zinc-800 bg-black text-zinc-100'
                : 'border-zinc-200 bg-white text-zinc-900'
                }`}
        >
            <Check className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="text-sm leading-tight w-48">
                <div className="mb-2">
                    <span className="font-medium">Discovery complete</span>
                </div>
                <div className="space-y-1.5 text-xs opacity-90">
                    <div className="flex items-center justify-between">
                        <span className="opacity-70">Found</span>
                        <span className="font-medium">{importToast.found}</span>
                    </div>
                    <div className="h-px bg-current opacity-10 my-1" />
                    <div className="flex items-center justify-between text-yellow-500/90">
                        <span>Duplicates</span>
                        <span className="font-medium">{importToast.duplicates ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-red-500/90">
                        <span>Blocked</span>
                        <span className="font-medium">{importToast.flagged ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-green-500/90">
                        <span>New</span>
                        <span className="font-medium">{importToast.added}</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-500/90">
                        <span>Updated</span>
                        <span className="font-medium">{importToast.updated}</span>
                    </div>
                </div>
            </div>
            <button
                className={`ml-2 rounded-lg px-2 py-0.5 text-xs ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                    }`}
                onClick={onDismiss}
            >
                Dismiss
            </button>
        </div>
    );
}
