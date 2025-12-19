import { useEffect } from 'react';
import { Model } from '../types';

/**
 * Configuration for confirmation toast
 */
export interface ConfirmationToastConfig {
    title: string;
    message?: string;
    type?: 'confirm' | 'alert' | 'success' | 'error';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
}

/**
 * Handler callbacks for window events
 */
export interface WindowEventHandlers {
    /**
     * Handler for 'edit-model' event
     * Called when a model needs to be edited
     */
    onEditModel: (model: Model) => void;

    /**
     * Handler for 'show-confirmation' event
     * Called when a confirmation dialog needs to be shown
     */
    onShowConfirmation: (config: ConfirmationToastConfig) => void;

    /**
     * Handler for 'open-sync' event
     * Called when the sync modal should be opened
     */
    onOpenSync: () => void;
}

/**
 * Hook for managing custom window events in the AIModelDBPro component.
 * 
 * This hook sets up listeners for custom events dispatched by other components:
 * - 'edit-model' - Triggered when a model should be opened for editing
 * - 'show-confirmation' - Triggered when a confirmation dialog should be shown
 * - 'open-sync' - Triggered when the sync modal should be opened
 * 
 * @param handlers - Object containing callback functions for each event type
 */
export function useWindowEvents(handlers: WindowEventHandlers): void {
    const { onEditModel, onShowConfirmation, onOpenSync } = handlers;

    // Handle 'edit-model' and 'show-confirmation' events
    useEffect(() => {
        const handleEditModel = (e: Event) => {
            const customEvent = e as CustomEvent;
            const model = customEvent.detail;
            if (model) {
                onEditModel(model);
            }
        };

        const handleShowConfirmation = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { title, message, type, confirmText, cancelText, onConfirm } = customEvent.detail;
            onShowConfirmation({
                title,
                message,
                type: type || 'confirm',
                confirmText: confirmText || 'Confirm',
                cancelText: cancelText || 'Cancel',
                onConfirm
            });
        };

        // Add event listeners
        window.addEventListener('edit-model', handleEditModel);
        window.addEventListener('show-confirmation', handleShowConfirmation);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('edit-model', handleEditModel);
            window.removeEventListener('show-confirmation', handleShowConfirmation);
        };
    }, [onEditModel, onShowConfirmation]);

    // Handle 'open-sync' event
    useEffect(() => {
        const handleOpenSync = () => {
            onOpenSync();
        };

        // Add event listener
        window.addEventListener('open-sync', handleOpenSync);

        // Cleanup on unmount
        return () => window.removeEventListener('open-sync', handleOpenSync);
    }, [onOpenSync]);
}
