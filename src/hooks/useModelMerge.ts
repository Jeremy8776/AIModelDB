import { useState, useEffect, useRef, useCallback } from 'react';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { mapDomain, cleanModelDescription } from '../utils/format';

export function useModelMerge(
    models: Model[],
    setModels: React.Dispatch<React.SetStateAction<Model[]>>
) {
    const { settings } = useSettings();
    const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number } | null>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        try {
            // Initialize the worker
            workerRef.current = new Worker(new URL('../workers/modelProcessor.worker.ts', import.meta.url), { type: 'module' });

            // Set up listener for worker responses
            workerRef.current.onmessage = (event) => {
                const { type, payload, error } = event.data;
                if (type === 'MERGE_COMPLETE') {
                    const { models: newModels, added, updated } = payload;
                    setModels(newModels);
                    setLastMergeStats({ added, updated });
                } else if (type === 'ERROR') {
                    console.error('Worker error:', error);
                }
            };

            return () => {
                workerRef.current?.terminate();
                workerRef.current = null;
            };
        } catch (error) {
            console.error("Failed to initialize model processor worker:", error);
        }
    }, [setModels]);

    const mergeInModels = useCallback((incomingList: Model[]) => {
        if (!incomingList || incomingList.length === 0) return;

        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'MERGE_MODELS',
                payload: {
                    currentModels: models,
                    newModels: incomingList,
                    autoMergeDuplicates: settings.autoMergeDuplicates ?? false
                }
            });
        } else {
            console.warn('Worker not ready, falling back to main thread (or skipping)');
        }
    }, [models, settings.autoMergeDuplicates]);

    const importModels = useCallback((newModels: Model[]) => {
        const toNormalized = (m: any, idx: number): Model => {
            const toStringLower = (x: any) => String(x || '').toLowerCase();
            const parseYesNo = (x: any): boolean | undefined => {
                const s = toStringLower(x);
                if (!s) return undefined;
                if (/(^|\b)(yes|true|allowed|y)$/.test(s)) return true;
                if (/(^|\b)(no|false|not allowed|disallow|non-?commercial|nc)$/.test(s)) return false;
                return undefined;
            };
            const mapLicenseType = (name?: string | null): any => {
                const s = toStringLower(name);
                if (!s) return 'Custom';
                if (/(gpl|agpl|lgpl)/.test(s)) return 'Copyleft';
                if (/(apache|mit|bsd|mpl)/.test(s)) return 'OSI';
                if (/(non\s*-?commercial|nc)/.test(s)) return 'Non-Commercial';
                if (/proprietary/.test(s)) return 'Proprietary';
                return 'Custom';
            };
            const parsePricing = (raw: any): any[] | undefined => {
                const s = String(raw || '').trim();
                if (!s) return undefined;
                if (/^free(\b|\s|\()/i.test(s)) {
                    return [{ model: 'Usage', unit: 'usage', flat: 0, currency: 'USD', notes: s }];
                }
                const m1 = s.match(/\$([0-9]+(?:\.[0-9]+)?)\s*per\s*([a-zA-Z\- ]+)/i);
                if (m1) {
                    return [{ model: 'Usage', unit: m1[2].trim().toLowerCase(), input: Number(m1[1]), currency: 'USD' }];
                }
                return [{ model: 'Usage', unit: 'usage', notes: s }];
            };

            const parseExcelDate = (v: any): string | null => {
                if (v == null || v === '') return null;
                if (typeof v === 'number' && v > 30000 && v < 100000) {
                    const epoch = new Date(Date.UTC(1899, 11, 30));
                    const dt = new Date(epoch.getTime() + v * 86400000);
                    return dt.toISOString().slice(0, 10);
                }
                const str = String(v).trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                const d = new Date(str);
                if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
                return null;
            };
            const id = String(m.id || m.uniqueId || `${m.source || 'import'}-${m['Model Name'] || m.name || m.model || idx}`);
            const name = String(m.name || m.model || m['Model Name'] || m['Model'] || id);
            const sheet = (m.__sheetName ? String(m.__sheetName) : undefined);
            const domain = mapDomain(m.domain || m['Model Type'] || m.Type, sheet) as any;
            const source = m.source || 'Import';
            const url = m.url || m.homepage || null;
            const repo = m.repo || null;
            const licenseName = m.license_name || m.license || 'Unknown';
            const commercialParsed = parseYesNo(m.commercial);
            const license: any = {
                name: String(licenseName),
                type: mapLicenseType(licenseName),
                commercial_use: commercialParsed ?? true,
                attribution_required: Boolean(m.attribution_required ?? false),
                share_alike: Boolean(m.share_alike ?? false),
                copyleft: Boolean(m.copyleft ?? false)
            };
            const hosting: any = {
                weights_available: Boolean(m.weights_available ?? true),
                api_available: Boolean(m.api_available ?? true),
                on_premise_friendly: Boolean(m.on_premise_friendly ?? true)
            };
            const tags = Array.isArray(m.tags) ? m.tags.map((t: any) => String(t)) : (typeof m.tags === 'string' ? m.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
            const parameters = (m.parameters || m.Params || m.Size) ? String(m.parameters || m.Params || m.Size) : null;
            const context_window = (m.context_window || m['Context Window']) ? String(m.context_window || m['Context Window']) : null;
            const rel = parseExcelDate(m.release_date || m.Released || m['Release Date'] || m.Date);
            const updated = parseExcelDate(m.updated_at || m.Updated);
            const priceRaw = m.pricing || m.price || m.Pricing || m.Cost;
            const pricing = Array.isArray(m.pricing) ? m.pricing : (priceRaw ? parsePricing(priceRaw) : undefined);
            const modelOut: Model = { id, name, provider: m.provider || null, domain, source, url, repo, license, hosting, tags, parameters, context_window } as Model;
            if (rel) (modelOut as any).release_date = String(rel);
            if (updated) (modelOut as any).updated_at = String(updated);
            if (pricing) (modelOut as any).pricing = pricing as any;
            if (m.description) (modelOut as any).description = cleanModelDescription(m.description);

            return modelOut;
        };

        const normalized: Model[] = (newModels || []).map((m: any, idx: number) => toNormalized(m, idx));

        // Send to worker for merging
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'MERGE_MODELS',
                payload: {
                    currentModels: models,
                    newModels: normalized,
                    autoMergeDuplicates: settings.autoMergeDuplicates ?? false
                }
            });
        }
    }, [models, settings.autoMergeDuplicates]);

    return {
        importModels,
        mergeInModels,
        lastMergeStats,
        setLastMergeStats
    };
}
