import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AiOutlineCheckCircle,
    AiOutlineCloseCircle,
    AiOutlineDollar,
} from 'react-icons/ai';
import { Modal } from './ui';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import {
    formatReleaseDate,
    getPricingType,
    isSubscriptionPricing,
    formatEnterprisePricing,
    toPerMillion,
} from '../utils/pricing';
import {
    detectCurrency,
    convertCurrency,
} from '../utils/currency';
import { formatCurrency } from '../utils/currency';
import { kfmt } from '../utils/format';

export function ModelComparison({
    models,
    onClose,
}: {
    models: Model[];
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const [activeTab, setActiveTab] = useState('overview');

    const categories = [
        { id: 'overview', label: t('comparison.tabs.overview') },
        { id: 'capabilities', label: t('comparison.tabs.capabilities') },
        { id: 'technical', label: t('comparison.tabs.technical') },
        { id: 'pricing', label: t('comparison.tabs.pricing') },
    ];

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`grid gap-8 ${models.length === 1 ? 'max-w-xl mx-auto grid-cols-1' :
                models.length === 2 ? 'max-w-7xl mx-auto grid-cols-1 md:grid-cols-2' :
                    models.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {models.map((model) => (
                    <div
                        key={model.id}
                        className="group relative flex flex-col p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-accent transition-all duration-500 shadow-sm hover:shadow-2xl overflow-hidden"
                    >
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="min-h-[5rem] flex items-center justify-center mb-3">
                                <h3 className="text-3xl font-black group-hover:text-accent transition-colors tracking-tight leading-[1.1] line-clamp-2">
                                    {model.name.replace(/^[^/]+\//, '')}
                                </h3>
                            </div>
                            <div className="h-10 flex items-center justify-center">
                                <span className="px-3 py-1 bg-secondary/50 rounded-lg text-xs font-black uppercase tracking-widest text-text-secondary border border-border/50">
                                    {model.provider}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20 border border-border/30 group-hover:bg-accent/5 group-hover:border-accent/20 transition-colors">
                                <span className="text-[10px] uppercase tracking-widest font-black text-text-secondary mb-1">
                                    {t('comparison.technical.parameters')}
                                </span>
                                <span className="text-xl font-mono font-black text-accent">
                                    {model.parameters || '—'}
                                </span>
                            </div>
                            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20 border border-border/30 group-hover:bg-accent/5 group-hover:border-accent/20 transition-colors">
                                <span className="text-[10px] uppercase tracking-widest font-black text-text-secondary mb-1">
                                    {t('comparison.technical.context')}
                                </span>
                                <span className="text-xl font-mono font-black text-accent">
                                    {model.context_window || '—'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            {model.hosting.weights_available && (
                                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-wider border border-green-500/20">
                                    {t('comparison.capabilities.weights')}
                                </span>
                            )}
                            {model.hosting.api_available && (
                                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                    {t('comparison.capabilities.api')}
                                </span>
                            )}
                        </div>

                        {model.description && (
                            <p className="text-sm text-text-secondary text-center line-clamp-3 mb-8 italic opacity-80 leading-relaxed px-2">
                                {model.description}
                            </p>
                        )}

                        <div className="space-y-4 mt-auto pt-6 border-t border-border/50 text-center">
                            <div className="flex justify-between items-center px-4">
                                <span className="text-text-secondary uppercase tracking-widest text-[10px] font-bold">{t('comparison.downloads')}</span>
                                <span className="font-mono font-black text-lg">{kfmt(model.downloads || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4">
                                <span className="text-text-secondary uppercase tracking-widest text-[10px] font-bold">{t('comparison.license')}</span>
                                <span className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-[11px] font-black uppercase tracking-tight">
                                    {model.license?.name || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCapabilities = () => (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-secondary/30">
                        <th className="p-6 border-b border-border font-bold text-sm uppercase tracking-wider text-text-secondary text-center">
                            {t('comparison.capability')}
                        </th>
                        {models.map((m) => (
                            <th
                                key={m.id}
                                className="p-6 border-b border-border font-bold text-center"
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-lg">{m.name.replace(/^[^/]+\//, '')}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[
                        { label: t('comparison.capabilities.weights'), key: 'weights_available' },
                        { label: t('comparison.capabilities.api'), key: 'api_available' },
                        { label: t('comparison.capabilities.on_prem'), key: 'on_premise_friendly' },
                    ].map((cap, idx) => (
                        <tr
                            key={cap.key}
                            className={`hover:bg-accent/5 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-secondary/10'
                                }`}
                        >
                            <td className="p-6 border-b border-border font-medium text-center">
                                {cap.label}
                            </td>
                            {models.map((m) => {
                                const available = (m.hosting as any)?.[cap.key];
                                return (
                                    <td
                                        key={m.id}
                                        className="p-6 border-b border-border text-center"
                                    >
                                        <div className="flex justify-center">
                                            {available ? (
                                                <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                                                    <AiOutlineCheckCircle size={24} />
                                                </div>
                                            ) : (
                                                <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                                    <AiOutlineCloseCircle size={24} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderTechnical = () => (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-secondary/30">
                        <th className="p-6 border-b border-border font-bold text-sm uppercase tracking-wider text-text-secondary w-1/4 text-center">
                            {t('comparison.specification')}
                        </th>
                        {models.map((m) => (
                            <th
                                key={m.id}
                                className="p-6 border-b border-border font-bold text-center"
                            >
                                <span className="text-lg">{m.name.replace(/^[^/]+\//, '')}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[
                        { label: t('comparison.technical.parameters'), key: 'parameters' },
                        { label: t('comparison.technical.context'), key: 'context_window' },
                        { label: t('comparison.technical.domain'), key: 'domain' },
                    ].map((tech, idx) => (
                        <tr
                            key={tech.key}
                            className={`hover:bg-accent/5 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-secondary/10'
                                }`}
                        >
                            <td className="p-6 border-b border-border font-medium text-center">
                                {tech.label}
                            </td>
                            {models.map((m) => (
                                <td
                                    key={m.id}
                                    className="p-6 border-b border-border text-center font-mono text-base"
                                >
                                    {(m as any)[tech.key] || 'N/A'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderPricing = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`grid gap-8 ${models.length === 1 ? 'max-w-xl mx-auto grid-cols-1' :
                models.length === 2 ? 'max-w-7xl mx-auto grid-cols-1 md:grid-cols-2' :
                    models.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {models.map((model) => {
                    const pricing = model.pricing?.[0] || {};
                    const targetCurrency = settings.currency;
                    const sourceCurrency = detectCurrency(pricing);

                    let priceDisplay = '—';
                    try {
                        if (pricing.input != null && pricing.output != null) {
                            const inputPerM = toPerMillion(Number(pricing.input), pricing.unit);
                            const outputPerM = toPerMillion(Number(pricing.output), pricing.unit);
                            const inputConverted = convertCurrency(inputPerM, sourceCurrency, targetCurrency);
                            const outputConverted = convertCurrency(outputPerM, sourceCurrency, targetCurrency);
                            priceDisplay = formatEnterprisePricing(inputConverted, outputConverted, targetCurrency);
                        } else if (pricing.flat != null) {
                            const amount = isSubscriptionPricing(pricing) ? Number(pricing.flat) : toPerMillion(Number(pricing.flat), pricing.unit);
                            const converted = convertCurrency(amount, sourceCurrency, targetCurrency);
                            priceDisplay = formatCurrency(converted, targetCurrency) + (isSubscriptionPricing(pricing) ? ` ${pricing.unit || ''}` : '');
                        }
                    } catch (e) {
                        console.error('Error calculating price for comparison:', e);
                    }

                    return (
                        <div
                            key={model.id}
                            className="p-8 rounded-2xl border border-border bg-card relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <AiOutlineDollar size={100} />
                            </div>

                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="min-h-[5rem] flex items-center justify-center mb-3">
                                    <h4 className="text-3xl font-black group-hover:text-accent transition-colors tracking-tight leading-[1.1] line-clamp-2">
                                        {model.name.replace(/^[^/]+\//, '')}
                                    </h4>
                                </div>
                                <div className="h-10 flex items-center justify-center">
                                    <span className="px-3 py-1 bg-secondary/50 rounded-lg text-xs font-black uppercase tracking-widest text-text-secondary border border-border/50">
                                        {model.provider}
                                    </span>
                                </div>
                            </div>

                            <div className="py-8 px-6 rounded-2xl bg-secondary/30 mb-8 border border-border/50 text-center">
                                <div className="text-xs text-text-secondary uppercase tracking-wider mb-3">{t('comparison.estimated_cost')}</div>
                                <div className="text-4xl font-bold font-mono tracking-tighter text-accent">
                                    {priceDisplay}
                                </div>
                            </div>

                            <div className="space-y-4 text-center">
                                <div className="flex flex-col items-center text-xs">
                                    <span className="text-text-secondary uppercase tracking-wider mb-2 font-medium">{t('comparison.currency')}</span>
                                    <span className="font-bold text-base bg-accent/10 text-accent px-3 py-1 rounded-lg">{settings.currency}</span>
                                </div>
                                <div className="flex flex-col items-center text-xs">
                                    <span className="text-text-secondary uppercase tracking-wider mb-2 font-medium">{t('comparison.license_type')}</span>
                                    <span className="font-bold text-base">{model.license?.type || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={t('comparison.title')}
            size="7xl"
            className="max-h-[90vh] flex flex-col"
        >
            <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                <div className="flex items-center justify-between gap-6 border-b border-border pb-6">
                    <div className="flex p-2 bg-secondary/50 rounded-2xl shadow-inner">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === cat.id
                                    ? 'bg-card text-accent shadow-xl ring-1 ring-border scale-105'
                                    : 'text-text-secondary hover:text-text hover:bg-card/50'
                                    }`}
                            >
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="text-sm font-bold text-accent bg-accent/10 px-6 py-2 rounded-full border border-accent/20 shadow-sm animate-in fade-in zoom-in duration-500">
                        {t('comparison.comparing_count', { count: models.length })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                    <div className="p-2">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'capabilities' && renderCapabilities()}
                        {activeTab === 'technical' && renderTechnical()}
                        {activeTab === 'pricing' && renderPricing()}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
