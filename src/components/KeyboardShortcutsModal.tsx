/**
 * Keyboard Shortcuts Modal Component
 * 
 * Displays all available keyboard shortcuts in the application.
 * Triggered by pressing '?' key.
 * 
 * @module KeyboardShortcutsModal
 */

import React, { useContext } from 'react';
import { X, Keyboard } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['↓', 'J'], description: 'Move to next model' },
            { keys: ['↑', 'K'], description: 'Move to previous model' },
            { keys: ['Enter'], description: 'Open selected model details' },
            { keys: ['Esc'], description: 'Close modal/panel' },
        ]
    },
    {
        title: 'Selection',
        shortcuts: [
            { keys: ['Space', 'X'], description: 'Toggle model selection' },
            { keys: ['Ctrl', 'A'], description: 'Select all visible models' },
        ]
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: ['Ctrl', 'F'], description: 'Focus search bar' },
            { keys: ['Ctrl', 'R'], description: 'Refresh/Sync models' },
            { keys: ['Ctrl', 'E'], description: 'Export selected/all' },
            { keys: ['Del'], description: 'Delete selected models' },
        ]
    },
    {
        title: 'General',
        shortcuts: [
            { keys: ['?'], description: 'Show this help' },
            { keys: ['Ctrl', ','], description: 'Open settings' },
        ]
    }
];

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    const { theme } = useContext(ThemeContext);

    if (!isOpen) return null;

    const bgCard = theme === 'dark' ? 'bg-black border-zinc-800' : 'bg-white border-gray-200';
    const bgKey = theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-300';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-gray-500';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={`relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border ${bgCard} shadow-2xl`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accentGlow)' }}>
                            <Keyboard className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        </div>
                        <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                        title="Close (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SHORTCUT_GROUPS.map((group) => (
                        <div key={group.title}>
                            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
                                {group.title}
                            </h3>
                            <div className="space-y-2">
                                {group.shortcuts.map((shortcut, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg"
                                        style={{ backgroundColor: 'var(--bgCard)' }}
                                    >
                                        <span className={`text-sm ${textMuted}`}>{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIdx) => (
                                                <React.Fragment key={keyIdx}>
                                                    {keyIdx > 0 && <span className={`text-xs ${textMuted}`}>+</span>}
                                                    <kbd
                                                        className={`px-2 py-1 text-xs font-mono rounded border ${bgKey}`}
                                                        style={{ minWidth: '24px', textAlign: 'center' }}
                                                    >
                                                        {key}
                                                    </kbd>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Advanced Search Syntax Section */}
                <div className="px-5 pb-5">
                    <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>
                            🔍 Advanced Search Syntax
                        </h3>
                        <p className={`text-xs ${textMuted} mb-3`}>
                            Use these operators in the search bar to filter results:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {[
                                { syntax: 'domain:ImageGen', desc: 'Filter by domain' },
                                { syntax: 'license:MIT', desc: 'Filter by license' },
                                { syntax: 'downloads:>1000', desc: 'Min downloads (>, <, >=, <=)' },
                                { syntax: 'tag:transformer', desc: 'Include models with tag' },
                                { syntax: '-tag:deprecated', desc: 'Exclude models with tag' },
                                { syntax: 'source:huggingface', desc: 'Filter by source' },
                                { syntax: 'provider:openai', desc: 'Filter by provider' },
                                { syntax: 'is:favorite', desc: 'Only favorites' },
                                { syntax: 'is:commercial', desc: 'Commercial use allowed' },
                                { syntax: '"exact phrase"', desc: 'Match exact phrase' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 py-1.5 px-2 rounded" style={{ backgroundColor: 'var(--bgCard)' }}>
                                    <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${bgKey}`} style={{ color: 'var(--accent)' }}>
                                        {item.syntax}
                                    </code>
                                    <span className={textMuted}>{item.desc}</span>
                                </div>
                            ))}
                        </div>
                        <p className={`text-xs ${textMuted} mt-3 italic`}>
                            Example: <code className="px-1 rounded" style={{ backgroundColor: 'var(--bgCard)' }}>{'domain:ImageGen license:MIT downloads:>500 stable'}</code>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t text-center text-sm ${textMuted}`} style={{ borderColor: 'var(--border)' }}>
                    Press <kbd className={`px-2 py-0.5 text-xs font-mono rounded border ${bgKey}`}>Esc</kbd> to close
                </div>
            </div>
        </div>
    );
}
