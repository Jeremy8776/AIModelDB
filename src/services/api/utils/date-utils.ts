/**
 * Date utility functions for normalizing various date formats
 */

/**
 * Normalize a variety of date inputs to ISO YYYY-MM-DD (or null if invalid)
 * Handles:
 * - ISO date strings
 * - JavaScript Date objects
 * - Excel-like serial numbers
 * - MM/DD/YYYY format
 */
export function normalizeDate(input: any): string | null {
    if (input == null) return null;
    // If already looks like ISO
    const s = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Try JS Date parse
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1.toISOString().slice(0, 10);
    // Excel-like serial numbers
    const n = Number(input);
    if (isFinite(n) && n > 30000 && n < 100000) {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const dt = new Date(epoch.getTime() + n * 86400000);
        return dt.toISOString().slice(0, 10);
    }
    // MM/DD/YYYY or similar
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
        const mm = mdy[1].padStart(2, '0');
        const dd = mdy[2].padStart(2, '0');
        return `${mdy[3]}-${mm}-${dd}`;
    }
    return null;
}
