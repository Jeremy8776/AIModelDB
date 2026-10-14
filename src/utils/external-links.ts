/**
 * True only for http(s) URLs. Guards the non-Electron `window.open` fallback
 * against `javascript:` / `data:` / `file:` schemes in untrusted source
 * metadata (repo / homepage / website URLs). In Electron the main process
 * already enforces this via validateExternalUrl before shell.openExternal.
 */
export function isHttpUrl(url: string): boolean {
    try {
        const protocol = new URL(url).protocol;
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

/**
 * Value for an `href` attribute built from untrusted data: the URL when it is
 * http(s), otherwise undefined so no `javascript:` / `data:` link is rendered.
 */
export function safeHref(url: string | null | undefined): string | undefined {
    return url && isHttpUrl(url) ? url : undefined;
}

/**
 * Open URL in user's default browser
 * @param url URL to open
 */
export function openExternal(url: string) {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url); // main validates the scheme
    } else if (isHttpUrl(url)) {
        // Fallback for non-Electron environments — http(s) only
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Handle click event for external links
 * @param e Click event
 * @param url URL to open
 */
export function handleExternalLink(e: React.MouseEvent, url: string) {
    e.preventDefault();
    openExternal(url);
}
