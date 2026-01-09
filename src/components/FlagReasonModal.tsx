import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import ThemeContext from '../context/ThemeContext';
import { AlertCircle, X } from 'lucide-react';

interface FlagReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    modelName: string;
}

export function FlagReasonModal({ isOpen, onClose, onConfirm, modelName }: FlagReasonModalProps) {
    const { theme } = useContext(ThemeContext);
    const { t } = useTranslation();
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const bgCard = theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200';
    const textMain = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
    const textSub = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const bgInput = theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-xl border p-6 shadow-2xl ${bgCard} animate-in fade-in zoom-in-95 duration-200`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 text-amber-500">
                        <AlertCircle className="size-5" />
                        <h3 className={`text-lg font-semibold ${textMain}`}>Flagging Model as NSFW</h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
                        <X className="size-5" />
                    </button>
                </div>

                <p className={`mb-4 text-sm ${textSub}`}>
                    You are manually flagging <span className={`font-medium ${textMain}`}>"{modelName}"</span> as inappropriate.
                </p>
                <p className={`mb-2 text-sm ${textMain}`}>
                    Help us improve the filter. What keywords caused you to flag this?
                </p>

                <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. prone bone, excessive gore..."
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-6 ${bgInput} ${textMain}`}
                    autoFocus
                />

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className={`rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${textSub}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm(reason);
                            setReason('');
                        }}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                        Flag Model
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
