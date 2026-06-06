import { describe, expect, it } from 'vitest';
import { MCPServer } from '../types';
import { describeRuntimeArg, getInstallCommand, getRuntimeLabel, getSetupRequirement, getSetupTooltip } from './mcpDisplay';

function server(overrides: Partial<MCPServer> = {}): MCPServer {
    return {
        id: 'io.example/server',
        name: 'Example',
        source: 'mcp-registry',
        ...overrides,
    } as MCPServer;
}

describe('getRuntimeLabel', () => {
    it('returns local with runtimeHint when a package has one', () => {
        const s = server({ packages: [{ registryType: 'npm', identifier: 'x', runtimeHint: 'node' }] });
        expect(getRuntimeLabel(s)).toEqual({ kind: 'local', detail: 'node' });
    });

    it('falls back to a registry-type mapping when runtimeHint is missing', () => {
        const s = server({ packages: [{ registryType: 'pypi', identifier: 'x' }] });
        expect(getRuntimeLabel(s)).toEqual({ kind: 'local', detail: 'python' });
    });

    it('returns remote with a friendly protocol label', () => {
        const s = server({ remotes: [{ type: 'streamable-http', url: 'https://x' }] });
        expect(getRuntimeLabel(s)).toEqual({ kind: 'remote', detail: 'HTTP' });
    });

    it('prefers local over remote when both are present', () => {
        const s = server({
            packages: [{ registryType: 'npm', identifier: 'x', runtimeHint: 'node' }],
            remotes: [{ type: 'sse', url: 'https://x' }],
        });
        expect(getRuntimeLabel(s).kind).toBe('local');
    });

    it('returns unknown when neither packages nor remotes exist', () => {
        expect(getRuntimeLabel(server())).toEqual({ kind: 'unknown', detail: '' });
    });
});

describe('getSetupRequirement', () => {
    it('returns required when any env var is required', () => {
        const s = server({
            packages: [{
                registryType: 'npm', identifier: 'x',
                environmentVariables: [{ name: 'API_KEY', isRequired: true }],
            }],
        });
        expect(getSetupRequirement(s)).toBe('required');
    });

    it('returns required when any remote header is required', () => {
        const s = server({
            remotes: [{ type: 'sse', url: 'https://x', headers: [{ name: 'Authorization', isRequired: true }] }],
        });
        expect(getSetupRequirement(s)).toBe('required');
    });

    it('returns optional when env vars exist but none are required', () => {
        const s = server({
            packages: [{
                registryType: 'npm', identifier: 'x',
                environmentVariables: [{ name: 'DEBUG' }],
            }],
        });
        expect(getSetupRequirement(s)).toBe('optional');
    });

    it('returns none when nothing is configurable', () => {
        const s = server({ packages: [{ registryType: 'npm', identifier: 'x' }] });
        expect(getSetupRequirement(s)).toBe('none');
    });
});

describe('getInstallCommand', () => {
    it('uses npx for npm packages', () => {
        expect(getInstallCommand({ registryType: 'npm', identifier: '@scope/foo' })).toBe('npx -y @scope/foo');
    });

    it('uses uvx for pypi packages', () => {
        expect(getInstallCommand({ registryType: 'pypi', identifier: 'foo-bar' })).toBe('uvx foo-bar');
    });

    it('uses docker run for oci images', () => {
        expect(getInstallCommand({ registryType: 'oci', identifier: 'ghcr.io/foo/bar' })).toBe('docker run --rm -i ghcr.io/foo/bar');
    });

    it('returns null when registryType is other and no runtimeHint', () => {
        expect(getInstallCommand({ registryType: 'other', identifier: 'foo' })).toBeNull();
    });

    it('falls back to runtimeHint when registryType is unknown', () => {
        expect(getInstallCommand({ registryType: 'other', identifier: 'foo', runtimeHint: 'docker' })).toBe('docker run --rm -i foo');
    });
});

describe('describeRuntimeArg', () => {
    it('formats named arguments with values', () => {
        expect(describeRuntimeArg({ type: 'named', name: 'port', value: 3000 })).toBe('--port=3000');
    });

    it('formats valueless named arguments as flags', () => {
        expect(describeRuntimeArg({ type: 'named', name: 'verbose' })).toBe('--verbose');
    });

    it('returns positional values verbatim', () => {
        expect(describeRuntimeArg({ type: 'positional', value: '/workspace' })).toBe('/workspace');
    });

    it('returns plain strings as-is', () => {
        expect(describeRuntimeArg('--debug')).toBe('--debug');
    });
});

describe('getSetupTooltip', () => {
    it('lists required and optional env vars', () => {
        const s = server({
            packages: [{
                registryType: 'npm', identifier: 'x',
                environmentVariables: [
                    { name: 'API_KEY', isRequired: true },
                    { name: 'DEBUG' },
                ],
            }],
        });
        expect(getSetupTooltip(s)).toBe('Env vars: API_KEY, DEBUG (optional)');
    });

    it('returns an empty string when there is nothing to set up', () => {
        expect(getSetupTooltip(server())).toBe('');
    });
});
