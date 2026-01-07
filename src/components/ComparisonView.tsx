import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Minus, ChevronDown, ChevronUp, Star, Sparkles, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import { Model } from '../types';

interface ComparisonViewProps {
    models: Model[];
    onClose: () => void;
    theme: 'light' | 'dark';
}

type AttributeCategory = 'basic' | 'capabilities' | 'licensing' | 'pricing' | 'technical';

interface Attribute {
    label: string;
    category: AttributeCategory;
    render: (m: Model) => React.ReactNode;
    getValue: (m: Model) => string | number | boolean | undefined;
}

export function ComparisonView({ models, onClose, theme }: ComparisonViewProps) {
    const { t } = useTranslation();
    const [expandedCategories, setExpandedCategories] = useState<Set<AttributeCategory>>(
        new Set(['basic', 'capabilities', 'licensing', 'pricing', 'technical'])
    );
    const [highlightDifferences, setHighlightDifferences] = useState(true);
    const [pinnedModel, setPinnedModel] = useState<string | null>(null);

    const bgCard = theme === 'dark' ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-gray-200';
    const textBase = theme === 'dark' ? 'text-zinc-100' : 'text-gray-900';
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-500';
    const border = theme === 'dark' ? 'border-zinc-800' : 'border-gray-200';
    const headerBg = theme === 'dark' ? 'bg-zinc-800/50' : 'bg-gray-50';
    const categoryBg = theme === 'dark' ? 'bg-zinc-800/30' : 'bg-gray-100/50';
    const highlightBg = theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-100/50';
    const bestBg = theme === 'dark' ? 'bg-emerald-500/15' : 'bg-emerald-100/50';

    // Helper to render check/x for booleans
    const renderBoolean = (val?: boolean) => {
        if (val === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
        if (val === false) return <X className="w-5 h-5 text-red-400 mx-auto" />;
        return <Minus className="w-5 h-5 text-zinc-500 mx-auto opacity-30" />;
    };

    // Helper to format cost
    const formatCost = (m: Model) => {
        if (!m.pricing || m.pricing.length === 0) return '—';
        const p = m.pricing[0];
        if (p.input && p.output) return `$${p.input}/$${p.output}`;
        if (p.flat) return `$${p.flat} ${p.unit}`;
        return t('comparison.free');
    };

    // Helper to format downloads
    const formatDownloads = (downloads?: number | null) => {
        if (!downloads) return '—';
        if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
        if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`;
        return downloads.toString();
    };

    const attributes: Attribute[] = [
        // Basic Info
        { label: t('comparison.attributes.provider'), category: 'basic', render: (m) => m.provider || '—', getValue: (m) => m.provider ?? undefined },
        { label: t('comparison.attributes.domain'), category: 'basic', render: (m) => m.domain || '—', getValue: (m) => m.domain ?? undefined },
        { label: t('comparison.attributes.source'), category: 'basic', render: (m) => m.source || '—', getValue: (m) => m.source ?? undefined },
        { label: t('comparison.attributes.releaseDate'), category: 'basic', render: (m) => m.release_date || '—', getValue: (m) => m.release_date ?? undefined },
        { label: t('comparison.attributes.downloads'), category: 'basic', render: (m) => formatDownloads(m.downloads), getValue: (m) => m.downloads ?? undefined },

        // Technical
        { label: t('comparison.attributes.parameters'), category: 'technical', render: (m) => m.parameters || '—', getValue: (m) => m.parameters ?? undefined },
        { label: t('comparison.attributes.contextWindow'), category: 'technical', render: (m) => m.context_window ? `${m.context_window.toLocaleString()} ${t('comparison.tokens')}` : '—', getValue: (m) => m.context_window ?? undefined },
        // Note: Architecture removed - field does not exist on Model type

        // Capabilities
        { label: t('comparison.attributes.apiAvailable'), category: 'capabilities', render: (m) => renderBoolean(m.hosting?.api_available), getValue: (m) => m.hosting?.api_available },
        { label: t('comparison.attributes.openWeights'), category: 'capabilities', render: (m) => renderBoolean(m.hosting?.weights_available), getValue: (m) => m.hosting?.weights_available },
        // Note: Fine-tunable removed - capabilities field does not exist on Model type

        // Licensing
        { label: t('comparison.attributes.license'), category: 'licensing', render: (m) => m.license?.name || '—', getValue: (m) => m.license?.name },
        { label: t('comparison.attributes.commercialUse'), category: 'licensing', render: (m) => renderBoolean(m.license?.commercial_use), getValue: (m) => m.license?.commercial_use },
        { label: t('comparison.attributes.attributionRequired'), category: 'licensing', render: (m) => renderBoolean(m.license?.attribution_required), getValue: (m) => m.license?.attribution_required },

        // Pricing
        { label: t('comparison.attributes.pricing'), category: 'pricing', render: (m) => formatCost(m), getValue: (m) => m.pricing?.[0]?.input ?? m.pricing?.[0]?.flat ?? undefined },
    ];

    const categoryLabels: Record<AttributeCategory, string> = {
        basic: `📋 ${t('comparison.basicInfo')}`,
        technical: `⚙️ ${t('comparison.technicalSpecs')}`,
        capabilities: `🚀 ${t('comparison.capabilities')}`,
        licensing: `📜 ${t('comparison.licensing')}`,
        pricing: `💰 ${t('comparison.pricing')}`,
    };

    const categoryOrder: AttributeCategory[] = ['basic', 'technical', 'capabilities', 'licensing', 'pricing'];

    // Check if values differ across models
    const valuesDiffer = (attr: Attribute): boolean => {
        const values = models.map(m => {
            const val = attr.getValue(m);
            return val === undefined ? 'undefined' : String(val);
        });
        return new Set(values).size > 1;
    };

    // Find the "best" value for numeric comparisons
    const getBestModelId = (attr: Attribute): string | null => {
        // Only for numeric attributes where higher is better
        const numericHigherBetter = [t('comparison.attributes.downloads'), t('comparison.attributes.contextWindow')];
        if (!numericHigherBetter.includes(attr.label)) return null;

        let bestId: string | null = null;
        let bestVal = -Infinity;
        models.forEach(m => {
            const val = attr.getValue(m);
            if (typeof val === 'number' && val > bestVal) {
                bestVal = val;
                bestId = m.id;
            }
        });
        return bestId;
    };

    const toggleCategory = (cat: AttributeCategory) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(cat)) {
            newSet.delete(cat);
        } else {
            newSet.add(cat);
        }
        setExpandedCategories(newSet);
    };

    // Group attributes by category
    const groupedAttributes = useMemo(() => {
        const groups: Record<AttributeCategory, Attribute[]> = {
            basic: [],
            technical: [],
            capabilities: [],
            licensing: [],
            pricing: [],
        };
        attributes.forEach(attr => {
            groups[attr.category].push(attr);
        });
        return groups;
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${bgCard} ${textBase}`}
                style={{ backdropFilter: 'blur(20px)' }}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                            <ArrowUpDown className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('comparison.title')}</h2>
                            <p className={`text-sm ${textSubtle}`}>
                                {t('comparison.subtitle', { count: models.length })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Toggle Highlight Differences */}
                        <button
                            onClick={() => setHighlightDifferences(!highlightDifferences)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${highlightDifferences
                                ? 'bg-amber-500/20 text-amber-400'
                                : theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-200 text-gray-600'
                                }`}
                        >
                            {highlightDifferences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {t('comparison.highlightDifferences')}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Model Headers (Sticky) */}
                <div className={`flex border-b ${border} ${headerBg}`}>
                    <div className={`w-48 flex-shrink-0 p-4 font-medium ${textSubtle}`}>
                        {t('comparison.attribute')}
                    </div>
                    {models.map((m, idx) => (
                        <div
                            key={m.id}
                            className={`flex-1 min-w-[180px] p-4 text-center border-l ${border} ${pinnedModel === m.id ? 'bg-accent/10' : ''
                                }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => setPinnedModel(pinnedModel === m.id ? null : m.id)}
                                    className={`p-1 rounded-full transition-colors ${pinnedModel === m.id
                                        ? 'text-amber-400'
                                        : textSubtle + ' hover:text-amber-400'
                                        }`}
                                    title={pinnedModel === m.id ? t('comparison.unpin') : t('comparison.pin')}
                                >
                                    <Star className="w-4 h-4" fill={pinnedModel === m.id ? 'currentColor' : 'none'} />
                                </button>
                                <span className="font-bold text-lg">{m.name}</span>
                                {m.provider && (
                                    <span className={`text-xs ${textSubtle}`}>{m.provider}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="overflow-auto flex-1">
                    {categoryOrder.map(category => {
                        const attrs = groupedAttributes[category];
                        if (attrs.length === 0) return null;
                        const isExpanded = expandedCategories.has(category);

                        return (
                            <div key={category}>
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className={`w-full flex items-center justify-between px-6 py-3 ${categoryBg} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                                >
                                    <span className="font-semibold">{categoryLabels[category]}</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {/* Category Rows */}
                                {isExpanded && attrs.map((attr, attrIdx) => {
                                    const isDifferent = highlightDifferences && valuesDiffer(attr);
                                    const bestId = getBestModelId(attr);

                                    return (
                                        <div
                                            key={attr.label}
                                            className={`flex border-b ${border} ${isDifferent ? highlightBg : ''
                                                } ${attrIdx % 2 === 0 ? '' : theme === 'dark' ? 'bg-zinc-900/30' : 'bg-gray-50/50'}`}
                                        >
                                            <div className={`w-48 flex-shrink-0 p-4 font-medium ${textSubtle} flex items-center gap-2`}>
                                                {attr.label}
                                                {isDifferent && (
                                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                                )}
                                            </div>
                                            {models.map(m => {
                                                const isBest = bestId === m.id;
                                                const isPinned = pinnedModel === m.id;

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={`flex-1 min-w-[180px] p-4 text-center border-l ${border} ${isBest ? bestBg : ''
                                                            } ${isPinned ? 'bg-accent/5' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-center gap-1">
                                                            {attr.render(m)}
                                                            {isBest && (
                                                                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                                                    {t('comparison.best')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Tags Section */}
                    <div>
                        <button
                            onClick={() => toggleCategory('basic')}
                            className={`w-full flex items-center justify-between px-6 py-3 ${categoryBg} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                        >
                            <span className="font-semibold">🏷️ {t('comparison.tags')}</span>
                        </button>
                        <div className={`flex border-b ${border}`}>
                            <div className={`w-48 flex-shrink-0 p-4 font-medium ${textSubtle}`}>
                                {t('comparison.tags')}
                            </div>
                            {models.map(m => (
                                <div key={m.id} className={`flex-1 min-w-[180px] p-4 border-l ${border}`}>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {m.tags && m.tags.length > 0 ? (
                                            m.tags.slice(0, 5).map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={textSubtle}>—</span>
                                        )}
                                        {m.tags && m.tags.length > 5 && (
                                            <span className={`text-xs ${textSubtle}`}>
                                                {t('comparison.moreTags', { count: m.tags.length - 5 })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between px-6 py-3 border-t ${border} ${headerBg}`}>
                    <div className={`text-sm ${textSubtle}`}>
                        <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            {t('comparison.legendDifferences')}
                        </span>
                        <span className="mx-3">•</span>
                        <span className="inline-flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded bg-emerald-500/30"></span>
                            {t('comparison.legendBest')}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                    >
                        {t('comparison.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
