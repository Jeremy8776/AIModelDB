/**
 * Console Button Component
 * 
 * Floating button to open the terminal console for debugging.
 * Hidden when console is already open.
 * 
 * @module ConsoleButton
 */

import React from "react";

/**
 * Props for the ConsoleButton component
 */
export interface ConsoleButtonProps {
    showConsole: boolean;
    onShowConsole: () => void;
    theme?: "light" | "dark";
}

/**
 * Console button component for opening the debug console.
 * 
 * Features:
 * - Fixed position at bottom right
 * - Hidden when console is open
 * - Terminal icon with ">_" symbol
 * - Hover effect
 * 
 * @param props - ConsoleButton component props
 * @returns JSX.Element or null if console is open
 */
export function ConsoleButton({ showConsole, onShowConsole, theme = "dark" }: ConsoleButtonProps) {
    if (showConsole) {
        return null;
    }

    return (
        <button
            className="console-toggle-button fixed bottom-4 right-4 z-50 flex items-center gap-2 font-semibold text-base px-3 py-2 transition-colors duration-150"
            style={{
                background: 'var(--bgCard)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '8px'
            }}
            onClick={onShowConsole}
            title="Show API Console"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <text x="3" y="17" fontSize="16" fontFamily="monospace" fill="currentColor">&gt;_</text>
            </svg>
            <span>Console</span>
        </button>
    );
}
