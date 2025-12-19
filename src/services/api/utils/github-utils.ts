/**
 * GitHub-specific utility functions for parsing repositories and SPDX licenses
 */

/**
 * Parse GitHub repository URL to extract owner and name
 */
export function parseGitHubRepo(url?: string | null): { owner: string; name: string } | null {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.hostname !== 'github.com') return null;
        const [owner, name] = u.pathname.replace(/^\//, '').split('/');
        if (owner && name) return { owner, name };
    } catch { }
    return null;
}

/**
 * Map SPDX license identifier to license type
 */
export function mapSpdxToType(spdx?: string | null): 'Proprietary' | 'OSI' | 'Copyleft' | 'Non-Commercial' | 'Custom' {
    if (!spdx) return 'Custom';
    const s = spdx.toLowerCase();
    if (s.includes('gpl') || s.includes('agpl') || s.includes('lgpl')) return 'Copyleft';
    if (s.includes('apache') || s.includes('mit') || s.includes('bsd') || s.includes('mpl')) return 'OSI';
    if (s.includes('cc-by-nc') || s.includes('non-commercial') || s.includes('nc')) return 'Non-Commercial';
    if (s.includes('proprietary')) return 'Proprietary';
    return 'Custom';
}
