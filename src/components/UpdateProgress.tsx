/**
 * Update Progress Component
 * 
 * Floating toast-like component that displays app update progress.
 * Shows different states: checking, available, downloading, downloaded, error.
 * Integrates with UpdateContext for real update state.
 * 
 * @module UpdateProgress
 */

import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, X, Loader2, Sparkles } from 'lucide-react';
import { useUpdate } from '../context/UpdateContext';

interface UpdateProgressProps {
    /** Whether to show the component */
    show: boolean;
    /** Callback when user dismisses the notification */
    onDismiss: () => void;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export function UpdateProgress({ show, onDismiss }: UpdateProgressProps) {
    const {
        checking,
        updateAvailable,
        updateVersion,
        downloadProgress,
        updateDownloaded,
        error,
        downloadUpdate,
        installUpdate,
    } = useUpdate();

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadSpeed, setDownloadSpeed] = useState<string | null>(null);
    const [lastProgress, setLastProgress] = useState(0);
    const [lastTime, setLastTime] = useState(Date.now());

    // Determine current status
    const getStatus = (): UpdateStatus => {
        if (error) return 'error';
        if (updateDownloaded) return 'downloaded';
        if (downloadProgress !== null && downloadProgress > 0) return 'downloading';
        if (updateAvailable) return 'available';
        if (checking) return 'checking';
        return 'idle';
    };

    const status = getStatus();

    // Calculate download speed
    useEffect(() => {
        if (downloadProgress !== null && downloadProgress > lastProgress) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000; // seconds
            const progressDiff = downloadProgress - lastProgress;

            if (timeDiff > 0 && progressDiff > 0) {
                // Rough estimate: assume ~100MB update
                const mbPerSecond = (progressDiff / 100) * 100 / timeDiff;
                if (mbPerSecond >= 1) {
                    setDownloadSpeed(`${mbPerSecond.toFixed(1)} MB/s`);
                } else {
                    setDownloadSpeed(`${(mbPerSecond * 1024).toFixed(0)} KB/s`);
                }
            }

            setLastProgress(downloadProgress);
            setLastTime(now);
        }
    }, [downloadProgress]);

    // Reset when starting download
    useEffect(() => {
        if (status === 'downloading' && !isDownloading) {
            setIsDownloading(true);
            setLastProgress(0);
            setLastTime(Date.now());
        } else if (status !== 'downloading') {
            setIsDownloading(false);
        }
    }, [status]);

    if (!show || status === 'idle') return null;

    const handleDownload = () => {
        downloadUpdate();
    };

    const handleInstall = () => {
        installUpdate();
    };

    // Status-specific content
    const renderContent = () => {
        switch (status) {
            case 'checking':
                return (
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-500/20">
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Checking for updates...</p>
                            <p className="text-xs text-zinc-400">Please wait</p>
                        </div>
                    </div>
                );

            case 'available':
                return (
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-emerald-500/20">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Update available!</p>
                            <p className="text-xs text-zinc-400">Version {updateVersion} is ready to download</p>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download
                        </button>
                    </div>
                );

            case 'downloading':
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-blue-500/20">
                                <Download className="w-5 h-5 text-blue-400 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm">Downloading update...</p>
                                <p className="text-xs text-zinc-400">
                                    {Math.round(downloadProgress || 0)}% complete
                                    {downloadSpeed && ` • ${downloadSpeed}`}
                                </p>
                            </div>
                        </div>
                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${downloadProgress || 0}%` }}
                            />
                        </div>
                    </div>
                );

            case 'downloaded':
                return (
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-emerald-500/20">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Update ready!</p>
                            <p className="text-xs text-zinc-400">Restart to complete the installation</p>
                        </div>
                        <button
                            onClick={handleInstall}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Restart Now
                        </button>
                    </div>
                );

            case 'error':
                // Check for signature errors which require manual update
                const isSignatureError = error && (
                    error.includes('signed') ||
                    error.includes('signature') ||
                    error.includes('Code signature')
                );

                if (isSignatureError) {
                    return (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-amber-500/20">
                                    <AlertCircle className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Action Required</p>
                                    <p className="text-xs text-zinc-400">
                                        Signature change detected. You must update manually this one time.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    window.electronAPI?.openExternal('https://github.com/Jeremy8776/AIModelDB/releases/latest');
                                }}
                                className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-black transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Installer Manually
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Update failed</p>
                            <p className="text-xs text-zinc-400 truncate max-w-[200px]" title={error || undefined}>
                                {error || 'An error occurred'}
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
            <div className="relative bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[400px]">
                {/* Close button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-200"
                >
                    <X className="w-4 h-4" />
                </button>

                {renderContent()}
            </div>
        </div>
    );
}
