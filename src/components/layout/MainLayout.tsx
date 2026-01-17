/**
 * Main Layout Component
 * 
 * Primary layout component that handles the positioning of the sidebar,
 * main content area, detail panel, and floating toolbar.
 * 
 * Uses composition (slots) to remain agnostic of content.
 * 
 * @module MainLayout
 */

import React from 'react';

/**
 * Props for the MainLayout component
 */
export interface MainLayoutProps {
    sidebar: React.ReactNode;
    content: React.ReactNode;
    detailPanel?: React.ReactNode;
    toolbar?: React.ReactNode;
    className?: string;
}

/**
 * Main layout component composing filters, table, and detail panel.
 * 
 * Features:
 * - Three-column layout (filters, table, detail panel)
 * - Responsive design (stacks on mobile)
 * - Slot-based composition
 * 
 * @param props - MainLayout component props
 * @returns JSX.Element
 */
export function MainLayout({
    sidebar,
    content,
    detailPanel,
    toolbar,
    className = ""
}: MainLayoutProps) {
    return (
        <main className={`w-full px-4 pb-4 min-h-[calc(100vh-120px)] ${className}`}>
            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left Filters Panel */}
                <div className="flex-shrink-0">
                    {sidebar}
                </div>

                {/* Main Content Area */}
                <div className={`flex-1 transition-all duration-500 ease-out pl-0 relative ${detailPanel ? 'lg:w-3/5' : 'w-full'}`}>
                    {content}
                    {toolbar}
                </div>

                {/* Detail Panel */}
                {detailPanel && (
                    <div className="lg:w-2/5 relative transition-all duration-500 ease-out lg:sticky lg:top-[5.5rem] lg:self-start">
                        {detailPanel}
                    </div>
                )}
            </div>
        </main>
    );
}
