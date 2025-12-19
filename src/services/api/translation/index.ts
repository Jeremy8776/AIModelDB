/**
 * Translation Module Barrel Export
 *
 * Re-exports all translation-related functionality including:
 * - Translation orchestration (translateChineseModels)
 * - Language detection utilities (containsChinese, containsOtherAsianLanguages)
 */

export { translateChineseModels } from './translator';
export { containsChinese, containsOtherAsianLanguages } from './language-detection';
