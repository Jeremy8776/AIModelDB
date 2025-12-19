import { useEffect, RefObject } from 'react';

/**
 * Hook for managing keyboard shortcuts in the AIModelDBPro component.
 * 
 * Supported shortcuts:
 * - "/" - Focus the search input
 * - "r" - Trigger a refresh/sync operation
 * 
 * @param searchRef - Reference to the search input element
 * @param onRefresh - Callback function to execute when refresh shortcut is triggered
 */
export function useKeyboardShortcuts(
    searchRef: RefObject<HTMLInputElement>,
    onRefresh: () => void
): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // "/" key - Focus search input
            if (e.key === "/") {
                e.preventDefault();
                searchRef.current?.focus();
            }

            // "r" key - Trigger refresh
            if (e.key.toLowerCase() === "r") {
                e.preventDefault();
                onRefresh();
            }
        };

        // Add event listener
        window.addEventListener("keydown", onKey);

        // Cleanup on unmount
        return () => window.removeEventListener("keydown", onKey);
    }, [searchRef, onRefresh]);
}
