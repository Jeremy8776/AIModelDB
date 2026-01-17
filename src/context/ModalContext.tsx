import React, { createContext, useContext, ReactNode } from 'react';
import { useModalState, ModalState } from '../hooks/useModalState';

const ModalContext = createContext<ModalState | null>(null);

/**
 * Provider component for ModalContext.
 * Wraps the application to provide global access to modal state.
 */
export function ModalProvider({ children }: { children: ReactNode }) {
    const modalState = useModalState();
    return (
        <ModalContext.Provider value={modalState}>
            {children}
        </ModalContext.Provider>
    );
}

/**
 * Hook to consume ModalContext.
 * Must be used within a ModalProvider.
 */
export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
