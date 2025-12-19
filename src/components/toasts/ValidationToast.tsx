/**
 * Validation Toast Component
 * 
 * Toast notification displayed after validation operations complete.
 * Shows summary of validated and failed models.
 * 
 * @module ValidationToast
 */

import { Check } from 'lucide-react';

/**
 * Data structure for validation toast
 */
export interface ValidationToastData {
    completed: number;
    failed: number;
}

export interface ValidationToastProps {
    validationToast: ValidationToastData;
    onDismiss: () => void;
    theme: 'light' | 'dark';
}

/**
 * Validation toast notification component.
 * 
 * Displays a success message with validation statistics:
 * - Number of models validated
 * - Number of models that failed validation (if any)
 * 
 * @param props - ValidationToast component props
 * @returns JSX.Element
 */
export function ValidationToast({ validationToast, onDismiss, theme }: ValidationToastProps) {
    return (
        <div
            className={`fixed bottom-20 right-4 z-50 rounded-xl border px-3 py-2 shadow-lg flex items-center gap-2 ${theme === 'dark'
                ? 'border-zinc-800 bg-black text-zinc-100'
                : 'border-zinc-200 bg-white text-zinc-900'
                }`}
        >
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm">
                Validation complete: {validationToast.completed} validated
                {validationToast.failed > 0 && `, ${validationToast.failed} failed`}
            </span>
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
