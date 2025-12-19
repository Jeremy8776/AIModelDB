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
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 text-white hover:text-accent font-semibold text-base p-0 m-0 bg-transparent border-none shadow-none transition-colors duration-150"
            style={{ background: 'none', border: 'none' }}
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
