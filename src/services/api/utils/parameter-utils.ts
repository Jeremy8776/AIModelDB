/**
 * Parameter inference utilities for extracting model parameter counts from names and tags
 */

/**
 * Infer parameter count from model name/tags (e.g., "20b", "7b", "70b")
 */
export function inferParametersFromNameTags(name?: string, tags?: string[]): string | undefined {
    const candidates: string[] = [];
    if (name) candidates.push(name);
    if (tags && tags.length) candidates.push(...tags);
    const regex = /\b(\d{1,3})\s*(b|m)\b/i;
    for (const s of candidates) {
        const m = s.toLowerCase().match(regex);
        if (m) {
            const val = m[1];
            const unit = m[2].toLowerCase() === 'b' ? 'B' : 'M';
            return `${val}${unit}`;
        }
    }
    return undefined;
}
