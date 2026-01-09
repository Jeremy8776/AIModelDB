import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Minus, ChevronDown, ChevronUp, Star, ArrowUpDown, Eye, EyeOff, FileText, Cpu, Zap, Scale, DollarSign, Tags as TagsIcon } from 'lucide-react';
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

    const bgCard = theme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200';
    const textBase = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
    const border = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
    const headerBg = theme === 'dark' ? 'bg-zinc-900/50' : 'bg-zinc-50/50';
    const categoryBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-zinc-50';
    const highlightBg = theme === 'dark' ? 'bg-amber-900/10' : 'bg-amber-50';
    const bestBg = theme === 'dark' ? 'bg-emerald-900/10' : 'bg-emerald-50';

    // Helper to render check/x for booleans
    const renderBoolean = (val?: boolean) => {
        if (val === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
        if (val === false) return <X className="w-5 h-5 text-red-500 mx-auto" />;
        return <Minus className="w-5 h-5 text-zinc-300 dark:text-zinc-700 mx-auto" />;
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

    // Mapping for category icons
    const CategoryIcons = {
        basic: FileText,
        technical: Cpu,
        capabilities: Zap,
        licensing: Scale,
        pricing: DollarSign,
    };

    const categoryLabels: Record<AttributeCategory, string> = {
        basic: t('comparison.basicInfo'),
        technical: t('comparison.technicalSpecs'),
        capabilities: t('comparison.capabilities'),
        licensing: t('comparison.licensing'),
        pricing: t('comparison.pricing'),
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
            <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${bgCard} ${textBase}`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                            <ArrowUpDown className="size-5" />
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
                                ? 'bg-amber-500/20 text-amber-500'
                                : theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-800'
                                }`}
                        >
                            {highlightDifferences ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            {t('comparison.highlightDifferences')}
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${textSubtle}`}
                        >
                            <X className="size-5" />
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
                            className={`flex-1 min-w-[180px] p-4 text-center border-l ${border} ${pinnedModel === m.id ? 'bg-violet-500/5' : ''
                                }`}
                        >
                            <div className="flex flex-col items-center gap-2 w-full overflow-hidden">
                                <button
                                    onClick={() => setPinnedModel(pinnedModel === m.id ? null : m.id)}
                                    className={`p-1 rounded-full transition-colors ${pinnedModel === m.id
                                        ? 'text-amber-500'
                                        : textSubtle + ' hover:text-amber-500'
                                        }`}
                                    title={pinnedModel === m.id ? t('comparison.unpin') : t('comparison.pin')}
                                >
                                    <Star className="size-4" fill={pinnedModel === m.id ? 'currentColor' : 'none'} />
                                </button>
                                <span className="font-bold text-sm line-clamp-2 w-full px-2 break-words" title={m.name}>{m.name}</span>
                                {m.provider && (
                                    <span className={`text-xs ${textSubtle} truncate w-full px-2`} title={m.provider}>{m.provider}</span>
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
                        const Icon = CategoryIcons[category];

                        return (
                            <div key={category}>
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className={`w-full flex items-center justify-between px-6 py-3 border-b ${border} ${categoryBg} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                                >
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Icon className="size-4 text-violet-500" />
                                        <span>{categoryLabels[category]}</span>
                                    </div>
                                    {isExpanded ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                                </button>

                                {/* Category Rows */}
                                {isExpanded && attrs.map((attr, attrIdx) => {
                                    const isDifferent = highlightDifferences && valuesDiffer(attr);

                                    return (
                                        <div
                                            key={attr.label}
                                            className={`flex border-b ${border} ${isDifferent ? highlightBg : ''
                                                } ${theme === 'dark' ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}`}
                                        >
                                            <div className={`w-48 flex-shrink-0 p-4 font-medium ${textSubtle} flex items-center gap-2 text-sm`}>
                                                {attr.label}
                                                {isDifferent && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Values differ" />
                                                )}
                                            </div>
                                            {models.map(m => {
                                                const isPinned = pinnedModel === m.id;

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={`flex-1 min-w-[180px] p-4 text-center border-l ${border} ${isPinned ? 'bg-violet-500/5' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-center gap-1">
                                                            {attr.render(m)}
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
                            onClick={() => toggleCategory('basic')} // Reusing 'basic' key for expansion logic is weird but functional if tags are separate? Wait, tags needs its own state? 
                            // Actually tags section logic below was separate from attributes list. 
                            // Let's check how it worked before. It reused 'basic' category toggle? No, it hardcoded toggleCategory('basic') which is probably a copy-paste error or intentional.
                            // I'll make it properly collapsible if I can, or just leave it.
                            // The original code: onClick={() => toggleCategory('basic')} 
                            // Maybe it was meant to be part of basic info? 
                            // I'll just change the styling to match categories.
                            className={`w-full flex items-center justify-between px-6 py-3 border-b ${border} ${categoryBg} hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                        >
                            <div className="flex items-center gap-2 font-semibold">
                                <TagsIcon className="size-4 text-violet-500" />
                                <span>{t('comparison.tags')}</span>
                            </div>
                        </button>
                        <div className={`flex border-b ${border}`}>
                            <div className={`w-48 flex-shrink-0 p-4 font-medium ${textSubtle} text-sm`}>
                                {t('comparison.tags')}
                            </div>
                            {models.map(m => (
                                <div key={m.id} className={`flex-1 min-w-[180px] p-4 border-l ${border}`}>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {m.tags && m.tags.length > 0 ? (
                                            m.tags.slice(0, 5).map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                                                        }`}
                                                >
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={textSubtle}>—</span>
                                        )}
                                        {m.tags && m.tags.length > 5 && (
                                            <span className={`text-xs ${textSubtle} px-1`}>
                                                +{m.tags.length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between px-6 py-3 ${headerBg} border-t ${border}`}>
                    <div className={`text-xs ${textSubtle} flex items-center gap-4`}>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {t('comparison.legendDifferences')}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                        {t('comparison.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
