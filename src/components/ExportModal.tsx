import React, { useState, useEffect } from 'react';
import { X, Download, FileJson, FileSpreadsheet, FileText, Database, FileCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeContext from '../context/ThemeContext';
import { ExportFormat } from '../services/exportService';
import { RoundCheckbox } from './RoundCheckbox';
import { FilterOptions } from '../utils/filterLogic';
import { ThemedSelect } from './ThemedSelect';
import { DOMAINS } from '../types';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: ExportFormat, scope: 'all' | 'custom', criteria?: Partial<FilterOptions>) => void;
    totalModels: number;
    // Current filters to initialize 'Custom' state
    currentFilters: Partial<FilterOptions>;
    theme: 'light' | 'dark';
}

type ExportScope = 'all' | 'custom';

export function ExportModal({
    isOpen,
    onClose,
    onExport,
    totalModels,
    currentFilters,
    theme
}: ExportModalProps) {
    const { t } = useTranslation();
    const [scope, setScope] = useState<ExportScope>('custom');
    const [format, setFormat] = useState<ExportFormat>('json');

    // Custom Filters State
    const [customFilters, setCustomFilters] = useState<Partial<FilterOptions>>({
        domainPick: 'All',
        favoritesOnly: false,
        minDownloads: 0,
        licenseTypes: [],
        commercialAllowed: null,
        includeTags: [],
        excludeTags: []
    });

    // Initialize custom filters with current filters when modal opens
    useEffect(() => {
        if (isOpen) {
            setCustomFilters(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const updateCustomFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
        setCustomFilters(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    const bgCard = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
    const textPrimary = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
    const textSecondary = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
    const itemHover = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';
    const itemActive = theme === 'dark' ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'bg-zinc-50 ring-1 ring-zinc-200';

    const formats: { id: ExportFormat; label: string; icon: React.ElementType; desc: string }[] = [
        { id: 'json', label: 'JSON', icon: FileJson, desc: 'Full data structure' },
        { id: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'Excel compatible' },
        { id: 'tsv', label: 'TSV', icon: FileText, desc: 'Tab separated' },
        { id: 'yaml', label: 'YAML', icon: Database, desc: 'Human readable data' },
        { id: 'xml', label: 'XML', icon: FileCode, desc: 'Structured markup' },
        { id: 'md', label: 'Markdown', icon: FileText, desc: 'Table format' },
    ];

    const handleExport = () => {
        if (scope === 'custom') {
            onExport(format, 'custom', customFilters);
        } else {
            onExport(format, scope);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl rounded-2xl border shadow-xl ${bgCard} flex flex-col max-h-[90vh] overflow-hidden`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>{t('export.title')}</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Scope & Format */}
                    <div className={`w-1/2 p-6 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 space-y-6`}>
                        {/* Scope Selection */}
                        <section>
                            <h3 className={`text-sm font-medium mb-3 ${textPrimary}`}>1. {t('export.scope')}</h3>
                            <div className="space-y-2">


                                <label
                                    className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${scope === 'all' ? `border-violet-500 ${itemActive}` : `border-transparent ${bgCard} border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600`}`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scope === 'all' ? 'border-violet-500' : 'border-zinc-400'}`}>
                                        {scope === 'all' && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                                    </div>
                                    <div>
                                        <div className={`font-medium ${textPrimary}`}>{t('export.entireDatabase')}</div>
                                        <div className={`text-xs ${textSecondary}`}>{totalModels.toLocaleString()} {t('toolbar.models')}</div>
                                    </div>
                                    <input type="radio" name="scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} className="hidden" />
                                </label>

                                <label
                                    className={`cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all ${scope === 'custom' ? `border-violet-500 ${itemActive}` : `border-transparent ${bgCard} border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600`}`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scope === 'custom' ? 'border-violet-500' : 'border-zinc-400'}`}>
                                        {scope === 'custom' && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                                    </div>
                                    <div>
                                        <div className={`font-medium ${textPrimary}`}>{t('export.customFilter')}</div>
                                        <div className={`text-xs ${textSecondary}`}>{t('export.customFilterDesc')}</div>
                                    </div>
                                    <input type="radio" name="scope" value="custom" checked={scope === 'custom'} onChange={() => setScope('custom')} className="hidden" />
                                </label>
                            </div>
                        </section>

                        {/* Format Selection */}
                        <section>
                            <h3 className={`text-sm font-medium mb-3 ${textPrimary}`}>2. {t('export.format')}</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {formats.map((fmt) => (
                                    <button
                                        key={fmt.id}
                                        onClick={() => setFormat(fmt.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${format === fmt.id
                                            ? `border-violet-500 ${itemActive}`
                                            : `border-transparent border-zinc-200 dark:border-zinc-800 ${itemHover}`
                                            }`}
                                    >
                                        <fmt.icon size={18} className={format === fmt.id ? 'text-violet-500' : textSecondary} />
                                        <div>
                                            <div className={`text-sm font-medium ${textPrimary}`}>{fmt.label}</div>
                                            <div className={`text-[10px] ${textSecondary}`}>{fmt.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Custom Filters (Only if Custom Scope selected) */}
                    <div className={`w-1/2 p-6 overflow-y-auto ${scope !== 'custom' ? 'opacity-50 pointer-events-none grayscale' : ''} transition-all`}>
                        <h3 className={`text-sm font-medium mb-4 ${textPrimary}`}>3. {t('filters.title')}</h3>

                        <div className="space-y-4">
                            {/* Domain */}
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{t('filters.domain')}</label>
                                <ThemedSelect
                                    value={customFilters.domainPick as any || 'All'}
                                    onChange={(v) => updateCustomFilter('domainPick', v as any)}
                                    options={DOMAINS as any}
                                />
                            </div>

                            {/* Favorites */}
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer select-none group">
                                    <RoundCheckbox
                                        checked={customFilters.favoritesOnly || false}
                                        onChange={(checked) => updateCustomFilter('favoritesOnly', checked)}
                                    />
                                    <span className={`text-sm font-medium ${textPrimary}`}>{t('filters.favoritesOnly')}</span>
                                </label>
                            </div>

                            {/* Min Downloads */}
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{t('filters.minDownloads')}: {customFilters.minDownloads}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10000"
                                    step="1000"
                                    value={customFilters.minDownloads || 0}
                                    onChange={(e) => updateCustomFilter('minDownloads', parseInt(e.target.value))}
                                    className="w-full accent-violet-500"
                                />
                            </div>

                            {/* License Type */}
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{t('filters.licenseType')}</label>
                                <ThemedSelect
                                    value={customFilters.licenseTypes && customFilters.licenseTypes.length === 1 ? customFilters.licenseTypes[0] : ""}
                                    onChange={(v) => updateCustomFilter('licenseTypes', v ? [v as any] : [])}
                                    options={[
                                        { value: "", label: t('filters.allLicenses') },
                                        { value: "OSI", label: t('licenses.OSI') },
                                        t('licenses.Copyleft'),
                                        t('licenses.Non-Commercial'),
                                        t('licenses.Proprietary'),
                                        t('licenses.Custom')
                                    ]}
                                />
                            </div>

                            {/* Commercial Use */}
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>{t('filters.commercialUse')}</label>
                                <ThemedSelect
                                    value={customFilters.commercialAllowed === null ? "" : String(customFilters.commercialAllowed)}
                                    onChange={(v) => updateCustomFilter('commercialAllowed', v === "" ? null : v === "true")}
                                    options={[
                                        { value: "", label: t('common.all') },
                                        { value: "true", label: t('filters.allowed') },
                                        { value: "false", label: t('filters.notAllowed') }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-6 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
                    >
                        <Download size={16} />
                        {t('export.exportButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
