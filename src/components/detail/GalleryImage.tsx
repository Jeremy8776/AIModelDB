/**
 * Gallery Image Component
 * 
 * Displays an image or video in a gallery grid with:
 * - Lazy loading
 * - Proxy support for CDN images
 * - NSFW overlay when flagged
 * - Loading state animation
 */

import React, { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';

interface GalleryImageProps {
    /** Image or video source URL */
    src: string;
    /** Alt text for the image */
    alt: string;
    /** Click handler */
    onClick: () => void;
    /** Context menu handler */
    onContextMenu: (e: React.MouseEvent) => void;
    /** Whether this image is flagged as NSFW */
    isFlagged?: boolean;
    /** Whether to hide NSFW content (show overlay) */
    hideNSFW?: boolean;
}

/**
 * Gallery image component with proxy support and NSFW overlay
 */
export function GalleryImage({
    src,
    alt,
    onClick,
    onContextMenu,
    isFlagged,
    hideNSFW = true
}: GalleryImageProps) {
    const [error, setError] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if this is a video file
    const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov');

    useEffect(() => {
        let cancelled = false;

        const loadImage = async () => {
            // For videos, just use the direct URL (don't proxy)
            if (isVideo) {
                if (!cancelled) {
                    setImageSrc(src);
                    setLoading(false);
                }
                return;
            }

            // If Electron is available and this looks like a CDN image, proxy it
            if (window.electronAPI?.proxyImage && (
                src.includes('imagecache.civitai.com') ||
                src.includes('image.civitai.com') ||
                src.includes('huggingface.co/')
            )) {
                try {
                    const result = await window.electronAPI.proxyImage(src);
                    if (!cancelled && result.success && result.dataUrl) {
                        setImageSrc(result.dataUrl);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.warn('[GalleryImage] Proxy failed, falling back to direct URL');
                }
            }

            // Fallback: use direct URL
            if (!cancelled) {
                setImageSrc(src);
                setLoading(false);
            }
        };

        loadImage();
        return () => { cancelled = true; };
    }, [src, isVideo]);

    if (error) {
        return null;
    }

    if (loading || !imageSrc) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
            </div>
        );
    }

    // NSFW overlay component
    const NSFWOverlay = () => (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/95">
            <EyeOff className="size-8 text-zinc-500" />
        </div>
    );

    // Render video or image based on file type
    if (isVideo) {
        return (
            <div
                className="relative w-full h-full group/image"
                onContextMenu={onContextMenu}
            >
                <video
                    src={imageSrc}
                    className="w-full h-full object-cover cursor-pointer"
                    muted
                    loop
                    autoPlay
                    playsInline
                    onClick={onClick}
                    onError={() => setError(true)}
                />
                {isFlagged && hideNSFW && <NSFWOverlay />}
            </div>
        );
    }

    return (
        <div
            className="relative w-full h-full group/image"
            onContextMenu={onContextMenu}
        >
            <img
                src={imageSrc}
                alt={alt}
                className={`w-full h-full object-cover cursor-pointer ${isFlagged ? '' : 'transition-transform group-hover:scale-105'}`}
                loading="lazy"
                onError={() => setError(true)}
                onClick={onClick}
            />
            {isFlagged && hideNSFW && <NSFWOverlay />}
        </div>
    );
}
