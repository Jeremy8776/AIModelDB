/**
 * License utility functions for normalizing and determining license properties
 */

/**
 * Normalize license names to standard formats
 */
export function normalizeLicenseName(name?: string | null): string | undefined {
    if (!name) return undefined;
    const s = String(name).trim();
    const l = s.toLowerCase();
    const map: Record<string, string> = {
        'apache 2.0': 'Apache-2.0',
        'apache-2': 'Apache-2.0',
        'apache-2.0': 'Apache-2.0',
        'mit': 'MIT',
        'bsd-3': 'BSD-3-Clause',
        'bsd-3-clause': 'BSD-3-Clause',
        'gpl-3.0': 'GPL-3.0',
        'agpl-3.0': 'AGPL-3.0',
        'lgpl-3.0': 'LGPL-3.0',
        'creativeml open rail-m': 'CreativeML Open RAIL-M',
        'creativeml open rail++-m': 'CreativeML Open RAIL++-M',
        'llama 2 community license': 'LLaMA 2 Custom License',
        'llama 2 license': 'LLaMA 2 Custom License',
        'llama 3 community license': 'Llama 3 Community License',
        'meta llama 3 community license': 'Llama 3 Community License'
    };
    return map[l] || s;
}

/**
 * Determine license type from license name
 */
export function determineType(license?: string): 'Proprietary' | 'OSI' | 'Copyleft' | 'Non-Commercial' | 'Custom' {
    if (!license) return 'Custom';

    const lowerLicense = license.toLowerCase();
    if (lowerLicense.includes('mit') || lowerLicense.includes('apache') || lowerLicense.includes('bsd')) return 'OSI';
    if (lowerLicense.includes('gpl') || lowerLicense.includes('copyleft')) return 'Copyleft';
    if (lowerLicense.includes('proprietary')) return 'Proprietary';
    if (lowerLicense.includes('non-commercial') || lowerLicense.includes('nc')) return 'Non-Commercial';

    return 'Custom';
}

/**
 * Determine if a license allows commercial use
 */
export function determineCommercialUse(license?: string): boolean {
    if (!license) return false;

    const lowerLicense = license.toLowerCase();
    if (lowerLicense.includes('mit') || lowerLicense.includes('apache')) return true;
    if (lowerLicense.includes('commercial')) return true;
    if (lowerLicense.includes('non-commercial')) return false;

    return false;
}

/**
 * Infer license name from tags like "license:apache-2.0" or shorthand like "apache-2.0"
 */
export function inferLicenseFromTags(tags?: string[]): string | undefined {
    if (!tags || !tags.length) return undefined;
    const joined = tags.map(t => t.toLowerCase());
    const match = joined.find(t => t.startsWith('license:')) || joined.find(t => /apache|mit|bsd|gpl|agpl|lgpl|mpl|cc-by|cc0|openrail|non-?commercial/.test(t));
    if (!match) return undefined;
    const name = match.replace(/^license:/, '').replace(/_/g, '-');
    // Normalize a few common values
    if (name.includes('apache')) return 'Apache-2.0';
    if (name.includes('mit')) return 'MIT';
    if (name.includes('bsd')) return 'BSD';
    if (name.includes('agpl')) return 'AGPL';
    if (name.includes('lgpl')) return 'LGPL';
    if (name.includes('gpl')) return 'GPL';
    if (name.includes('cc0')) return 'CC0';
    if (name.includes('cc-by-nc')) return 'CC-BY-NC';
    if (name.includes('openrail')) return 'OpenRAIL';
    return match;
}
