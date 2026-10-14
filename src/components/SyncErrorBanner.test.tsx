import { describe, expect, it } from 'vitest';
import { describeSyncError, splitSyncErrors } from './SyncErrorBanner';

describe('splitSyncErrors', () => {
    it('splits the separators both hooks use', () => {
        expect(splitSyncErrors('npm: a \u00b7 pypi: b')).toEqual(['npm: a', 'pypi: b']);
        expect(splitSyncErrors('x: a | y: b')).toEqual(['x: a', 'y: b']);
    });
});

describe('describeSyncError', () => {
    it('explains auth failures with the source name and where to fix it', () => {
        const text = describeSyncError('glama: Request failed: 401');
        expect(text).toMatch(/^Glama: access was denied/);
        expect(text).toMatch(/Settings > Data Sources/);
    });

    it('keeps messages that were already written for people', () => {
        const message = 'Glama needs an API key. Add a Glama API key in Settings > Data Sources.';
        expect(describeSyncError(message)).toBe(message);
    });

    it('explains rate limits, outages and connection problems', () => {
        expect(describeSyncError('github: GitHub search failed: 429 rate limit exceeded')).toMatch(/rate limited/);
        expect(describeSyncError('npm: Request failed: 503')).toMatch(/having problems.*503/);
        expect(describeSyncError('pypi: fetch failed')).toMatch(/could not connect/);
    });

    it('passes unknown errors through, labelled with the source', () => {
        expect(describeSyncError('mcp-registry: schema mismatch')).toMatch(/: schema mismatch$/);
    });
});
