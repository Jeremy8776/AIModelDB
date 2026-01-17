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
    /** Loading progress (optional) */
    progress?: {
        current: number;
        total: number;
    } | null;
}

/**
 * Full-screen loading component with progress indicator
 */
export function LoadingScreen({ theme, progress }: LoadingScreenProps) {
    const { t } = useTranslation();

    const bgRoot = theme === 'dark'
        ? 'bg-black text-zinc-100'
        : 'bg-white text-black';

    const textSubtle = theme === 'dark'
        ? 'text-zinc-400'
        : 'text-gray-800';

    const progressBg = theme === 'dark'
        ? 'bg-gray-700'
        : 'bg-gray-200';

    return (
        <div className={`min-h-screen ${bgRoot} flex items-center justify-center`}>
            <div className="flex flex-col items-center gap-4 max-w-md w-full px-4">
                <Database className="size-16 animate-pulse text-accent" />

                <div className="text-center w-full">
                    <h2 className="text-xl font-semibold mb-2">
                        {t('app.loadingTitle')}
                    </h2>
                    <p className={`text-sm ${textSubtle} mb-4`}>
                        {t('app.loadingDesc')}
                    </p>

                    {progress && (
                        <div className="w-full">
                            <div className="flex justify-between text-xs mb-1">
                                <span>{progress.current.toLocaleString()} models</span>
                                <span>
                                    {progress.total > 0
                                        ? `${Math.round((progress.current / progress.total) * 100)}%`
                                        : '0%'
                                    }
                                </span>
                            </div>
                            <div className={`w-full ${progressBg} rounded-full h-2`}>
                                <div
                                    className="bg-accent h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: progress.total > 0
                                            ? `${(progress.current / progress.total) * 100}%`
                                            : '0%'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
