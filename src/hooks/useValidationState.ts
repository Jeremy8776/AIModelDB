/**
 * Validation State Hook
 * 
 * Manages validation state including modal visibility, completion notifications,
 * and validation control (pause/cancel).
 * 
 * @module useValidationState
 */

import { useState } from 'react';

/**
 * Validation state interface containing all validation-related state and setters
 */
import { ValidationSummary } from './useModelValidation';

/**
 * Validation state interface containing all validation-related state and setters
 */
export interface ValidationState {
    // Validation modal visibility
    showValidation: boolean;
    setShowValidation: (show: boolean) => void;

    // Validation toast (completion notification)
    validationToast: { completed: number; failed: number; summary?: ValidationSummary } | null;
    setValidationToast: (toast: { completed: number; failed: number; summary?: ValidationSummary } | null) => void;

    // Validation control state
    validationPaused: boolean;
    setValidationPaused: (paused: boolean) => void;
    validationCancelRequested: boolean;
    setValidationCancelRequested: (requested: boolean) => void;
}
//...
export function useValidationState(): ValidationState {
    // Validation modal visibility state
    const [showValidation, setShowValidation] = useState(false);

    // Validation toast state (for displaying completion notification)
    const [validationToast, setValidationToast] = useState<{ completed: number; failed: number; summary?: ValidationSummary } | null>(null);

    // Validation control state (for pause/cancel operations)
    const [validationPaused, setValidationPaused] = useState(false);
    const [validationCancelRequested, setValidationCancelRequested] = useState(false);

    return {
        showValidation,
        setShowValidation,
        validationToast,
        setValidationToast,
        validationPaused,
        setValidationPaused,
        validationCancelRequested,
        setValidationCancelRequested,
    };
}
