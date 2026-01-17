/**
 * Debounce Utility
 * 
 * Provides debouncing functionality for input handling to prevent
 * excessive re-renders and API calls during rapid user input.
 */

/**
 * Creates a debounced version of a function that delays invoking
 * until after `wait` milliseconds have elapsed since the last call.
 * 
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function debounced(...args: Parameters<T>) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * Creates a debounced function that can be cancelled.
 * 
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns An object with the debounced function and a cancel method
 */
export function debounceCancellable<T extends (...args: any[]) => any>(
    fn: T,
    wait: number
): { call: (...args: Parameters<T>) => void; cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return {
        call(...args: Parameters<T>) {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                fn(...args);
                timeoutId = null;
            }, wait);
        },
        cancel() {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }
    };
}

/**
 * Throttle function - allows function to be called at most once
 * every `wait` milliseconds.
 * 
 * @param fn - The function to throttle
 * @param wait - The minimum time between calls in milliseconds
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    wait: number
): (...args: Parameters<T>) => void {
    let lastTime = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function throttled(...args: Parameters<T>) {
        const now = Date.now();

        if (now - lastTime >= wait) {
            fn(...args);
            lastTime = now;
        } else if (timeoutId === null) {
            // Schedule a trailing call
            timeoutId = setTimeout(() => {
                fn(...args);
                lastTime = Date.now();
                timeoutId = null;
            }, wait - (now - lastTime));
        }
    };
}
