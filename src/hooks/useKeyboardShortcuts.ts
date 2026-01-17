import { useEffect, RefObject } from 'react';

interface KeyboardShortcutsOptions {
    searchRef: RefObject<HTMLInputElement>;
    onRefresh: () => void;
    onShowShortcuts?: () => void;
    onOpenSettings?: () => void;
}

/**
 * Hook for managing keyboard shortcuts in the AIModelDB component.
 * 
 * Supported shortcuts:
 * - "/" or Ctrl+F - Focus the search input
 * - "r" or Ctrl+R - Trigger a refresh/sync operation
 * - "?" - Show keyboard shortcuts help
 * - Ctrl+, - Open settings
 * 
 * @param searchRef - Reference to the search input element
 * @param onRefresh - Callback function to execute when refresh shortcut is triggered
 */
export function useKeyboardShortcuts(
    searchRef: RefObject<HTMLInputElement>,
    onRefresh: () => void,
    options?: { onShowShortcuts?: () => void; onOpenSettings?: () => void }
): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Ignore shortcuts if user is typing in an input/textarea
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

            // "?" key - Show shortcuts help (works even in inputs with Shift held)
            if (e.key === "?" && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                options?.onShowShortcuts?.();
                return;
            }

            // Escape - blur current element
            if (e.key === "Escape") {
                (document.activeElement as HTMLElement)?.blur?.();
            }

            if (isInput) return;

            // "/" key or Ctrl+F - Focus search input
            if (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "f")) {
                e.preventDefault();
                searchRef.current?.focus();
            }

            // "r" key or Ctrl+R - Trigger refresh
            if (e.key.toLowerCase() === "r" && !e.ctrlKey) {
                e.preventDefault();
                onRefresh();
            }

            // Ctrl+, - Open settings
            if (e.ctrlKey && e.key === ",") {
                e.preventDefault();
                options?.onOpenSettings?.();
            }
        };

        // Add event listener
        window.addEventListener("keydown", onKey);

        // Cleanup on unmount
        return () => window.removeEventListener("keydown", onKey);
    }, [searchRef, onRefresh, options]);
}
