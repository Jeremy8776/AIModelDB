/**
 * Empty State Component
 * 
 * Premium empty state design for when no models are loaded.
 * Features animated illustration and quick action cards.
 * 
 * @module EmptyState
 */

import React, { useContext } from 'react';
import { Database, Upload, RefreshCw, Sparkles } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';

interface EmptyStateProps {
    onSetupSources: () => void;
    onImport: () => void;
}

export function EmptyState({ onSetupSources, onImport }: EmptyStateProps) {
    const { theme } = useContext(ThemeContext);

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            {/* Animated Database Icon */}
            <div
                className="relative mb-8"
                style={{
                    animation: 'float 3s ease-in-out infinite',
                }}
            >
                {/* Glow effect */}
                <div
                    className="absolute inset-0 blur-3xl opacity-30 rounded-full"
                    style={{
                        background: `radial-gradient(circle, var(--accent) 0%, transparent 70%)`,
                        transform: 'scale(2)',
                    }}
                />

                {/* Icon container */}
                <div
                    className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
                    style={{
                        background: `linear-gradient(135deg, var(--accentGlow) 0%, transparent 100%)`,
                        border: '1px solid var(--accent)',
                    }}
                >
                    <Database
                        size={48}
                        style={{ color: 'var(--accent)' }}
                        strokeWidth={1.5}
                    />
                    <Sparkles
                        size={16}
                        className="absolute -top-2 -right-2"
                        style={{ color: 'var(--accent)' }}
                    />
                </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-2">
                Welcome to AI Model Database
            </h2>

            {/* Subtitle */}
            <p
                className="text-center max-w-md mb-8"
                style={{ color: 'var(--textSecondary)' }}
            >
                Your centralized hub for tracking, organizing, and managing AI models
                from multiple providers and platforms.
            </p>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full">
                {/* Setup Sources Card */}
                <button
                    onClick={onSetupSources}
                    className="group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02]"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                        style={{
                            backgroundColor: 'var(--accent)',
                        }}
                    />
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                            style={{ backgroundColor: 'var(--accentGlow)' }}
                        >
                            <RefreshCw size={20} style={{ color: 'var(--accent)' }} />
                        </div>
                        <h3 className="font-semibold mb-1">Setup Data Sources</h3>
                        <p className="text-sm" style={{ color: 'var(--textSecondary)' }}>
                            Connect to Hugging Face, CivitAI, and other platforms
                        </p>
                    </div>
                </button>

                {/* Import Card */}
                <button
                    onClick={onImport}
                    className="group relative overflow-hidden rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02]"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                        style={{
                            backgroundColor: 'var(--accent)',
                        }}
                    />
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                            style={{ backgroundColor: 'var(--accentGlow)' }}
                        >
                            <Upload size={20} style={{ color: 'var(--accent)' }} />
                        </div>
                        <h3 className="font-semibold mb-1">Import from File</h3>
                        <p className="text-sm" style={{ color: 'var(--textSecondary)' }}>
                            Load models from JSON, CSV, or Excel files
                        </p>
                    </div>
                </button>
            </div>

            {/* Keyboard hint */}
            <p
                className="mt-8 text-xs"
                style={{ color: 'var(--textSubtle)' }}
            >
                Press <kbd
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono mx-1"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        border: '1px solid var(--border)'
                    }}
                >?</kbd> for keyboard shortcuts
            </p>

            {/* CSS for float animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
