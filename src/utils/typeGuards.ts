/**
 * Type Guards
 * 
 * Type guard functions that narrow types at runtime.
 * Use these instead of type assertions for safer type narrowing.
 * 
 * @example
 * ```ts
 * if (isModel(data)) {
 *   console.log(data.name); // TypeScript knows this is a Model
 * }
 * ```
 */

import { Model, LicenseInfo, Hosting, Domain, DOMAINS } from '../types';

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a valid Model
 */
export function isModel(value: unknown): value is Model {
    if (!isObject(value)) return false;

    // Required fields
    if (typeof value.id !== 'string' || !value.id) return false;
    if (typeof value.name !== 'string' || !value.name) return false;

    // Domain must be a valid domain or undefined
    if (value.domain !== undefined && !DOMAINS.includes(value.domain as Domain)) {
        return false;
    }

    return true;
}

/**
 * Check if a value is a partial Model (has at least id or name)
 */
export function isPartialModel(value: unknown): value is Partial<Model> & { id?: string; name?: string } {
    if (!isObject(value)) return false;
    return typeof value.id === 'string' || typeof value.name === 'string';
}

/**
 * Check if a value is a valid Domain
 */
export function isDomain(value: unknown): value is Domain {
    return typeof value === 'string' && DOMAINS.includes(value as Domain);
}

/**
 * Check if a value is a valid LicenseInfo
 */
export function isLicenseInfo(value: unknown): value is LicenseInfo {
    if (!isObject(value)) return false;
    if (typeof value.name !== 'string') return false;

    const validTypes = ['OSI', 'Copyleft', 'Non-Commercial', 'Custom', 'Proprietary'];
    if (value.type !== undefined && !validTypes.includes(value.type as string)) {
        return false;
    }

    return true;
}

/**
 * Check if a value is a valid Hosting object
 */
export function isHosting(value: unknown): value is Hosting {
    if (!isObject(value)) return false;

    // All fields are optional, so just check types if present
    if (value.weights_available !== undefined && typeof value.weights_available !== 'boolean') {
        return false;
    }
    if (value.api_available !== undefined && typeof value.api_available !== 'boolean') {
        return false;
    }
    if (value.on_premise_friendly !== undefined && typeof value.on_premise_friendly !== 'boolean') {
        return false;
    }
    if (value.providers !== undefined && !Array.isArray(value.providers)) {
        return false;
    }

    return true;
}

/**
 * Check if an array contains only valid Models
 */
export function isModelArray(value: unknown): value is Model[] {
    if (!Array.isArray(value)) return false;
    return value.every(isModel);
}

/**
 * Filter an array to only valid Models
 */
export function filterToModels(items: unknown[]): Model[] {
    return items.filter(isModel);
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Check if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}

/**
 * Safely cast unknown to Model, returning null if invalid
 */
export function asModel(value: unknown): Model | null {
    return isModel(value) ? value : null;
}

/**
 * Assert that a value is never reached (exhaustive check)
 * @example
 * ```ts
 * switch (domain) {
 *   case 'LLM': ...
 *   default: assertNever(domain);
 * }
 * ```
 */
export function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
