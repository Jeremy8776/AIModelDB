import { describe, it, expect } from 'vitest';
import {
    getCurrencySymbol,
    convertCurrency,
    formatCurrency,
    detectCurrency,
    validateModelCost,
    factCheckModelCost,
    CurrencyCode,
} from '../utils/currency';
import { Pricing } from '../types';

describe('getCurrencySymbol', () => {
    it('should return correct symbols for known currencies', () => {
        expect(getCurrencySymbol('USD')).toBe('$');
        expect(getCurrencySymbol('EUR')).toBe('€');
        expect(getCurrencySymbol('GBP')).toBe('£');
        expect(getCurrencySymbol('JPY')).toBe('¥');
    });

    it('should handle case insensitivity', () => {
        expect(getCurrencySymbol('usd')).toBe('$');
        expect(getCurrencySymbol('Eur')).toBe('€');
    });

    it('should default to $ for null/undefined', () => {
        expect(getCurrencySymbol(null)).toBe('$');
        expect(getCurrencySymbol(undefined)).toBe('$');
    });

    it('should return original string for unknown currency', () => {
        expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    });
});

describe('convertCurrency', () => {
    it('should return same amount for same currency', () => {
        expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
        expect(convertCurrency(50, 'EUR', 'EUR')).toBe(50);
    });

    it('should convert between currencies', () => {
        // USD to EUR (rate ~0.85)
        const result = convertCurrency(100, 'USD', 'EUR');
        expect(result).toBeCloseTo(85, 0);
    });

    it('should handle string input', () => {
        const result = convertCurrency('100', 'USD', 'EUR');
        expect(result).toBeCloseTo(85, 0);
    });

    it('should return NaN for invalid input', () => {
        expect(convertCurrency('invalid', 'USD', 'EUR')).toBeNaN();
    });
});

describe('formatCurrency', () => {
    it('should format regular amounts with 2 decimal places', () => {
        expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
        expect(formatCurrency(100, 'USD')).toBe('$100.00');
    });

    it('should format small amounts with 3 decimal places', () => {
        expect(formatCurrency(0.123, 'USD')).toBe('$0.123');
    });

    it('should format very small amounts with 6 decimal places', () => {
        expect(formatCurrency(0.000123, 'USD')).toBe('$0.000123');
    });

    it('should handle JPY without decimals', () => {
        expect(formatCurrency(1234.56, 'JPY')).toBe('¥1,235');
    });

    it('should return dash for null/undefined/NaN', () => {
        expect(formatCurrency(null)).toBe('—');
        expect(formatCurrency(undefined)).toBe('—');
        expect(formatCurrency(NaN)).toBe('—');
    });
});

describe('detectCurrency', () => {
    it('should detect currency from pricing object', () => {
        const pricing: Pricing = { currency: 'EUR', input: 0.01 };
        expect(detectCurrency(pricing)).toBe('EUR');
    });

    it('should normalize currency codes', () => {
        const pricing: Pricing = { currency: 'usd', input: 0.01 };
        expect(detectCurrency(pricing)).toBe('USD');
    });

    it('should default to USD for missing currency', () => {
        const pricing: Pricing = { input: 0.01 };
        expect(detectCurrency(pricing)).toBe('USD');
    });

    it('should default to USD for null/undefined', () => {
        expect(detectCurrency(null)).toBe('USD');
        expect(detectCurrency(undefined)).toBe('USD');
    });
});

describe('validateModelCost', () => {
    it('should return invalid for missing pricing', () => {
        const result = validateModelCost(null, 'Test Model', 'LLM');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('No pricing information available');
    });

    it('should flag unusually high LLM token costs', () => {
        const pricing: Pricing = { input: 1.0, currency: 'USD' }; // $1 per token is way too high
        const result = validateModelCost(pricing, 'Test LLM', 'LLM');
        expect(result.confidence).toBe('low');
        expect(result.issues.some(i => i.includes('unusually high'))).toBe(true);
    });

    it('should flag unusually low token costs', () => {
        const pricing: Pricing = { input: 0.0000001, currency: 'USD' };
        const result = validateModelCost(pricing, 'Test LLM', 'LLM');
        expect(result.issues.some(i => i.includes('unusually low'))).toBe(true);
    });

    it('should provide suggested range for LLM pricing', () => {
        const pricing: Pricing = { input: 0.01, currency: 'USD' };
        const result = validateModelCost(pricing, 'Test LLM', 'LLM');
        expect(result.suggestedRange).toBeDefined();
        expect(result.suggestedRange?.min).toBeLessThan(result.suggestedRange?.max || 0);
    });

    it('should validate subscription pricing', () => {
        const pricing: Pricing = { flat: 5000, unit: 'month', currency: 'USD' };
        const result = validateModelCost(pricing, 'Enterprise Model', 'LLM');
        expect(result.issues.some(i => i.includes('expensive'))).toBe(true);
    });
});

describe('factCheckModelCost', () => {
    it('should validate known GPT-4 pricing', () => {
        const pricing: Pricing = { input: 0.03, output: 0.06, currency: 'USD' };
        const result = factCheckModelCost('gpt-4', pricing);
        expect(result.isValid).toBe(true);
    });

    it('should flag incorrect GPT-4 pricing', () => {
        const pricing: Pricing = { input: 0.001, output: 0.002, currency: 'USD' }; // Way too cheap for GPT-4
        const result = factCheckModelCost('gpt-4', pricing);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.includes('differs significantly'))).toBe(true);
    });

    it('should return low confidence for unknown models', () => {
        const pricing: Pricing = { input: 0.01, currency: 'USD' };
        const result = factCheckModelCost('unknown-model-xyz', pricing);
        expect(result.confidence).toBe('low');
        expect(result.issues.some(i => i.includes('No reference pricing'))).toBe(true);
    });

    it('should handle missing pricing data', () => {
        const result = factCheckModelCost('gpt-4', null);
        expect(result.isValid).toBe(false);
        expect(result.issues.some(i => i.includes('Missing pricing data'))).toBe(true);
    });
});
