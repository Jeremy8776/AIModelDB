/**
 * Migration Utility
 * 
 * Handles one-time migration from old localStorage key prefix (aiModelDBPro_)
 * to new prefix (aiModelDB_) to preserve user data during rebranding.
 */

const OLD_PREFIX = 'aiModelDBPro_';
const NEW_PREFIX = 'aiModelDB_';
const MIGRATION_FLAG = 'aiModelDB_migrated';

/**
 * One-time migration from aiModelDBPro_* to aiModelDB_* keys
 * Preserves all user data during the rebranding from "AI Model DB Pro" to "AI Model DB"
 */
export function migrateLocalStorageKeys(): void {
    // Check if migration already done
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
        return;
    }

    console.log('[Migration] Starting localStorage key migration...');

    // Static key mappings for known keys
    const keyMappings = [
        ['aiModelDBPro_models', 'aiModelDB_models'],
        ['aiModelDBPro_settings', 'aiModelDB_settings'],
        ['aiModelDBPro_lastSync', 'aiModelDB_lastSync'],
        ['aiModelDBPro_apiConfig', 'aiModelDB_apiConfig'],
        ['aiModelDBPro_theme', 'aiModelDB_theme'],
        ['aiModelDBPro_customCss', 'aiModelDB_customCss'],
        ['aiModelDBPro_customColors', 'aiModelDB_customColors'],
        ['aiModelDBPro_savedPresets', 'aiModelDB_savedPresets'],
        ['aiModelDBPro_activePresetId', 'aiModelDB_activePresetId'],
        ['aiModelDBPro_language', 'aiModelDB_language'],
        ['aiModelDBPro_history_index', 'aiModelDB_history_index'],
    ];

    let migratedCount = 0;

    // Migrate static keys
    for (const [oldKey, newKey] of keyMappings) {
        const value = localStorage.getItem(oldKey);
        if (value && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
            migratedCount++;
        }
    }

    // Migrate dynamic history keys (aiModelDBPro_history_*)
    const keysToMigrate: [string, string][] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(OLD_PREFIX) && !keyMappings.some(([k]) => k === key)) {
            const newKey = key.replace(OLD_PREFIX, NEW_PREFIX);
            keysToMigrate.push([key, newKey]);
        }
    }

    for (const [oldKey, newKey] of keysToMigrate) {
        const value = localStorage.getItem(oldKey);
        if (value && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, value);
            localStorage.removeItem(oldKey);
            migratedCount++;
        }
    }

    // Mark migration as complete
    localStorage.setItem(MIGRATION_FLAG, 'true');

    if (migratedCount > 0) {
        console.log(`[Migration] Successfully migrated ${migratedCount} keys from old prefix to new prefix`);
    } else {
        console.log('[Migration] No keys to migrate (fresh install or already migrated)');
    }
}
