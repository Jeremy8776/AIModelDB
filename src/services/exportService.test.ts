import { describe, expect, it, vi } from 'vitest';
import { exportModels } from './exportService';

const model: any = { name: 'Pipe | Name', provider: 'Line\nProvider', domain: 'LLM', source: 'test', license: { name: 'MIT "Quoted"', type: 'OSI', commercial_use: true, attribution_required: false, copyleft: false }, tags: ['a|b'] };

async function capture(format: any) {
  let content = '';
  vi.stubGlobal('Blob', class { constructor(parts: string[]) { content = parts.join(''); } } as any);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
  vi.spyOn(document, 'createElement').mockReturnValue({ click: vi.fn(), href: '', download: '' } as any);
  exportModels({ format, models: [model], filename: 'x' });
  return content;
}

describe('exportModels escaping', () => {
  it('escapes markdown table cells', async () => {
    const text = await capture('md');
    expect(text).toContain('Pipe \\| Name');
    expect(text).not.toContain('Line\nProvider');
  });

  it('escapes yaml strings', async () => {
    expect(await capture('yaml')).toContain('MIT \\"Quoted\\"');
  });
});
