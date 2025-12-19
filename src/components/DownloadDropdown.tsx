import React, { useState, useRef, useEffect, useContext } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';

interface DownloadOption {
  label: string;
  value: string;
  action: () => void;
}

interface DownloadDropdownProps {
  options: DownloadOption[];
  className?: string;
}

export function DownloadDropdown({ options, className = '' }: DownloadDropdownProps) {
  const { theme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const bgInput = theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-300 bg-white';
  const bgDropdown = theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const textColor = theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
  const hoverBg = theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option: DownloadOption) => {
    option.action();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-2 py-1 text-xs ${textColor} ${hoverBg} transition-colors`}
      >
        <Download className="size-3" />
        Download
        <ChevronDown className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 min-w-[120px] rounded-lg border ${bgDropdown} shadow-lg z-50`}>
          {options.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option)}
              className={`w-full text-left px-3 py-2 text-xs ${textColor} ${hoverBg} transition-colors ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}