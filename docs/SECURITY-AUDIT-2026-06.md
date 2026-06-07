# Security Audit — AI Model DB (2026-06)

Read-only audit of data ingestion from untrusted third-party sources.
Threat model: **every byte from any external source is attacker-controlled.**

**Overall posture:** Electron shell is hardened above average — `contextIsolation: true`,
`nodeIntegration: false`, preload allowlist, SSRF host allowlist with private-IP blocking,
header allowlist, zero `dangerouslySetInnerHTML`/`eval`/`child_process` in the renderer.
React JSX auto-escaping neutralizes classic stored-XSS-via-text. Weak points concentrate in
(1) the **MCP/Skills ingestion path** (lacks the Zod validation + field-whitelisting the Models
path has) and (2) a few **client-side `fetch`/render sinks** that bypass the main-process allowlist.

> Status legend: ☐ open · ☑ fixed during integration

---

## CRITICAL

### ☐ C1. Prototype pollution via `editedFields` in MCP/Skills merge (persisted + remote-reachable)
`src/hooks/useMCPServers.ts:101-106`, `src/hooks/useSkills.ts:69-72`
- `editedFields` (freeform string[]) is JSON-parsed from localStorage with no validation AND carried on every incoming record. Loop does `merged[field] = existing[field]` over attacker-named keys (`__proto__`/`constructor`) and can force-copy identity/trust fields. Result is persisted → durable.
- **Fix:** skip `__proto__`/`constructor`/`prototype`; constrain `editedFields` to a `z.enum` of known fields; use `Object.create(null)`/`Map` for dynamic writes.

### ☐ C2. MCP/Skills entities merged with no schema validation; `_meta: raw._meta` stores raw attacker object
`official-registry.ts:187`, `npm-registry.ts:116`, `github-topics.ts:106`, `skills/plugins-marketplace.ts:99`; persisted `useMCPServers.ts:67`
- Models have Zod (`ModelSchema`) + `toNormalizedModel` whitelist; MCP/Skills have neither. Raw `_meta` (documented `[key:string]: unknown`) flows to state, storage, export. Prime carrier for `__proto__` payloads + unbounded-size DoS.
- **Fix:** add `MCPServerSchema`/`SkillSchema` (Zod, `.strip()`), `safeParse` at fetch seam AND localStorage load; replace `_meta: raw._meta` with explicit pick (SkillsDetailPanel only reads `author.name`, `version`, `homepage`).

---

## HIGH

### ☐ H1. Zod schemas use `.passthrough()` everywhere — validation doesn't strip `__proto__`/`constructor`
`src/services/api/schemas.ts:26,36,48,90,115,140,154,168,184`; `validation.ts:264-268` `coerceToModel` does `{ id, name, ...obj }`
- **Fix:** use `.strip()` (Zod default); build patched object from fixed key list / `Object.create(null)`; guard/delete `__proto__` before spreads.

### ☐ H2. Untrusted image/video URLs rendered into `<img src>`/`<video src>` with no scheme allowlist
`DetailPanel.tsx:771-773`, `GalleryImage.tsx:45,119-121,139-146`; URLs scraped from remote README at `huggingface-details.ts:115-125` (suffix check `.png` ≠ scheme check; `javascript:`/`data:...#.png` pass)
- **Fix:** central `isSafeImageUrl` (require `https:`, reject `javascript:`/`data:`/`blob:`/`file:`) before any `src`.

### ☐ H3. Client-side `fetch()` on untrusted URLs bypasses the SSRF allowlist
`useImageContextMenu.ts:54,79`, `ImportModal.tsx:105,113`, `web-scraper.ts:29,52,65`
- Renderer `fetch` has no host allowlist / private-IP block → SSRF to `127.0.0.1:11434`, `169.254.169.254`, intranet.
- **Fix:** route all renderer outbound through validated IPC proxy / shared `safeFetch`; for import-from-URL block private/loopback + non-http(s).

### ☐ H4. `/scrape` SSRF: allowlist checks hostname then `fetch` follows redirects off-allowlist
`server/index.js:328-338`, `:177` (`followRedirects: true`)
- Allowlisted host can 302 → `169.254.169.254`/`127.0.0.1`.
- **Fix:** `redirect: 'manual'`, re-validate `Location` host per hop.

