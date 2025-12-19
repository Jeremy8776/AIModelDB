/**
 * Toast Container Component
 * 
 * Container for all toast notifications in the application.
 * Manages display of import and validation completion toasts.
 * 
 * @module ToastContainer
 */

import { ImportToastData } from '../../hooks/useModalState';
import { ImportToast } from './ImportToast';
import { ValidationToast, ValidationToastData } from './ValidationToast';

/**
 * Props for the ToastContainer component
 */
export interface ToastContainerProps {
    importToast: ImportToastData | null;
    onDismissImport: () => void;
    validationToast: ValidationToastData | null;
    onDismissValidation: () => void;
    theme: 'light' | 'dark';
}

/**
 * Toast container component for displaying notifications.
 * 
 * Renders active toast notifications including:
 * - Import completion toast (top center)
 * - Validation completion toast (bottom right)
 * 
 * @param props - ToastContainer component props
 * @returns JSX.Element
 */
export function ToastContainer({
    importToast,
    onDismissImport,
    validationToast,
    onDismissValidation,
    theme
}: ToastContainerProps) {
    return (
        <>
            {/* Import Toast */}
            {importToast && (
                <ImportToast importToast={importToast} onDismiss={onDismissImport} theme={theme} />
            )}

            {/* Validation Toast */}
            {validationToast && (
                <ValidationToast
                    validationToast={validationToast}
                    onDismiss={onDismissValidation}
                    theme={theme}
                />
            )}
        </>
    );
}
