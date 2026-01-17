/**
 * License Hover Component
 * 
 * Displays a license name with a tooltip showing license details.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Lightweight license explainer map
 * Maps common license names to brief descriptions
 */
export const LICENSE_TIPS: Record<string, string> = {
    'MIT': 'OSI-approved permissive license. Commercial use allowed, attribution required.',
    'Apache-2.0': 'OSI-approved permissive license. Patent grant included. Commercial use allowed.',
    'BSD': 'OSI-approved permissive family; details vary. Commercial use allowed.',
    'GPL': 'Copyleft license. Derivatives must be licensed under GPL; commercial allowed with conditions.',
    'AGPL': 'Strong copyleft for network services. Derivatives must be AGPL.',
    'LGPL': 'Weak copyleft. Linking allowed under certain conditions.',
    'CC-BY-NC': 'Creative Commons Non-Commercial. Commercial use not allowed without permission.',
    'CC0': 'Public domain dedication. Free for any use without attribution.',
    'OpenRAIL': 'Responsible AI license. Use restrictions may apply; review variant.',
    'Proprietary': 'Vendor-specific license. Review terms for commercial use and redistribution.',
};

interface LicenseHoverProps {
    /** License name to display */
    name?: string | null;
}

/**
 * License name with hover tooltip showing license details
 */
export function LicenseHover({ name }: LicenseHoverProps) {
    const { t, i18n } = useTranslation();
    const label = name || t('common.unknown');

    // Check if a specific tip exists for this license before looking it up
    const tipKey = name ? `detailPanel.licenseTips.${name}` : null;
    const hasSpecificTip = tipKey && i18n.exists(tipKey);
    const tip = hasSpecificTip ? t(tipKey) : t('detailPanel.licenseTipDefault');

    return (
        <span className="inline-flex items-center gap-1" title={tip}>
            {label}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" className="opacity-70">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="7" r="1" fill="currentColor" />
            </svg>
        </span>
    );
}
