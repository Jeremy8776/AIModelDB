import { useCallback } from 'react';
import { Model } from '../types';
import { ConsoleLogging } from './useConsoleLogging';

interface UseDashboardTogglesProps {
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    consoleLogging: ConsoleLogging;
    setModelToFlag: (model: Model | null) => void;
    setFlagModalOpen: (open: boolean) => void;
}

/**
 * Extracted hook for handling model-related toggles and flags
 */
export function useDashboardToggles({
    setModels,
    consoleLogging,
    setModelToFlag,
    setFlagModalOpen
}: UseDashboardTogglesProps) {

    const handleToggleFavorite = useCallback((model: Model) => {
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, isFavorite: !m.isFavorite } : m));
    }, [setModels]);

    const handleToggleNSFWFlag = useCallback((model: Model) => {
        if (model.isNSFWFlagged) {
            setModels(prev => prev.map(m => m.id === model.id ? { ...m, isNSFWFlagged: false } : m));
            consoleLogging.addConsoleLog(`Unflagged model: ${model.name}`);
        } else {
            setModelToFlag(model);
            setFlagModalOpen(true);
        }
    }, [setModels, consoleLogging, setModelToFlag, setFlagModalOpen]);

    const handleToggleImageNSFW = useCallback((model: Model, imageUrl: string) => {
        setModels(prev => prev.map(m => {
            if (m.id !== model.id) return m;
            const currentFlagged = m.flaggedImageUrls || [];
            const isFlagged = currentFlagged.includes(imageUrl);
            const newFlagged = isFlagged
                ? currentFlagged.filter(url => url !== imageUrl)
                : [...currentFlagged, imageUrl];
            return { ...m, flaggedImageUrls: newFlagged };
        }));
        const isFlagging = !(model.flaggedImageUrls?.includes(imageUrl));
        consoleLogging.addConsoleLog(`${isFlagging ? 'Flagged' : 'Unflagged'} image as NSFW for model: ${model.name}`);
    }, [setModels, consoleLogging]);

    return {
        handleToggleFavorite,
        handleToggleNSFWFlag,
        handleToggleImageNSFW
    };
}
