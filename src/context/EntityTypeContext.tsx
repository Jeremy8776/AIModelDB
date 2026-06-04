import React, { createContext, useContext, useEffect, useState } from 'react';
import { EntityType, ENTITY_TYPES } from '../types';

const STORAGE_KEY = 'aiModelDB_activeEntity';

interface EntityTypeContextValue {
    activeEntity: EntityType;
    setActiveEntity: (entity: EntityType) => void;
}

const EntityTypeContext = createContext<EntityTypeContextValue | undefined>(undefined);

/**
 * Provider for the top-level entity tab switcher (Models | MCP | Skills).
 *
 * Persists the active tab to localStorage so users return to where they left off.
 * Default is "models" — preserves the existing single-tab UX for users on first
 * load after the upgrade.
 */
export function EntityTypeProvider({ children }: { children: React.ReactNode }) {
    const [activeEntity, setActiveEntityState] = useState<EntityType>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && (ENTITY_TYPES as readonly string[]).includes(stored)) {
                return stored as EntityType;
            }
        } catch { /* localStorage unavailable — fall through to default */ }
        return 'models';
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, activeEntity);
        } catch { /* localStorage write failed — non-fatal, in-memory state still works */ }
    }, [activeEntity]);

    const setActiveEntity = (entity: EntityType) => {
        setActiveEntityState(entity);
    };

    return (
        <EntityTypeContext.Provider value={{ activeEntity, setActiveEntity }}>
            {children}
        </EntityTypeContext.Provider>
    );
}

export function useEntityType(): EntityTypeContextValue {
    const ctx = useContext(EntityTypeContext);
    if (!ctx) {
        throw new Error('useEntityType must be used within an EntityTypeProvider');
    }
    return ctx;
}
