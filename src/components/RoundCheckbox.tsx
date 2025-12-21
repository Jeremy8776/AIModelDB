import React, { useContext } from 'react';
import { Check } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';

interface RoundCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    ariaLabel?: string;
}

/**
 * Universal round checkbox styling matching settings modal.
 */
export const RoundCheckbox = React.memo(({ checked, onChange, className = '', size = 'md', ariaLabel }: RoundCheckboxProps) => {
    const { theme } = useContext(ThemeContext);

    const sizeClasses = {
        sm: 'w-4 h-4 border', // smaller border for small size
        md: 'w-5 h-5 border-2',
        lg: 'w-6 h-6 border-2'
    };

    const iconSizes = {
        sm: 10,
        md: 12,
        lg: 14
    };

    const activeColor = theme === 'dark' ? 'bg-violet-600 border-violet-600' : 'bg-violet-600 border-violet-600';
    const inactiveColor = theme === 'dark'
        ? 'border-zinc-600 hover:border-zinc-400 bg-transparent'
        : 'border-gray-300 hover:border-gray-400 bg-white';

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            className={`rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ${checked ? activeColor : inactiveColor
                } ${sizeClasses[size]} ${className}`}
            role="checkbox"
            aria-checked={checked}
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(!checked);
                }
            }}
        >
            <Check
                size={iconSizes[size]}
                strokeWidth={3}
                className={`transition-opacity duration-200 ${checked ? 'opacity-100 text-white' : 'opacity-0'}`}
            />
        </div>
    );
});
