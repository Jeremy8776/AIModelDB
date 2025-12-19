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
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-xl border px-3 py-2 shadow-lg flex items-start gap-2 ${theme === 'dark'
                ? 'border-zinc-800 bg-black text-zinc-100'
                : 'border-zinc-200 bg-white text-zinc-900'
                }`}
        >
            <Check className="h-4 w-4 text-green-500 mt-0.5" />
            <div className="text-sm leading-tight">
                <div>
                    <span className="font-medium">Discovery complete</span>
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                    Found {importToast.found} models • {importToast.updated} updated •{' '}
                    {importToast.added} new
                    {importToast.flagged ? ` • ${importToast.flagged} flagged` : ''}
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
