/**
 * Language Detection Utilities
 *
 * Provides functions to detect Chinese, Japanese, and Korean text in strings.
 * Used primarily for translation workflows to identify models that need translation.
 */

/**
 * Checks if the given text contains Chinese characters.
 *
 * @param text - The text to check for Chinese characters
 * @returns true if the text contains Chinese characters, false otherwise
 *
 * @remarks
 * This function checks for:
 * - CJK Unified Ideographs (U+4E00 to U+9FFF) - most common Chinese characters
 * - CJK Extension A (U+3400 to U+4DBF) - additional Chinese characters
 */
export function containsChinese(text?: string | null): boolean {
    if (!text) return false;
    // Covers CJK Unified Ideographs (most Chinese characters) and CJK Extension A
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

/**
 * Checks if the given text contains Japanese or Korean characters.
 *
 * @param text - The text to check for Japanese or Korean characters
 * @returns true if the text contains Japanese or Korean characters, false otherwise
 *
 * @remarks
 * This function checks for:
 * - Japanese Hiragana (U+3040 to U+309F)
 * - Japanese Katakana (U+30A0 to U+30FF)
 * - Korean Hangul (U+AC00 to U+D7AF)
 */
export function containsOtherAsianLanguages(text?: string | null): boolean {
    if (!text) return false;
    // Japanese Hiragana, Katakana, and Korean Hangul
    return /[\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text);
}
