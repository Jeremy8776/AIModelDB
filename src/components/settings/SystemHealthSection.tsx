import React, { useContext } from 'react';
import { Activity } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';

interface DiagResult {
    name: string;
    ok: boolean;
    status?: number;
    note?: string;
}

interface SystemHealthSectionProps {
    diagRunning: boolean;
    diagResults: DiagResult[];
    onRunDiagnostics: () => void;
}

/**
 * System Health section - displays connectivity diagnostics to data sources and APIs
 */
export function SystemHealthSection({
    diagRunning,
    diagResults,
    onRunDiagnostics
}: SystemHealthSectionProps) {
    const { theme } = useContext(ThemeContext);

    return (
        <div className="rounded-xl border p-4 border-border bg-card">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                    <Activity size={18} className="text-green-500" />
                    System Health
                </h4>
                <button
                    onClick={onRunDiagnostics}
                    disabled={diagRunning}
                    className={`text-xs px-3 py-1 rounded-md ${diagRunning ? 'opacity-60' : ''} ${theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    {diagRunning ? 'Checking…' : 'Run Diagnostics'}
                </button>
            </div>
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                Check connectivity to all data sources and API providers.
            </p>
            {diagResults.length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {diagResults.map(r => (
                        <div
                            key={r.name}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'
                                } border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-300'
                                }`}
                        >
                            <span>{r.name}</span>
                            <span className={`${r.ok ? 'text-green-500' : 'text-red-500'}`}>
                                {r.ok ? 'OK' : (r.status || r.note || 'Error')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
