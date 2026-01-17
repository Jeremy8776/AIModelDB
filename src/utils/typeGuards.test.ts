/**
 * Type Guards Tests
 */

import { describe, it, expect } from 'vitest';
import {
    isObject,
    isModel,
    isPartialModel,
    isDomain,
    isLicenseInfo,
    isHosting,
    isModelArray,
    filterToModels,
    isNonEmptyString,
    isPositiveNumber,
    isISODateString,
    asModel,
} from './typeGuards';

describe('isObject', () => {
    it('should return true for plain objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for arrays', () => {
        expect(isObject([])).toBe(false);
        expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
        expect(isObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
        expect(isObject('string')).toBe(false);
        expect(isObject(123)).toBe(false);
        expect(isObject(true)).toBe(false);
        expect(isObject(undefined)).toBe(false);
    });
});

describe('isModel', () => {
    const validModel = {
        id: 'test-1',
        name: 'Test Model',
        domain: 'LLM',
        source: 'test',
        license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false },
        hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
    };

    it('should return true for valid model', () => {
        expect(isModel(validModel)).toBe(true);
    });

    it('should return false for model without id', () => {
        expect(isModel({ name: 'Test' })).toBe(false);
    });

    it('should return false for model without name', () => {
        expect(isModel({ id: '1' })).toBe(false);
    });

    it('should return false for empty id', () => {
        expect(isModel({ id: '', name: 'Test' })).toBe(false);
    });

    it('should return false for empty name', () => {
        expect(isModel({ id: '1', name: '' })).toBe(false);
    });

    it('should return false for null', () => {
        expect(isModel(null)).toBe(false);
    });

    it('should return true for model with invalid domain as it is optional', () => {
        expect(isModel({ id: '1', name: 'Test', domain: undefined })).toBe(true);
    });
});

describe('isPartialModel', () => {
    it('should return true for object with id', () => {
        expect(isPartialModel({ id: 'test' })).toBe(true);
    });

    it('should return true for object with name', () => {
        expect(isPartialModel({ name: 'test' })).toBe(true);
    });

    it('should return false for empty object', () => {
        expect(isPartialModel({})).toBe(false);
    });

    it('should return false for null', () => {
        expect(isPartialModel(null)).toBe(false);
    });
});

describe('isDomain', () => {
    it('should return true for valid domains', () => {
        expect(isDomain('LLM')).toBe(true);
        expect(isDomain('ImageGen')).toBe(true);
        expect(isDomain('Audio')).toBe(true);
        expect(isDomain('Other')).toBe(true);
    });

    it('should return false for invalid domains', () => {
        expect(isDomain('Invalid')).toBe(false);
        expect(isDomain('')).toBe(false);
        expect(isDomain(null)).toBe(false);
    });
});

describe('isLicenseInfo', () => {
    it('should return true for valid license', () => {
        expect(isLicenseInfo({ name: 'MIT', type: 'OSI' })).toBe(true);
        expect(isLicenseInfo({ name: 'Custom License' })).toBe(true);
    });

    it('should return false for license without name', () => {
        expect(isLicenseInfo({ type: 'OSI' })).toBe(false);
    });

    it('should return false for null', () => {
        expect(isLicenseInfo(null)).toBe(false);
    });
});

describe('isHosting', () => {
    it('should return true for valid hosting', () => {
        expect(isHosting({ weights_available: true })).toBe(true);
        expect(isHosting({ api_available: false })).toBe(true);
        expect(isHosting({ providers: ['aws', 'gcp'] })).toBe(true);
        expect(isHosting({})).toBe(true); // All fields optional
    });

    it('should return false for invalid types', () => {
        expect(isHosting({ weights_available: 'yes' })).toBe(false);
        expect(isHosting({ providers: 'aws' })).toBe(false);
    });

    it('should return false for null', () => {
        expect(isHosting(null)).toBe(false);
    });
});

describe('isModelArray', () => {
    it('should return true for array of valid models', () => {
        expect(isModelArray([
            { id: '1', name: 'Model 1', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: {} },
            { id: '2', name: 'Model 2', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: {} },
        ])).toBe(true);
    });

    it('should return true for empty array', () => {
        expect(isModelArray([])).toBe(true);
    });

    it('should return false for array with invalid models', () => {
        expect(isModelArray([{ id: '1' }])).toBe(false);
    });

    it('should return false for non-array', () => {
        expect(isModelArray({ id: '1', name: 'Test' })).toBe(false);
    });
});

describe('filterToModels', () => {
    it('should filter out invalid items', () => {
        const items = [
            { id: '1', name: 'Valid', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: {} },
            { id: '2' }, // Invalid - no name
            null,
            'string',
            { id: '3', name: 'Also Valid', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: {} },
        ];

        const result = filterToModels(items);
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('1');
        expect(result[1].id).toBe('3');
    });
});

describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
        expect(isNonEmptyString('hello')).toBe(true);
        expect(isNonEmptyString('  hello  ')).toBe(true);
    });

    it('should return false for empty strings', () => {
        expect(isNonEmptyString('')).toBe(false);
        expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for non-strings', () => {
        expect(isNonEmptyString(123)).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
    });
});

describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
        expect(isPositiveNumber(1)).toBe(true);
        expect(isPositiveNumber(100)).toBe(true);
        expect(isPositiveNumber(0.5)).toBe(true);
    });

    it('should return false for zero and negative', () => {
        expect(isPositiveNumber(0)).toBe(false);
        expect(isPositiveNumber(-1)).toBe(false);
    });

    it('should return false for NaN', () => {
        expect(isPositiveNumber(NaN)).toBe(false);
    });
});

describe('isISODateString', () => {
    it('should return true for valid ISO dates', () => {
        expect(isISODateString('2024-01-15T10:30:00Z')).toBe(true);
        expect(isISODateString('2024-01-15')).toBe(true);
    });

    it('should return false for invalid dates', () => {
        expect(isISODateString('not-a-date')).toBe(false);
        expect(isISODateString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
        expect(isISODateString(123)).toBe(false);
        expect(isISODateString(null)).toBe(false);
    });
});

describe('asModel', () => {
    it('should return model if valid', () => {
        const model = { id: '1', name: 'Test', domain: 'LLM', source: 'test', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false }, hosting: {} };
        expect(asModel(model)).toBe(model);
    });

    it('should return null if invalid', () => {
        expect(asModel({ id: '1' })).toBe(null);
        expect(asModel(null)).toBe(null);
        expect(asModel('string')).toBe(null);
    });
});
