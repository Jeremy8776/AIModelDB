import React, { useContext, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';

export interface UndoToastData {
    message: string;
    onUndo: () => void;
    duration?: number;
}

interface UndoToastProps {
    data: UndoToastData | null;
    onClose: () => void;
}

export function UndoToast({ data, onClose }: UndoToastProps) {
    const { theme } = useContext(ThemeContext);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!data) return;

        const duration = data.duration || 5000;
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        const decrement = 100 / steps;

        setProgress(100);

        const timer = setInterval(() => {
            setProgress(prev => {
                const next = prev - decrement;
                if (next <= 0) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return next;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [data, onClose]);

    if (!data) return null;

    const bg = theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-white';

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border shadow-lg overflow-hidden animate-slide-up transition-all ${bg}`}>
            <div className="flex items-center gap-4 px-4 py-3">
                <span className="text-sm font-medium">{data.message}</span>
                <button
                    onClick={() => {
                        data.onUndo();
                        onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
                >
                    <RotateCcw size={14} />
                    Undo
                </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full bg-white/10 mt-[-1px]">
                <div
                    className="h-full bg-white/50 transition-all duration-75 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

// Add animation keyframe to global CSS if not present, or use Tailwind utility
// Assuming tailwind configs or index.css handles animate-slide-up usually, but we might need to add it.
// For now relying on standard transitions or existing.
