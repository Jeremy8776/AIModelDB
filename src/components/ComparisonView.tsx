import React from 'react';
import { X, Check, Minus } from 'lucide-react';
import { Model } from '../types';

interface ComparisonViewProps {
    models: Model[];
    onClose: () => void;
    theme: 'light' | 'dark';
}

export function ComparisonView({ models, onClose, theme }: ComparisonViewProps) {
    const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200';
    const textBase = theme === 'dark' ? 'text-zinc-100' : 'text-gray-900';
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-500';
    const border = theme === 'dark' ? 'border-zinc-800' : 'border-gray-200';
    const cellBg = theme === 'dark' ? 'odd:bg-zinc-900/50 even:bg-transparent' : 'odd:bg-gray-50 even:bg-white';

    // Helper to render check/x for booleans
    const renderBoolean = (val?: boolean) => {
        if (val === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />;
        if (val === false) return <X className="w-4 h-4 text-red-500 mx-auto" />;
        return <Minus className="w-4 h-4 text-zinc-500 mx-auto opacity-20" />;
    };

    // Helper to format cost
    const formatCost = (m: Model) => {
        if (!m.pricing || m.pricing.length === 0) return 'Unknown';
        const p = m.pricing[0];
        if (p.input && p.output) return `$${p.input}/$${p.output}`;
        if (p.flat) return `$${p.flat} ${p.unit}`;
        return 'Free/Unknown';
    };

    const attributes = [
        { label: 'Provider', render: (m: Model) => m.provider || '—' },
        { label: 'Domain', render: (m: Model) => m.domain || '—' },
        { label: 'Release Date', render: (m: Model) => m.release_date || '—' },
        { label: 'Parameters', render: (m: Model) => m.parameters || '—' },
        { label: 'Context Window', render: (m: Model) => m.context_window ? `${m.context_window.toLocaleString()} tok` : '—' },
        { label: 'License', render: (m: Model) => m.license?.name || '—' },
        { label: 'Commercial Use', render: (m: Model) => renderBoolean(m.license?.commercial_use) },
        { label: 'Open Weights', render: (m: Model) => renderBoolean(m.hosting?.weights_available) },
        { label: 'API Available', render: (m: Model) => renderBoolean(m.hosting?.api_available) },
        { label: 'Pricing (In/Out per 1M)', render: (m: Model) => formatCost(m) },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${bgCard} ${textBase}`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
                    <h2 className="text-xl font-semibold">Compare Models</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-auto flex-1 p-6">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className={`p-4 text-left font-medium w-1/4 ${textSubtle}`}>Feature</th>
                                {models.map(m => (
                                    <th key={m.id} className="p-4 text-center font-bold text-lg min-w-[200px]">
                                        {m.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {attributes.map((attr, i) => (
                                <tr key={attr.label} className={cellBg}>
                                    <td className={`p-4 font-medium border-t ${border} ${textSubtle}`}>
                                        {attr.label}
                                    </td>
                                    {models.map(m => (
                                        <td key={m.id} className={`p-4 text-center border-t border-l ${border}`}>
                                            {attr.render(m)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
