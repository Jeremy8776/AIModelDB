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
export interface ValidationState {
    // Validation modal visibility
    showValidation: boolean;
    setShowValidation: (show: boolean) => void;

    // Validation toast (completion notification)
    validationToast: { completed: number; failed: number } | null;
    setValidationToast: (toast: { completed: number; failed: number } | null) => void;

    // Validation control state
    validationPaused: boolean;
    setValidationPaused: (paused: boolean) => void;
    validationCancelRequested: boolean;
    setValidationCancelRequested: (requested: boolean) => void;
}

/**
 * Custom hook for managing validation state.
 * 
 * Provides centralized state management for validation operations including:
 * - Validation modal visibility
 * - Validation completion toast
 * - Validation control (pause/cancel)
 * 
 * @returns ValidationState object with all state values and setter functions
 * 
 * @example
 * ```tsx
 * const validationState = useValidationState();
 * 
 * // Show validation modal
 * validationState.setShowValidation(true);
 * 
 * // Pause validation
 * validationState.setValidationPaused(true);
 * 
 * // Show completion toast
 * validationState.setValidationToast({ completed: 50, failed: 2 });
 * ```
 */
export function useValidationState(): ValidationState {
    // Validation modal visibility state
    const [showValidation, setShowValidation] = useState(false);

    // Validation toast state (for displaying completion notification)
    const [validationToast, setValidationToast] = useState<{ completed: number; failed: number } | null>(null);

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
