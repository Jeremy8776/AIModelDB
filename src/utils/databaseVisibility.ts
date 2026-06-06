export interface DatabaseCounts {
    models: number;
    mcp: number;
    skills: number;
}

export function isDatabaseEmpty(counts: DatabaseCounts): boolean {
    return counts.models === 0 && counts.mcp === 0 && counts.skills === 0;
}

export function shouldShowDatabaseWelcome(counts: DatabaseCounts, isSyncing: boolean): boolean {
    return isDatabaseEmpty(counts) && !isSyncing;
}
