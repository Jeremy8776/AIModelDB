/**
 * Loading Screen Component
 * 
 * Full-screen loading indicator displayed while the app initializes
 * and loads models from storage.
 */

import React from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingScreenProps {
    /** Current theme */
    theme: 'dark' | 'light';
}

/**
 * Full-screen loading component shown briefly during the initial IndexedDB read.
 * Uses an indeterminate bar (no fake percentage / model count).
 */
export function LoadingScreen({ theme }: LoadingScreenProps) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-bg text-text flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-sm w-full px-4">
                <Database className="size-16 animate-pulse text-accent" />

                <div className="text-center w-full">
                    <h2 className="text-xl font-semibold mb-2">
                        {t('app.loadingTitle')}
                    </h2>
                    <p className="text-sm text-text-secondary mb-4">
                        {t('app.loadingDesc')}
                    </p>

                    {/* Indeterminate bar — a sliding accent segment, no fake percentage. */}
                    <div className="w-full bg-bg-input rounded-full h-1 overflow-hidden">
                        <div
                            className="bg-accent h-full w-1/4 rounded-full"
                            style={{ animation: 'indeterminate-bar 1.1s ease-in-out infinite' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
