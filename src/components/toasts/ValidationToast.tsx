/**
 * Validation Toast Component
 * 
 * Toast notification displayed after validation operations complete.
 * Shows summary of validated and failed models.
 * 
 * @module ValidationToast
 */

import { Check, FileText } from 'lucide-react';
import { ValidationSummary } from '../../hooks/useModelValidation';

export interface ValidationToastData {
    completed: number;
    failed: number;
    summary?: ValidationSummary;
}

export interface ValidationToastProps {
    validationToast: ValidationToastData;
    onDismiss: () => void;
    onViewDetails?: () => void;
    theme: 'light' | 'dark';
}

export function ValidationToast({ validationToast, onDismiss, onViewDetails, theme }: ValidationToastProps) {
    return (
        <div
            className={`fixed bottom-20 right-4 z-50 rounded-xl border px-3 py-2 shadow-lg flex items-center gap-2 ${theme === 'dark'
                ? 'border-zinc-800 bg-black text-zinc-100'
                : 'border-zinc-200 bg-white text-zinc-900'
                }`}
        >
            <Check className="h-4 w-4 text-green-500" />
            <div className="flex flex-col">
                <span className="text-sm">
                    Validation complete: {validationToast.completed} validated
                    {validationToast.failed > 0 && `, ${validationToast.failed} failed`}
                </span>
                {validationToast.summary && (
                    <span className="text-[10px] opacity-70">
                        {validationToast.summary.modelsUpdated} updated, {validationToast.summary.webSearchUsed ? 'web search used' : 'local only'}
                    </span>
                )}
            </div>

            {validationToast.summary && onViewDetails && (
                <button
                    className={`ml-2 rounded-lg px-2 py-1 text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                    onClick={onViewDetails}
                >
                    <FileText size={12} />
                    Details
                </button>
            )}

            <button
                className={`ml-1 rounded-lg px-2 py-0.5 text-xs ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                    }`}
                onClick={onDismiss}
            >
                Dismiss
            </button>
        </div>
    );
}
