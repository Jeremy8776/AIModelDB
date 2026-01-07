/**
 * Keyboard Shortcuts Modal Component
 * 
 * Displays all available keyboard shortcuts in the application.
 * Triggered by pressing '?' key.
 * 
 * @module KeyboardShortcutsModal
 */

import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Keyboard } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';



interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    const { theme } = useContext(ThemeContext);
    const { t } = useTranslation();

    const SHORTCUT_GROUPS = [
        {
            title: t('shortcutsModal.navigation'),
            shortcuts: [
                { keys: ['↓', 'J'], description: t('shortcutsModal.navNext') },
                { keys: ['↑', 'K'], description: t('shortcutsModal.navPrev') },
                { keys: ['Enter'], description: t('shortcutsModal.navOpen') },
                { keys: ['Esc'], description: t('shortcutsModal.navClose') },
            ]
        },
        {
            title: t('shortcutsModal.selection'),
            shortcuts: [
                { keys: ['Space', 'X'], description: t('shortcutsModal.selToggle') },
                { keys: ['Ctrl', 'A'], description: t('shortcutsModal.selAll') },
            ]
        },
        {
            title: t('shortcutsModal.actions'),
            shortcuts: [
                { keys: ['Ctrl', 'F'], description: t('shortcutsModal.actFocus') },
                { keys: ['Ctrl', 'R'], description: t('shortcutsModal.actRefresh') },
                { keys: ['Ctrl', 'E'], description: t('shortcutsModal.actExport') },
                { keys: ['Del'], description: t('shortcutsModal.actDelete') },
            ]
        },
        {
            title: t('shortcutsModal.general'),
            shortcuts: [
                { keys: ['?'], description: t('shortcutsModal.genHelp') },
                { keys: ['Ctrl', ','], description: t('shortcutsModal.genSettings') },
            ]
        }
    ];

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
                        <h2 className="text-xl font-bold">{t('shortcutsModal.title')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
                        title={t('common.close')}
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
                            🔍 {t('shortcutsModal.searchSyntax')}
                        </h3>
                        <p className={`text-xs ${textMuted} mb-3`}>
                            {t('shortcutsModal.searchSyntaxDesc')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {[
                                { syntax: 'domain:ImageGen', desc: t('shortcutsModal.operators.domain') },
                                { syntax: 'license:MIT', desc: t('shortcutsModal.operators.license') },
                                { syntax: 'downloads:>1000', desc: t('shortcutsModal.operators.downloads') },
                                { syntax: 'tag:transformer', desc: t('shortcutsModal.operators.tag') },
                                { syntax: '-tag:deprecated', desc: t('shortcutsModal.operators.excludeTag') },
                                { syntax: 'source:huggingface', desc: t('shortcutsModal.operators.source') },
                                { syntax: 'provider:openai', desc: t('shortcutsModal.operators.provider') },
                                { syntax: 'is:favorite', desc: t('shortcutsModal.operators.isFavorite') },
                                { syntax: 'is:commercial', desc: t('shortcutsModal.operators.isCommercial') },
                                { syntax: '"exact phrase"', desc: t('shortcutsModal.operators.exactPhrase') },
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
                    {t('shortcutsModal.pressEsc')}
                </div>
            </div>
        </div>
    );
}
