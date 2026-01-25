import { Model } from '../types';
import { formatCurrency, convertCurrency, detectCurrency, validateModelCost, factCheckModelCost } from './currency';

/**
 * Checks if a pricing entry is subscription-based.
 */
export const isSubscriptionPricing = (pricing: any): boolean => {
    if (!pricing.unit) return false;
    const unit = pricing.unit.toLowerCase();
    return unit.includes('month') ||
        unit.includes('year') ||
        unit.includes('annual') ||
        unit.includes('subscription') ||
        unit.includes('plan') ||
        (pricing.flat != null && !unit.includes('token') && !unit.includes('request') && !unit.includes('call'));
};

/**
 * Converts token amounts to per-million tokens.
 */
export const toPerMillion = (amount: number, unit?: string | null): number => {
    const u = (unit || '').toLowerCase();
    let perM = amount;
    if (u.includes('token')) perM = amount * 1_000_000;
    else if (u.includes('1k') || u.includes('thousand')) perM = amount * 1_000;

    // Heuristic: fix scuffed values accidentally scaled up
    if (perM > 10000) perM = perM / 1_000_000;
    if (perM > 10000) perM = perM / 1_000;
    return perM;
};

/**
 * Formats API pricing for enterprise display.
 */
export const formatEnterprisePricing = (inputCost: number, outputCost: number | null, currency: string): string => {
    if (outputCost !== null) {
        // Show blended cost (3:1 ratio input:output is typical)
        const blendedCost = (inputCost * 3 + outputCost) / 4;
        return formatCurrency(blendedCost, currency as any);
    }
    return formatCurrency(inputCost, currency as any);
};

/**
 * Gets the pricing type for a pricing entry.
 */
export const getPricingType = (pricing: any): string => {
    if (pricing.input != null || pricing.output != null) {
        return 'API';
    }
    if (pricing.flat != null) {
        return isSubscriptionPricing(pricing) ? 'Subscription' : 'API';
    }
    return 'Variable';
};

/**
 * Common formatting for release dates
 */
export const formatReleaseDate = (model: Model) => {
    if (!model.release_date) return "Unknown";

    // Check if flagged as unreleased/future
    if (model.tags && (model.tags.includes('unreleased') || model.tags.includes('future-release'))) {
        return "Unreleased";
    }

    const date = new Date(model.release_date);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
};
