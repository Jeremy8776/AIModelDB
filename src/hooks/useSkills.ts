import { useCallback, useEffect, useRef, useState } from 'react';
import { Skill } from '../types';
import { fetchOfficialPluginsMarketplace } from '../services/api/fetchers/skills/plugins-marketplace';
import { fetchAnthropicSkills } from '../services/api/fetchers/skills/anthropic-skills';
import { fetchCoworkPlugins } from '../services/api/fetchers/skills/cowork-plugins';
import { fetchSkillsFromGitHubTopics } from '../services/api/fetchers/skills/github-skills';
import { SKILL_SOURCES } from '../services/sources/entitySources';
import { useSettings } from '../context/SettingsContext';
import { mergeSkillLists } from '../utils/entityMerge';

const AVAILABLE_SKILL_KEYS = new Set(
    SKILL_SOURCES.filter(source => source.status === 'available').map(source => source.key)
);

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
    const { settings } = useSettings();
    const [skills, setSkillsState] = useState<Skill[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? mergeSkillLists([], parsed as Skill[]) : [];
            }
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
        setSkillsState(prev => mergeSkillLists(prev, incoming));
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

    const syncAll = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        const controller = new AbortController();
        abortRef.current = controller;
        const skillSources = settings.skillSources || {};
        const gitHubToken = settings.gitHubToken || undefined;

        let totalFetched = 0;
        const setSourceProgress = (source: string, page: number) => {
            setSyncProgress({ fetched: totalFetched, page, source });
        };

        const runOfficialMarketplace = async () => {
            setSourceProgress('claude-plugins-official', 0);
            await fetchOfficialPluginsMarketplace({
                abortSignal: controller.signal,
                onPage: (pageSkills, pageIndex) => {
                    totalFetched += pageSkills.length;
                    mergeSkills(pageSkills);
                    setSourceProgress('claude-plugins-official', pageIndex + 1);
                },
            });
        };

        const runAnthropicSkills = async () => {
            setSourceProgress('anthropic-skills', 0);
            await fetchAnthropicSkills({
                abortSignal: controller.signal,
                onPage: (pageSkills, pageIndex) => {
                    totalFetched += pageSkills.length;
                    mergeSkills(pageSkills);
                    setSourceProgress('anthropic-skills', pageIndex + 1);
                },
            });
        };

        const runCoworkPlugins = async () => {
            setSourceProgress('cowork-plugins', 0);
            await fetchCoworkPlugins({
                abortSignal: controller.signal,
                onPage: (pageSkills, pageIndex) => {
                    totalFetched += pageSkills.length;
                    mergeSkills(pageSkills);
                    setSourceProgress('cowork-plugins', pageIndex + 1);
                },
            });
        };

        const runGitHubSkills = async () => {
            setSourceProgress('github-skills', 0);
            const found = await fetchSkillsFromGitHubTopics({
                gitHubToken,
                abortSignal: controller.signal,
            });
            if (found.length > 0) {
                totalFetched += found.length;
                mergeSkills(found);
            }
            setSourceProgress('github-skills', 1);
        };

        const runners: Array<[string, () => Promise<void>]> = [
            ['claude-plugins-official', runOfficialMarketplace],
            ['anthropic-skills', runAnthropicSkills],
            ['cowork-plugins', runCoworkPlugins],
            ['github-skills', runGitHubSkills],
        ];

        const errors: string[] = [];
        try {
            for (const [key, run] of runners) {
                if (controller.signal.aborted) break;
                if (!AVAILABLE_SKILL_KEYS.has(key)) continue;
                if (skillSources[key] === false) continue;
                try {
                    await run();
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`[Skills] Source "${key}" failed:`, message);
                    errors.push(`${key}: ${message}`);
                }
            }
            setMetaState(prev => ({
                ...prev,
                lastSync: new Date().toISOString(),
                lastError: errors.length > 0 ? errors.join(' | ') : null,
            }));
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
            abortRef.current = null;
        }
    }, [isSyncing, mergeSkills, settings.skillSources, settings.gitHubToken]);

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
        syncAll,
        cancelSync,
        toggleFavorite,
        deleteSkill,
        clearAll,
        exportSkills,
        mergeSkills,
    };
}
