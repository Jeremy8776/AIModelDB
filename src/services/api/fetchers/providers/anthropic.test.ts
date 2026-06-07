import { describe, expect, it } from 'vitest';
import { mapAnthropicModel } from './anthropic';

describe('mapAnthropicModel', () => {
    it('maps Claude model metadata from Anthropic /v1/models', () => {
        const model = mapAnthropicModel({
            id: 'claude-sonnet-4-20250514',
            display_name: 'Claude Sonnet 4',
            created_at: '2025-05-14T00:00:00Z',
            max_input_tokens: 200000,
            capabilities: { image_input: { supported: true }, pdf_input: { supported: true } },
        });

        expect(model.id).toBe('anthropic:claude-sonnet-4-20250514');
        expect(model.name).toBe('Claude Sonnet 4');
        expect(model.source).toBe('Anthropic');
        expect(model.domain).toBe('VLM');
        expect(model.release_date).toBe('2025-05-14');
        expect(model.tags).toEqual(expect.arrayContaining(['api', 'commercial', 'anthropic', 'vision', 'pdf-input']));
    });
});

