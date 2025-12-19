/**
 * Open URL in user's default browser
 * @param url URL to open
 */
export function openExternal(url: string) {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
    } else {
        // Fallback for non-Electron environments
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
