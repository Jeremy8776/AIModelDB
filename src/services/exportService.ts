/**
 * Export Service
 * 
 * Handles exporting AI model data to various file formats.
 * Supports JSON, CSV, TSV, YAML, XML, and Markdown table formats.
 * 
 * @module exportService
 */

import { Model } from '../types';
import { toCSV } from '../utils/format';

/**
 * Supported export formats for model data
 */
export type ExportFormat = 'json' | 'csv' | 'tsv' | 'yaml' | 'xml' | 'md';

/**
 * Options for exporting model data
 */
export interface ExportOptions {
    /** The format to export to */
    format: ExportFormat;
    /** The models to export */
    models: Model[];
    /** Optional custom filename (without extension) */
    filename?: string;
}

/**
 * Export models to a file in the specified format
 * 
 * @param options - Export configuration options
 * @throws Error if export fails
 */
export function exportModels(options: ExportOptions): void {
    const { format, models, filename } = options;

    try {
        // Generate human-readable timestamp: YYYY-MM-DD_HH-MM
        const now = new Date();
        const timestamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-') + '_' + [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0')
        ].join('-');

        const baseFilename = filename || `ai-models-export_${timestamp}`;

        switch (format) {
            case 'json':
                exportJSON(models, baseFilename);
                break;
            case 'csv':
                exportCSV(models, baseFilename);
                break;
            case 'tsv':
                exportTSV(models, baseFilename);
                break;
            case 'yaml':
                exportYAML(models, baseFilename);
                break;
            case 'xml':
                exportXML(models, baseFilename);
                break;
            case 'md':
                exportMarkdown(models, baseFilename);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    } catch (error) {
        console.error(`Failed to export models as ${format}:`, error);
        throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Export models as JSON format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportJSON(models: Model[], filename: string): void {
    const content = JSON.stringify(models, null, 2);
    downloadFile(content, `${filename}.json`, 'application/json');
}

/**
 * Export models as CSV (Comma-Separated Values) format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportCSV(models: Model[], filename: string): void {
    const rows = models.map(m => ({
        name: m.name,
        provider: m.provider,
        domain: m.domain,
        source: m.source,
        url: m.url,
        license_name: m.license?.name,
        license_type: m.license?.type,
        commercial: m.license?.commercial_use,
        attribution_required: m.license?.attribution_required,
        copyleft: m.license?.copyleft,
        updated_at: m.updated_at,
        release_date: m.release_date,
        tags: (m.tags || []).join(';'),
        downloads: m.downloads,
        pricing: (m.pricing || []).map(p =>
            `${p.model || ''}:${p.unit || ''}:${p.input || ''}/${p.output || ''}:${p.flat || ''}${p.currency ? ' ' + p.currency : ''}`
        ).join(' | ')
    }));

    const content = toCSV(rows);
    downloadFile(content, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export models as TSV (Tab-Separated Values) format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportTSV(models: Model[], filename: string): void {
    const rows = models.map(m => ({
        name: m.name,
        provider: m.provider,
        domain: m.domain,
        source: m.source,
        url: m.url,
        license_name: m.license?.name,
        license_type: m.license?.type,
        commercial: m.license?.commercial_use,
        attribution_required: m.license?.attribution_required,
        copyleft: m.license?.copyleft,
        updated_at: m.updated_at,
        release_date: m.release_date,
        tags: (m.tags || []).join(';'),
        downloads: m.downloads,
        pricing: (m.pricing || []).map(p =>
            `${p.model || ''}:${p.unit || ''}:${p.input || ''}/${p.output || ''}:${p.flat || ''}${p.currency ? ' ' + p.currency : ''}`
        ).join(' | ')
    }));

    // Convert to TSV (tab-separated values)
    const headers = Object.keys(rows[0] || {});
    const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => headers.map(h => String(row[h as keyof typeof row] || '')).join('\t'))
    ].join('\n');

    downloadFile(tsvContent, `${filename}.tsv`, 'text/tab-separated-values;charset=utf-8;');
}

/**
 * Export models as YAML format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportYAML(models: Model[], filename: string): void {
    const yamlContent = models.map(model => {
        const yamlModel = [
            `- name: "${model.name}"`,
            `  provider: "${model.provider || ''}"`,
            `  domain: "${model.domain || ''}"`,
            `  source: "${model.source || ''}"`,
            `  url: "${model.url || ''}"`,
            `  license:`,
            `    name: "${model.license?.name || ''}"`,
            `    type: "${model.license?.type || ''}"`,
            `    commercial_use: ${model.license?.commercial_use || false}`,
            `    attribution_required: ${model.license?.attribution_required || false}`,
            `    copyleft: ${model.license?.copyleft || false}`,
            `  updated_at: "${model.updated_at || ''}"`,
            `  release_date: "${model.release_date || ''}"`,
            `  downloads: ${model.downloads || 0}`,
            `  tags: [${(model.tags || []).map(t => `"${t}"`).join(', ')}]`,
            `  pricing: [${(model.pricing || []).map(p => `"${p.model || ''}:${p.unit || ''}:${p.input || ''}/${p.output || ''}:${p.flat || ''}${p.currency ? ' ' + p.currency : ''}"`).join(', ')}]`
        ].join('\n');
        return yamlModel;
    }).join('\n\n');

    downloadFile(yamlContent, `${filename}.yaml`, 'text/yaml;charset=utf-8;');
}

/**
 * Export models as XML format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportXML(models: Model[], filename: string): void {
    const xmlContent = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<models>',
        ...models.map(model => [
            '  <model>',
            `    <name>${escapeXML(model.name || '')}</name>`,
            `    <provider>${escapeXML(model.provider || '')}</provider>`,
            `    <domain>${escapeXML(model.domain || '')}</domain>`,
            `    <source>${escapeXML(model.source || '')}</source>`,
            `    <url>${escapeXML(model.url || '')}</url>`,
            '    <license>',
            `      <name>${escapeXML(model.license?.name || '')}</name>`,
            `      <type>${escapeXML(model.license?.type || '')}</type>`,
            `      <commercial_use>${model.license?.commercial_use || false}</commercial_use>`,
            `      <attribution_required>${model.license?.attribution_required || false}</attribution_required>`,
            `      <copyleft>${model.license?.copyleft || false}</copyleft>`,
            '    </license>',
            `    <updated_at>${escapeXML(model.updated_at || '')}</updated_at>`,
            `    <release_date>${escapeXML(model.release_date || '')}</release_date>`,
            `    <downloads>${model.downloads || 0}</downloads>`,
            '    <tags>',
            ...(model.tags || []).map(tag => `      <tag>${escapeXML(tag)}</tag>`),
            '    </tags>',
            '    <pricing>',
            ...(model.pricing || []).map(p =>
                `      <price model="${escapeXML(p.model || '')}" unit="${escapeXML(p.unit || '')}" input="${escapeXML(String(p.input || ''))}" output="${escapeXML(String(p.output || ''))}" flat="${escapeXML(String(p.flat || ''))}" currency="${escapeXML(p.currency || '')}"/>`
            ),
            '    </pricing>',
            '  </model>'
        ].join('\n')),
        '</models>'
    ].join('\n');

    downloadFile(xmlContent, `${filename}.xml`, 'text/xml;charset=utf-8;');
}

/**
 * Export models as Markdown table format.
 * 
 * @param models - Array of models to export
 * @param filename - Base filename (without extension)
 */
function exportMarkdown(models: Model[], filename: string): void {
    const headers = ['Name', 'Provider', 'Domain', 'License', 'Downloads', 'Updated'];
    const separator = headers.map(() => '---').join(' | ');
    const rows = models.map(m => [
        m.name || '',
        m.provider || '',
        m.domain || '',
        m.license?.name || '',
        (m.downloads || 0).toLocaleString(),
        m.updated_at ? new Date(m.updated_at).toLocaleDateString() : ''
    ].join(' | '));

    const mdContent = [
        `# AI Models Export (${models.length} models)`,
        '',
        headers.join(' | '),
        separator,
        ...rows
    ].join('\n');

    downloadFile(mdContent, `${filename}.md`, 'text/markdown;charset=utf-8;');
}

/**
 * Escape special XML characters to prevent parsing errors.
 * 
 * @param str - String to escape
 * @returns Escaped string safe for XML
 */
function escapeXML(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Trigger a file download in the browser.
 * 
 * Creates a blob URL and triggers a download using an anchor element.
 * 
 * @param content - File content as string
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
