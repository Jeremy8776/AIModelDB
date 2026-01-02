/**
 * Modal State Hook
 * 
 * Manages visibility state for all modals and toast notifications in the application.
 * 
 * @module useModalState
 */

import { useState } from 'react';
import { Model } from '../types';
import { UndoToastData } from '../components/toasts/UndoToast';

/**
 * Data structure for import toast notifications
 */
export interface ImportToastData {
    found: number;
    added: number;
    updated: number;
    flagged: number;
    duplicates?: number;
}

export interface ConfirmationToastData {
    title: string;
    message?: string;
    type?: 'confirm' | 'alert' | 'success' | 'error';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

/**
 * Modal state interface containing all modal visibility states and setters
 */
export interface ModalState {
    // Modal visibility states
    showAddModel: boolean;
    setShowAddModel: (show: boolean) => void;
    showSync: boolean;
    setShowSync: (show: boolean) => void;
    showImport: boolean;
    setShowImport: (show: boolean) => void;
    showOnboarding: boolean;
    setShowOnboarding: (show: boolean) => void;
    onboardingStartStep: number;
    setOnboardingStartStep: (step: number) => void;
    showFlaggedModal: boolean;
    setShowFlaggedModal: (show: boolean) => void;
    showEditModal: boolean;
    setShowEditModal: (show: boolean) => void;
    showExportModal: boolean;
    setShowExportModal: (show: boolean) => void;

    // Model editing state
    editingModel: Model | null;
    setEditingModel: (model: Model | null) => void;

    // Flagged models state
    flaggedModels: Model[];
    setFlaggedModels: (models: Model[]) => void;

    // Toast states
    importToast: ImportToastData | null;
    setImportToast: (toast: ImportToastData | null) => void;
    confirmationToast: ConfirmationToastData | null;
    setConfirmationToast: (toast: ConfirmationToastData | null) => void;
    undoToast: UndoToastData | null;
    setUndoToast: (toast: UndoToastData | null) => void;
}

/**
 * Custom hook for managing modal state.
 * 
 * Provides centralized state management for all modals and toasts including:
 * - Modal visibility (add, sync, import, onboarding, flagged, edit, settings)
 * - Model editing state
 * - Flagged models list
 * - Toast notifications (import, confirmation)
 * 
 * @returns ModalState object with all state values and setter functions
 * 
 * @example
 * ```tsx
 * const modalState = useModalState();
 * 
 * // Show add model modal
 * modalState.setShowAddModel(true);
 * 
 * // Edit a model
 * modalState.setEditingModel(model);
 * modalState.setShowEditModal(true);
 * 
 * // Show import toast
 * modalState.setImportToast({ found: 100, added: 50, updated: 30, flagged: 5 });
 * ```
 */
export function useModalState(): ModalState {
    // Modal visibility states
    const [showAddModel, setShowAddModel] = useState(false);
    const [showSync, setShowSync] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showFlaggedModal, setShowFlaggedModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);

    // Model editing state
    const [editingModel, setEditingModel] = useState<Model | null>(null);

    // Flagged models state
    const [flaggedModels, setFlaggedModels] = useState<Model[]>([]);

    // Toast states
    const [importToast, setImportToast] = useState<ImportToastData | null>(null);
    const [confirmationToast, setConfirmationToast] = useState<ConfirmationToastData | null>(null);
    const [undoToast, setUndoToast] = useState<UndoToastData | null>(null);

    const [onboardingStartStep, setOnboardingStartStep] = useState(1);

    return {
        showAddModel,
        setShowAddModel,
        showSync,
        setShowSync,
        showImport,
        setShowImport,
        showOnboarding,
        setShowOnboarding,
        onboardingStartStep,
        setOnboardingStartStep,
        showFlaggedModal,
        setShowFlaggedModal,
        showEditModal,
        setShowEditModal,
        showExportModal,
        setShowExportModal,
        editingModel,
        setEditingModel,
        flaggedModels,
        setFlaggedModels,
        importToast,
        setImportToast,
        confirmationToast,
        setConfirmationToast,
        undoToast,
        setUndoToast,
    };
}
