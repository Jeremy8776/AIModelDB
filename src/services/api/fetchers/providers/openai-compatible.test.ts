import { describe, expect, it } from 'vitest';
import { mapOpenAICompatModel } from './openai-compatible';

describe('mapOpenAICompatModel', () => {
    it('maps generic OpenAI-compatible model rows', () => {
        const model = mapOpenAICompatModel(
            { id: 'gpt-4o-mini', created: 1717200000, owned_by: 'openai', context_window: 128000 },
            { key: 'openai', name: 'OpenAI', source: 'OpenAI', url: 'https://api.openai.com/v1/models' }
        );

        expect(model.id).toBe('openai:gpt-4o-mini');
        expect(model.source).toBe('OpenAI');
        expect(model.provider).toBe('openai');
        expect(model.context_window).toBe('128000');
        expect(model.release_date).toBe('2024-06-01');
    });
});

