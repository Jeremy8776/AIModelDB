import { Domain, LicenseInfo, Model, RiskScore } from "../types";

// Formatting utilities
export const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};

export const kfmt = (n?: number | null) =>
  n == null ? "—" :
    n >= 1_000_000 ? (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + "m" :
      n >= 1_000 ? (n / 1_000).toFixed(n % 1_000 ? 1 : 0) + "k" :
        String(n);

export const cleanId = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_');

// Normalize model names for matching across small formatting differences
export function normalizeNameForMatch(name?: string | null): string {
  if (!name) return '';
  let s = String(name).toLowerCase();
  // Unwrap bracket qualifiers: "FLUX.1 [pro]" -> "flux.1 pro"
  s = s.replace(/\[([^\]]+)\]/g, ' $1 ');
  // Collapse punctuation and dots/hyphens/underscores into spaces
  s = s.replace(/[^a-z0-9]+/g, ' ');
  // Trim and collapse spaces
  s = s.trim().replace(/\s+/g, ' ');
  return s;
}

// Collection utilities
export const dedupe = (items: Model[]) => {
  const map = new Map<string, Model>();
  for (const m of items) {
    if (!m) continue; // Skip null/undefined items
    const nameKeyRaw = m?.name ? String(m.name) : (m.id ? String(m.id) : "");
    const nameKey = normalizeNameForMatch(nameKeyRaw) || nameKeyRaw.toLowerCase();
    const providerKey = (m.provider ? String(m.provider) : '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${providerKey}::${nameKey}`;
    if (!map.has(key)) map.set(key, m);
  }
  return Array.from(map.values());
};

// CSV/TSV conversion
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = String(Array.isArray(v) ? v.join(";") : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const out = [headers.join(",")];
  for (const r of rows) {
    out.push(headers.map(h => esc(r[h])).join(","));
  }
  return out.join("\n");
}

export function parseCSV(text: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const rows: string[][] = [];
  let cur = "", row: string[] = [];
  let q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') {
        row.push(cur);
        cur = '';
      } else if (c === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (c === '\r') {
        // ignore
      } else cur += c;
    }
  }

  row.push(cur);
  rows.push(row);

  if (!rows.length) return out;

  const head = rows[0];
  for (const r of rows.slice(1)) {
    if (!r.some(x => x && x.trim().length)) continue;
    const obj: Record<string, string> = {};
    head.forEach((h, i) => obj[h.trim()] = r[i] ?? "");
    out.push(obj);
  }

  return out;
}

export function parseTSV(text: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const rows: string[][] = [];
  let cur = "", row: string[] = [];
  let q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === '\t') {
        row.push(cur);
        cur = '';
      } else if (c === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (c === '\r') {
        // ignore
      } else cur += c;
    }
  }

  row.push(cur);
  rows.push(row);

  if (!rows.length) return out;

  const head = rows[0];
  for (const r of rows.slice(1)) {
    if (!r.some(x => x && x.trim().length)) continue;
    const obj: Record<string, string> = {};
    head.forEach((h, i) => obj[h.trim()] = r[i] ?? "");
    out.push(obj);
  }

  return out;
}

// Data normalization for imports
export function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return undefined;
}

export function mapDomain(v?: unknown, sheetName?: string): Domain {
  const s = String(v || sheetName || '').toLowerCase();
  if (s.includes('vlm') || s.includes('vision') || s.includes('multimodal')) return 'VLM';
  if (s.includes('llm') || s.includes('language') || s.includes('chat')) return 'LLM';
  if (s.includes('text-to-image') || s.includes('image')) return 'ImageGen';
  if (s.includes('video')) return 'VideoGen';
  if (s.includes('audio') || s.includes('asr') || s.includes('speech') || s.includes('tts')) return s.includes('tts') ? 'TTS' : 'ASR';
  if (s.includes('detect') || s.includes('segment')) return 'VLM';
  if (s.includes('3d') || s.includes('mesh') || s.includes('nerf')) return '3D';
  if (s.includes('world') || s.includes('sim')) return 'World/Sim';
  return 'Other';
}

