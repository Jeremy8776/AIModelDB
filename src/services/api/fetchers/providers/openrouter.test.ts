import { describe, expect, it } from 'vitest';
import { mapOpenRouterModel } from './openrouter';

describe('mapOpenRouterModel', () => {
    it('maps pricing, source, provider, and release date', () => {
        const model = mapOpenRouterModel({
            id: 'anthropic/claude-sonnet-4',
            name: 'Anthropic: Claude Sonnet 4',
            created: 1717200000,
            context_length: 200000,
            architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'], tokenizer: 'Claude' },
            pricing: { prompt: '0.000003', completion: '0.000015' },
        });

        expect(model.id).toBe('openrouter:anthropic/claude-sonnet-4');
        expect(model.source).toBe('OpenRouter');
        expect(model.provider).toBe('Anthropic');
        expect(model.domain).toBe('VLM');
        expect(model.context_window).toBe('200000');
        expect(model.pricing[0]).toMatchObject({ input: 3, output: 15, unit: '1M tokens' });
        expect(model.release_date).toBe('2024-06-01');
    });
});

