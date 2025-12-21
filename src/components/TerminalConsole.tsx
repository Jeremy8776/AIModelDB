import React, { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

export interface TerminalConsoleProps {
  logs: string[];
  onClose: () => void;
  onClear?: () => void;
}

type ParsedKind = 'REQ' | 'RES' | 'ERR' | 'APP' | 'RAW';
type ParsedEntry = {
  id: string;
  kind: ParsedKind;
  level?: 'LOG' | 'INFO' | 'WARN' | 'ERROR' | 'WEBHOOK';
  url?: string;
  method?: string;
  status?: number;
  statusText?: string;
  headers?: any;
  body?: string;
  raw: string;
};

function parseLogLine(line: string): ParsedEntry {
  // [REQ ab12cd] url METHOD\nHeaders: {...}\nBody: ...
  if (line.startsWith("[REQ ")) {
    const id = line.slice(5, 11);
    const urlMatch = line.match(/\] (.+?) (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/);
    const methodMatch = line.match(/ (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/);
    const headersIdx = line.indexOf("Headers:");
    const bodyIdx = line.indexOf("Body:");
    const headersRaw = headersIdx >= 0 ? line.slice(headersIdx + 8, bodyIdx >= 0 ? bodyIdx : undefined).trim() : undefined;
    const bodyRaw = bodyIdx >= 0 ? line.slice(bodyIdx + 5).trim() : undefined;
    let headers: any = undefined;
    try { headers = headersRaw ? JSON.parse(headersRaw) : undefined; } catch { }
    return {
      id,
      kind: 'REQ',
      url: urlMatch ? urlMatch[1] : undefined,
      method: methodMatch ? methodMatch[1] : undefined,
      headers,
      body: bodyRaw,
      raw: line
    };
  }
  // [RES ab12cd] 200 OK url\n<text>
  if (line.startsWith("[RES ")) {
    const id = line.slice(5, 11);
    const afterBracket = line.slice(line.indexOf("]") + 1).trim();
    const statusMatch = afterBracket.match(/^(\d{3})\s+([A-ZA-z]+)/);
    const urlMatch = afterBracket.match(/\d{3}\s+[A-Za-z]+\s+(\S+)/);
    const bodyStart = afterBracket.indexOf("\n");
    const body = bodyStart >= 0 ? afterBracket.slice(bodyStart + 1) : '';
    return {
      id,
      kind: 'RES',
      status: statusMatch ? Number(statusMatch[1]) : undefined,
      statusText: statusMatch ? statusMatch[2] : undefined,
      url: urlMatch ? urlMatch[1] : undefined,
      body,
      raw: line
    };
  }
  // [ERR ab12cd] url\nmessage
  if (line.startsWith("[ERR ")) {
    const id = line.slice(5, 11);
    const afterBracket = line.slice(line.indexOf("]") + 1).trim();
    const firstNl = afterBracket.indexOf("\n");
    const url = firstNl >= 0 ? afterBracket.slice(0, firstNl) : afterBracket;
    const body = firstNl >= 0 ? afterBracket.slice(firstNl + 1) : '';
    return { id, kind: 'ERR', url, body, raw: line };
  }
  // [LOG|INFO|WARN|ERROR timestamp] message ...
  if (/^\[(LOG|INFO|WARN|ERROR)\s/.test(line)) {
    const m = line.match(/^\[(LOG|INFO|WARN|ERROR)\s[^\]]*\]\s*([\s\S]*)$/);
    const level = (m?.[1] as any) || 'LOG';
    const body = m?.[2] || '';
    return { id: Math.random().toString(36).slice(2, 8), kind: 'APP', level, body, raw: line };
  }
  // [WEBHOOK] ...
  if (line.startsWith('[WEBHOOK]')) {
    const body = line.replace(/^\[WEBHOOK\]\s*/, '');
    return { id: Math.random().toString(36).slice(2, 8), kind: 'APP', level: 'WEBHOOK', body, raw: line };
  }
  return { id: Math.random().toString(36).slice(2, 8), kind: 'RAW', raw: line };
}

function tryPrettyJson(text?: string): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed);
    return JSON.stringify(json, null, 2);
  } catch {
    // Try to extract JSON substring
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const json = JSON.parse(trimmed.slice(start, end + 1));
        return JSON.stringify(json, null, 2);
      } catch { }
    }
  }
  return undefined;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ logs, onClose, onClear }) => {
  const { theme } = useContext(ThemeContext);
  const parsed = React.useMemo(() => logs.map(parseLogLine), [logs]);
  // Group by id
  const groups = React.useMemo(() => {
    const map = new Map<string, ParsedEntry[]>();
    parsed.forEach(p => {
      const arr = map.get(p.id) || [];
      arr.push(p);
      map.set(p.id, arr);
    });
    return Array.from(map.entries()).map(([id, items]) => ({ id, items }));
  }, [parsed]);

  // Auto-scroll to bottom when new logs arrive
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const statusColor = (status?: number) => {
    if (status === undefined) return 'text-zinc-300';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  const levelBadge = (level?: ParsedEntry['level']) => {
    const base = 'px-1.5 py-0.5 rounded text-[10px]';
    switch (level) {
      case 'INFO': return <span className={`${base} ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'text-blue-700'}`}>INFO</span>;
      case 'WARN': return <span className={`${base} ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'text-yellow-700'}`}>WARN</span>;
      case 'ERROR': return <span className={`${base} ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'text-red-700'}`}>ERROR</span>;
      case 'WEBHOOK': return <span className={`${base} ${theme === 'dark' ? 'bg-emerald-900/20 text-emerald-400' : 'text-emerald-700'}`}>WEBHOOK</span>;
      default: return <span className={`${base} bg-zinc-800 text-zinc-300`}>LOG</span>;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[720px] max-h-[75vh] bg-black text-zinc-100 border border-zinc-800 rounded-xl shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-black rounded-t-xl">
        <span className="font-bold text-accent flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><text x="3" y="17" fontSize="16" fontFamily="monospace" fill="currentColor">&gt;_</text></svg>
          Console
        </span>
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700" onClick={onClear}>Clear</button>
          <button className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-accent" onClick={onClose}>Close</button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="text-zinc-400">No logs yet.</div>
        ) : (
          <div className="space-y-2">
            {groups.map(({ id, items }) => {
              const req = items.find(i => i.kind === 'REQ');
              const res = items.find(i => i.kind === 'RES');
              const err = items.find(i => i.kind === 'ERR');
              const isNetwork = !!(req || res || err);
              if (isNetwork) {
                const prettyReqBody = tryPrettyJson(req?.body);
                const prettyResBody = tryPrettyJson(res?.body);
                const prettyHeaders = req?.headers ? JSON.stringify(req.headers, null, 2) : undefined;
                return (
                  <div key={id} className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-black flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400">{id}</span>
                      {req?.method && <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px]">{req.method}</span>}
                      <span className="truncate text-xs">{req?.url || res?.url || err?.url}</span>
                      {res?.status !== undefined && (
                        <span className={`ml-auto text-xs ${statusColor(res.status)}`}>{res.status} {res.statusText}</span>
                      )}
                      {err && !res && <span className="ml-auto text-xs text-red-400">Error</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-0">
                      <div className="p-2 border-r border-zinc-800">
                        <div className="text-[10px] text-zinc-400 mb-1">Request</div>
                        {prettyHeaders && (
                          <details>
                            <summary className="cursor-pointer text-[10px] text-zinc-500">Headers</summary>
                            <pre className="whitespace-pre-wrap text-[10px] text-zinc-300">{prettyHeaders}</pre>
                          </details>
                        )}
                        {req?.body && (
                          <details>
                            <summary className="cursor-pointer text-[10px] text-zinc-500">Body</summary>
                            <pre className="whitespace-pre-wrap text-[10px] text-zinc-300">{prettyReqBody || req.body}</pre>
                          </details>
                        )}
                        {!req?.body && !prettyHeaders && <div className="text-[10px] text-zinc-500">—</div>}
                      </div>
                      <div className="p-2">
                        <div className="text-[10px] text-zinc-400 mb-1">Response</div>
                        {res?.body && (
                          <details>
                            <summary className="cursor-pointer text-[10px] text-zinc-500">Body</summary>
                            <pre className="whitespace-pre-wrap text-[10px] text-zinc-300">{prettyResBody || (res.body?.slice(0, 4000) || '')}</pre>
                          </details>
                        )}
                        {err?.body && (
                          <div className="text-red-400 text-[10px] whitespace-pre-wrap">{err.body}</div>
                        )}
                        {!res?.body && !err?.body && <div className="text-[10px] text-zinc-500">—</div>}
                      </div>
                    </div>
                  </div>
                );
              }
              // App/RAW log: single-column compact card
              const entry = items[0];
              return (
                <div key={id} className="border border-zinc-800 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-black flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">{id}</span>
                    {entry.kind === 'APP' ? levelBadge(entry.level) : <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">LOG</span>}
                    <span className="text-xs truncate flex-1">{(entry.body && entry.body.split('\n')[0]) || entry.raw}</span>
                  </div>
                  {entry.body && entry.body.includes('\n') && (
                    <div className="p-2">
                      <details>
                        <summary className="cursor-pointer text-[10px] text-zinc-500">Details</summary>
                        <pre className="whitespace-pre-wrap text-[10px] text-zinc-300">{entry.body}</pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

