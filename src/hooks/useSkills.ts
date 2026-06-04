import { useCallback, useEffect, useRef, useState } from 'react';
import { Skill } from '../types';
import { fetchOfficialPluginsMarketplace } from '../services/api/fetchers/skills/plugins-marketplace';

const STORAGE_KEY = 'aiModelDB_skills';
const META_KEY = 'aiModelDB_skillsMeta';

interface SkillsMeta {
    lastSync: string | null;
    lastError?: string | null;
}

interface SyncProgress {
    fetched: number;
    page: number;
    source: string;
}

/**
 * Per-tab controller for the Skills entity. Mirrors useMCPServers exactly —
 * separate localStorage keys (aiModelDB_skills / aiModelDB_skillsMeta),
 * user-edit/favorite protection on merge, abortable streaming sync.
 */
export function useSkills() {
    const [skills, setSkillsState] = useState<Skill[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw) as Skill[];
        } catch { /* corrupt blob — start empty */ }
        return [];
    });

    const [meta, setMetaState] = useState<SkillsMeta>(() => {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (raw) return JSON.parse(raw) as SkillsMeta;
        } catch { /* fall through */ }
        return { lastSync: null };
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(skills)); }
        catch { /* quota or disabled — non-fatal */ }
    }, [skills]);

    useEffect(() => {
        try { localStorage.setItem(META_KEY, JSON.stringify(meta)); }
        catch { /* non-fatal */ }
    }, [meta]);

    /** Merge incoming skills by id; preserve user edits + favorites. */
    const mergeSkills = useCallback((incoming: Skill[]) => {
        setSkillsState(prev => {
            const byId = new Map<string, Skill>();
            prev.forEach(s => byId.set(s.id, s));
            for (const inc of incoming) {
                const existing = byId.get(inc.id);
                if (!existing) { byId.set(inc.id, inc); continue; }
                const edited = new Set(existing.editedFields || []);
                const merged: Skill = {
                    ...inc,
                    isFavorite: existing.isFavorite ?? inc.isFavorite,
                    editedFields: existing.editedFields,
                };
                for (const field of edited) {
                    (merged as unknown as Record<string, unknown>)[field] =
                        (existing as unknown as Record<string, unknown>)[field];
                }
                const sources = new Set<string>();
                existing.source.split(',').forEach(s => sources.add(s.trim()));
                inc.source.split(',').forEach(s => sources.add(s.trim()));
                merged.source = Array.from(sources).sort().join(', ');
                byId.set(inc.id, merged);
            }
            return Array.from(byId.values());
        });
    }, []);

    /** Pull from the official Claude plugins marketplace. */
    const syncOfficialMarketplace = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncProgress({ fetched: 0, page: 0, source: 'claude-plugins-official' });

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            let fetchedTotal = 0;
            await fetchOfficialPluginsMarketplace({
                abortSignal: controller.signal,
                onPage: (pageSkills, pageIndex) => {
                    fetchedTotal += pageSkills.length;
                    mergeSkills(pageSkills);
                    setSyncProgress({ fetched: fetchedTotal, page: pageIndex + 1, source: 'claude-plugins-official' });
                },
            });
            setMetaState({ lastSync: new Date().toISOString(), lastError: null });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[Skills] Sync error:', message);
            setMetaState(prev => ({ ...prev, lastError: message }));
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
            abortRef.current = null;
        }
    }, [isSyncing, mergeSkills]);

    const cancelSync = useCallback(() => {
        if (abortRef.current) abortRef.current.abort();
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        setSkillsState(prev => prev.map(s => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)));
    }, []);

    const deleteSkill = useCallback((id: string) => {
        setSkillsState(prev => prev.filter(s => s.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setSkillsState([]);
        setMetaState({ lastSync: null });
    }, []);

    const exportSkills = useCallback(() => {
        try {
            const blob = new Blob([JSON.stringify(skills, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `skills-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[Skills] Export failed:', e);
        }
    }, [skills]);

    return {
        skills,
        meta,
        isSyncing,
        syncProgress,
        syncOfficialMarketplace,
        cancelSync,
        toggleFavorite,
        deleteSkill,
        clearAll,
        exportSkills,
        mergeSkills,
    };
}
