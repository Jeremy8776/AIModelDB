import React from 'react';
import { isElectron } from '../utils/electron';

interface TitleBarProps {
    title?: string;
}

export function TitleBar({ title = 'AI Model DB' }: TitleBarProps) {
    // Only show custom title bar in Electron
    if (!isElectron()) {
        return null;
    }

    return (
        <div
            className="app-titlebar h-8 flex items-center px-4 select-none sticky top-0 z-50 bg-black"
            style={{
                WebkitAppRegion: 'drag',
            } as React.CSSProperties}
        >
            <div className="flex items-center gap-2">
                {/* App Icon - uses CSS variables for theme adaptation */}
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <rect width="32" height="32" rx="6" style={{ fill: 'var(--bgCard, #111113)' }} />
                    <path
                        d="M8 10h16M8 16h12M8 22h8"
                        style={{ stroke: 'var(--accent, #8b5cf6)' }}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <circle cx="24" cy="22" r="3" style={{ fill: 'var(--accent, #8b5cf6)' }} />
                </svg>
                {/* Title */}
                <span className="text-xs font-medium">{title}</span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center ml-auto no-drag window-controls gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={() => window.electronAPI?.minimize()}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors group"
                    title="Minimize"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400 group-hover:text-zinc-100">
                        <path d="M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    onClick={() => window.electronAPI?.maximize()}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors group"
                    title="Maximize"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400 group-hover:text-zinc-100">
                        <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" strokeWidth="1.5" rx="1" />
                    </svg>
                </button>
                <button
                    onClick={() => window.electronAPI?.close()}
                    className="p-1.5 hover:bg-red-500/80 rounded-md transition-colors group"
                    title="Close"
                >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400 group-hover:text-white">
                        <path d="M2.5 2.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