export function normalizeRows(rows: any[], sheetName?: string) {
  return rows.map(r => {
    const o: any = { ...r };
    if (!o.name) o.name = pick(r, ["Model Name", "name", "Model"]);
    if (!o.provider) o.provider = pick(r, ["Company/Developer", "Company", "Developer", "Author", "Provider", "Org"]);
    if (!o.domain) o.domain = pick(r, ["Model Type", "Type", "Domain"]);
    const sheet = (r.__sheetName || sheetName || '') as string;
    o.domain = o.domain || mapDomain(o.domain, sheet);
    if (!o.url) o.url = pick(r, ["Repository/URL", "URL", "Homepage", "Website", "Link"]);
    if (!o.repo) o.repo = pick(r, ["Repository", "Repo", "GitHub", "Git"]);
    if (!o.license_name) o.license_name = pick(r, ["License", "License Name"]);
    if (o.commercial == null) {
      const cu = String(pick(r, ["Commercial Use", "Commercial"]) || '').toLowerCase();
      if (cu) o.commercial = cu.includes('yes') || cu.includes('allowed');
    }
    if (!o.release_date) o.release_date = pick(r, ["Release Date", "Released", "Date"]);
    if (!o.parameters) o.parameters = pick(r, ["Parameters", "Params", "Size"]);
    if (!o.tags) {
      const kf = pick(r, ["Key Features", "Features", "Notes"]);
      if (kf != null) o.tags = String(kf).split(/[,;]|\s·\s/).map((x: any) => String(x).trim()).filter(Boolean);
    }
    return o;
  });
}

// JSON parsing
export function safeJsonFromText(s: string) {
  try {
    return JSON.parse(s);
  } catch { }

  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) {
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch { }
  }

  const aa = s.indexOf('['), bb = s.lastIndexOf(']');
  if (aa !== -1 && bb !== -1 && bb > aa) {
    try {
      return JSON.parse(s.slice(aa, bb + 1));
    } catch { }
  }

  return null;
}

// Risk analysis utilities
export function riskScore(m: Model): RiskScore {
  const L = m.license;
  if (!L) return { level: "Amber", reason: "No license info" };
  if (L.type === "Non-Commercial") return { level: "Red", reason: "Non‑commercial license" };
  if (L.copyleft) return { level: "Amber", reason: "Copyleft obligations (distribution triggers)" };
  if (L.type === "Proprietary" || L.type === "Custom") return L.commercial_use ?
    { level: "Amber", reason: "Proprietary/custom terms — review T&Cs" } :
    { level: "Red", reason: "No commercial rights" };
  return { level: "Green", reason: L.attribution_required ? "Commercial OK + attribution" : "Commercial OK" };
}

export function riskExplainer(m: Model): string[] {
  const L = m.license, out: string[] = [];
  const r = riskScore(m);
  out.push(`Risk level: ${r.level} — ${r.reason}`);

  if (!L) return out;

  if (L.type === "OSI") {
    if (L.attribution_required) out.push("Attribution required where practical.");
    out.push("No copyleft — private deployments unaffected.");
  }

  if (L.copyleft) out.push("Copyleft: modify+distribute ⇒ share source (AGPL covers network use).");
  if (L.type === "Custom") out.push("Custom terms: check vendor restrictions (biometric/competitive/etc).");
  if (L.type === "Proprietary") out.push("Proprietary/API terms: review indemnity & training provenance.");
  if (m.indemnity && m.indemnity !== "None") out.push(`Indemnity: ${m.indemnity} — vendor IP shield may apply.`);
  if (m.usage_restrictions?.length) out.push(`Usage restrictions: ${m.usage_restrictions.join(", ")}.`);
  if (L.url) out.push("License → " + L.url);

  return out;
}

export function cleanModelDescription(desc?: string | null): string {
  if (!desc) return '';
  let s = desc;

  // 1. Remove Markdown images
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // 2. Replace Markdown links with text: [text](url) -> text
  // Handle cases where link text is empty or missing
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Remove header markers (start of line or after newline)
  s = s.replace(/(^|\n)#+\s+/g, '$1');

  // 4. Remove bold/italic
  s = s.replace(/(\*\*|__)(.*?)\1/g, '$2');
  s = s.replace(/(\*|_)(.*?)\1/g, '$2');

  // 5. Remove code blocks
  s = s.replace(/```[\s\S]*?```/g, '');
  s = s.replace(/`([^`]+)`/g, '$1');

  // 6. Fix "Key: Value" formatting if it's run-on
  // Often seen: "Subject: Photography Input Type: Images" -> "Subject: Photography\nInput Type: Images"
  // Heuristic: Look for " Key: " preceded by a word character but not a newline
  s = s.replace(/([a-zA-Z0-9])\s+([A-Z][a-zA-Z\s]+:)/g, '$1\n$2');

  // 7. Clean up multiple spaces/newlines
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
