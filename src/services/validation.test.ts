import { describe, expect, it } from 'vitest';
import { convertModelsToCSV, parseCSVToModels } from './validation';
import { Model } from '../types';

const baseModel: Model = {
  id: 'id', name: 'name', provider: 'provider', domain: 'LLM', source: 'test',
  license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false },
  hosting: { weights_available: true, api_available: false, on_premise_friendly: true },
};

describe('validation CSV parsing', () => {
  it('preserves rows with quoted multiline fields', () => {
    const csv = convertModelsToCSV([
      { ...baseModel, id: '1', name: 'One', description: 'first line\nsecond line' },
      { ...baseModel, id: '2', name: 'Two', description: 'plain' },
    ]);
    const parsed = parseCSVToModels(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('1');
    expect(parsed[0].description).toBe('first line\nsecond line');
    expect(parsed[1].id).toBe('2');
  });
});