### ☐ H5. DNS-rebinding gap — allowlisted hostnames not pinned, private IPs only blocked for literal-IP hosts
`electron/security.js:17-37,49-51`
- **Fix:** resolve host once, reject private/loopback/link-local (incl. `::ffff:127.0.0.1`, `0.0.0.0`), connect to pinned IP with original Host. At minimum document residual risk.

---

## MEDIUM

- ☐ **M1.** ReDoS in `cleanModelDescription` over untrusted descriptions — `format.ts:343` `(\*|_)(.*?)\1`, `:352` `[a-zA-Z\s]+\s+`. Cap length (5–10 KB), de-fang patterns, run in worker.
- ☐ **M2.** ReDoS + unbounded body in server `/scrape` regexes — `server/index.js:348-492`. Cap fetched body (~1–2 MB), bound text, use `{1,80}` quantifiers.
- ☐ **M3.** No pagination cap on MCP registry sync — `official-registry.ts:230` (`maxServers = Infinity`); callers pass none. Endless `nextCursor` → memory/disk DoS. Pass `maxServers` (~10–20k) + max pages.
- ☐ **M4.** `coerceToModel` `Date.now()`/`Math.random()` IDs + raw spread — `validation.ts:264-272`. Defeats dedupe; whitelist fields, derive deterministic IDs.
- ☐ **M5.** `proxy-image` trusts remote `Content-Type` into `data:` URL — `main.js:406-409`. Reject `text/html`/`image/svg+xml`; image MIME allowlist.

## LOW
- ☐ **L1.** Right-click "Save Image As" downloads any `srcURL` incl. data: — `main.js:92-98`. Validate scheme/host.
- ☐ **L2.** Secrets: dev logs full proxied URL (`main.js:359`); server forwards `x-api-key` to every route / `Authorization` to any `*openai*` path (`server/index.js:187-199`). Scope creds to owning upstream; don't log URLs. (Electron path OK.)
- ☐ **L3.** `safeStorage` decrypt accepts arbitrary hex, no context binding — `main.js:333-346`.
- ☐ **L4.** `parseCSV/TSV` unbounded input (OOM) — `format.ts:129-221`, `ImportModal.tsx:144`. Cap input length.
- ☐ **L5.** Skills `requires.*` assume string[] — `SkillsDetailPanel.tsx:259-282`. Validate via schema (C2).

---

## Hardening checklist for NEW source fetchers (apply to all ~80 upcoming sources)

1. **Validate every response with a strict Zod schema** using `.strip()` (NOT `.passthrough()`). (C2, H1)
2. **Never spread raw remote objects** into a canonical record — whitelist fields like `toNormalizedModel`. No `{...raw}`, no `_meta: raw._meta`. (C2, M4, L5)
3. **Constrain `editedFields`/any dynamic-key write** to a fixed enum; skip `__proto__`/`constructor`/`prototype`; use `Object.create(null)`/`Map`. (C1)
4. **All outbound calls go through the validated main-process proxy**; add new host to `ALLOWED_PROXY_HOSTS`/`ALLOWED_IMAGE_HOSTS` (exact-host, https-only). Never renderer-`fetch` an attacker URL. (H3, H4)
5. **Cap pagination, total records, and per-response body size.** Abort on cursor loops. (M2, M3, L4)
6. **Treat every URL field as a scheme/host check target** — require `https:`, reject `javascript:`/`data:`/`blob:`/`file:` before any `src`/`openExternal`/`downloadURL`/copy. Suffix checks ≠ scheme checks. (H2, L1)
7. **Keep all display text in JSX `{}`** (auto-escaped); no `dangerouslySetInnerHTML`; strip/sanitize + length-cap any markdown/HTML. (M1, XSS)
8. **Bound + de-fang every regex over remote strings** — slice to max length; avoid `(.*?)\1` / adjacent quantifiers; escape interpolated substrings before `new RegExp`. (M1, M2)
9. **Scope credentials to their owning upstream**; never forward a header to a different host; never log full URLs/header values. (L2)
10. **Assume persisted blobs are hostile** — JSON from localStorage/IndexedDB/imported files must pass the same schema as a live fetch before entering state/merge. (C1, C2)

**Exemplars to copy:** `src/utils/importNormalization.ts` (field whitelisting), `electron/security.js` (allowlist + private-IP block).
**Anti-patterns:** `useMCPServers.ts:101-106` / `useSkills.ts:69-72` (dynamic writes), `official-registry.ts:187` (`_meta: raw._meta`), `.passthrough()` in `schemas.ts`.
