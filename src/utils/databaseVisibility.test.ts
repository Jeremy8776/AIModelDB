import { describe, expect, it } from 'vitest';
import { shouldShowDatabaseWelcome } from './databaseVisibility';

describe('shouldShowDatabaseWelcome', () => {
    it('shows the welcome when every database collection is empty', () => {
        expect(shouldShowDatabaseWelcome({ models: 0, mcp: 0, skills: 0 }, false)).toBe(true);
    });

    it('does not show the welcome while a sync is running', () => {
        expect(shouldShowDatabaseWelcome({ models: 0, mcp: 0, skills: 0 }, true)).toBe(false);
    });

    it('does not show the welcome when any section has records', () => {
        expect(shouldShowDatabaseWelcome({ models: 1, mcp: 0, skills: 0 }, false)).toBe(false);
        expect(shouldShowDatabaseWelcome({ models: 0, mcp: 1, skills: 0 }, false)).toBe(false);
        expect(shouldShowDatabaseWelcome({ models: 0, mcp: 0, skills: 1 }, false)).toBe(false);
    });
});
