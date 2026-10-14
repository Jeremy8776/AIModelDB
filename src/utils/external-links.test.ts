import { describe, it, expect } from 'vitest';
import { isHttpUrl, safeHref } from './external-links';

describe('isHttpUrl', () => {
    it('accepts http and https', () => {
        expect(isHttpUrl('https://example.com')).toBe(true);
        expect(isHttpUrl('http://example.com/path?q=1')).toBe(true);
    });

    it('rejects dangerous schemes from untrusted source metadata', () => {
        expect(isHttpUrl('javascript:alert(1)')).toBe(false);
        expect(isHttpUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
        expect(isHttpUrl('file:///C:/Windows/System32')).toBe(false);
        expect(isHttpUrl('\\\\attacker\\share')).toBe(false);
    });

    it('rejects garbage / empty input', () => {
        expect(isHttpUrl('')).toBe(false);
        expect(isHttpUrl('not a url')).toBe(false);
    });
});

describe('safeHref', () => {
    it('passes http(s) URLs through and drops everything else', () => {
        expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
        expect(safeHref('javascript:alert(1)')).toBeUndefined();
        expect(safeHref('data:text/html,x')).toBeUndefined();
        expect(safeHref(null)).toBeUndefined();
        expect(safeHref('')).toBeUndefined();
    });
});
