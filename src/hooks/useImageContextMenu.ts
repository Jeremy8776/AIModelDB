/**
 * Image Context Menu Hook
 * 
 * Manages a custom context menu for images with copy and save functionality.
 */

import { useState, useCallback, useEffect } from 'react';

export interface ContextMenuState {
    /** X coordinate of menu */
    x: number;
    /** Y coordinate of menu */
    y: number;
    /** URL of the image being acted upon */
    imageUrl: string;
}

/**
 * Hook for managing image context menu state and actions
 */
export function useImageContextMenu() {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    /**
     * Show context menu at the specified position for the given image URL
     */
    const handleImageContextMenu = useCallback((e: React.MouseEvent, imageUrl: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, imageUrl });
    }, []);

    /**
     * Copy image to clipboard
     * For videos, copies the URL text; for images, copies the blob
     */
    const handleCopyImage = useCallback(async (url: string) => {
        try {
            // Check if it's a video or incompatible type
            const isVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');

            if (isVideo) {
                // For videos, just copy the URL text
                await navigator.clipboard.writeText(url);
            } else {
                // For images, try to copy the visual blob
                const response = await fetch(url);
                const blob = await response.blob();

                // Safari/Firefox have stricter ClipboardItem requirements, need matching mimetype
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
            }
            setContextMenu(null);
        } catch (err) {
            console.warn('Failed to copy image blob, falling back to URL:', err);
            // Fallback: just copy the URL
            try {
                await navigator.clipboard.writeText(url);
                setContextMenu(null);
            } catch (e) {
                console.error('Failed to copy URL:', e);
            }
        }
    }, []);

    /**
     * Save image to disk via download
     */
    const handleSaveImage = useCallback(async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            // Try to get filename from url, else default
            const filename = url.split('/').pop()?.split('?')[0] || `image-${Date.now()}.jpg`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            setContextMenu(null);
        } catch (err) {
            console.error('Failed to save image:', err);
        }
    }, []);

    /**
     * Close the context menu
     */
    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    return {
        contextMenu,
        handleImageContextMenu,
        handleCopyImage,
        handleSaveImage,
        closeContextMenu,
    };
}
