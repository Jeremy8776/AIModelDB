import { MCPServer } from '../types';

/**
 * How a user actually runs an MCP server. Folds package + remote metadata
 * into a single Local/Remote split with a friendly runtime/protocol detail.
 *
 * Local takes precedence when both are present — the install is the action
 * the user takes; remote endpoints are implementation detail of the package.
 */
export type RuntimeKind = 'local' | 'remote' | 'unknown';

export interface RuntimeLabel {
    kind: RuntimeKind;
    detail: string; // 'node' | 'python' | 'docker' | 'HTTP' | 'SSE' | ...
}

const RUNTIME_HINT_FROM_REGISTRY: Record<string, string> = {
    npm: 'node',
    pypi: 'python',
    oci: 'docker',
    nuget: '.NET',
};

const REMOTE_PROTOCOL_LABEL: Record<string, string> = {
    'stdio': 'stdio',
    'sse': 'SSE',
    'streamable-http': 'HTTP',
    'websocket': 'WebSocket',
};

export function getRuntimeLabel(server: MCPServer): RuntimeLabel {
    const pkg = server.packages?.[0];
    if (pkg) {
        const detail = pkg.runtimeHint
            || RUNTIME_HINT_FROM_REGISTRY[pkg.registryType]
            || 'package';
        return { kind: 'local', detail };
    }
    const remote = server.remotes?.[0];
    if (remote) {
        const detail = REMOTE_PROTOCOL_LABEL[remote.type] || remote.type;
        return { kind: 'remote', detail };
    }
    return { kind: 'unknown', detail: '' };
}

/**
 * Whether the user has to plug anything in before this server will run.
 * Required > optional > none. Folds env vars (local packages) and headers
 * (remote endpoints) together because both are "stuff the user must supply".
 */
export type SetupRequirement = 'required' | 'optional' | 'none';

export function getSetupRequirement(server: MCPServer): SetupRequirement {
    const envVars = (server.packages || []).flatMap(p => p.environmentVariables || []);
    const headers = (server.remotes || []).flatMap(r => r.headers || []);

    if (envVars.some(v => v.isRequired) || headers.some(h => h.isRequired)) return 'required';
    if (envVars.length > 0 || headers.length > 0) return 'optional';
    return 'none';
}

/**
 * Human-readable tooltip listing the env vars / headers behind a Setup badge.
 * Empty string when nothing is needed.
 */
export function getSetupTooltip(server: MCPServer): string {
    const envVars = (server.packages || []).flatMap(p => p.environmentVariables || []);
    const headers = (server.remotes || []).flatMap(r => r.headers || []);

    const parts: string[] = [];
    if (envVars.length) {
        const names = envVars.map(v => `${v.name}${v.isRequired ? '' : ' (optional)'}`);
        parts.push(`Env vars: ${names.join(', ')}`);
    }
    if (headers.length) {
        const names = headers.map(h => `${h.name}${h.isRequired ? '' : ' (optional)'}`);
        parts.push(`Headers: ${names.join(', ')}`);
    }
    return parts.join(' · ');
}

// Sort weights — used by table column sort to produce a stable ordering.
export const RUNTIME_SORT_WEIGHT: Record<RuntimeKind, number> = {
    local: 0,
    remote: 1,
    unknown: 2,
};

export const SETUP_SORT_WEIGHT: Record<SetupRequirement, number> = {
    none: 0,
    optional: 1,
    required: 2,
};

/**
 * Synthesize the bare runner command for a package. Arguments and env vars
 * are surfaced separately in the UI — this is the command the user copies
 * to verify install / run, not the full configured invocation.
 *
 * Returns null when we can't form a sensible command (registryType 'other'
 * with no runtimeHint).
 */
export function getInstallCommand(pkg: {
    registryType: string;
    identifier: string;
    runtimeHint?: string | null;
}): string | null {
    const hint = (pkg.runtimeHint || '').toLowerCase();
    const id = pkg.identifier;

    if (pkg.registryType === 'npm' || hint === 'node') return `npx -y ${id}`;
    if (pkg.registryType === 'pypi' || hint === 'python') return `uvx ${id}`;
    if (pkg.registryType === 'oci' || hint === 'docker') return `docker run --rm -i ${id}`;
    if (pkg.registryType === 'nuget') return `dotnet tool run ${id}`;
    if (hint === 'binary') return id;
    return null;
}

/**
 * Try to extract a printable value out of one element of `runtimeArguments`.
 * The schema is loose (`unknown[]`); we render what we can without throwing.
 */
export function describeRuntimeArg(arg: unknown): string {
    if (arg == null) return '';
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return String(arg);
    }
    if (typeof arg === 'object') {
        const a = arg as Record<string, unknown>;
        const name = typeof a.name === 'string' ? a.name : '';
        const value = a.value != null ? String(a.value) : '';
        const type = typeof a.type === 'string' ? a.type : '';
        if (type === 'named' && name) return value ? `--${name}=${value}` : `--${name}`;
        if (type === 'positional' && value) return value;
        if (name && value) return `${name}=${value}`;
        if (value) return value;
        if (name) return name;
    }
    return '';
}
