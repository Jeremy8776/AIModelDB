import React from "react";
import { useTheme } from "../context/ThemeContext";

type BasicOption = string | { value: string; label?: string };

interface ThemedSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: readonly BasicOption[];
  placeholder?: string;
  disabled?: boolean;
  buttonClassName?: string;
  menuClassName?: string;
  ariaLabel?: string;
}

export function ThemedSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  buttonClassName,
  menuClassName,
  ariaLabel
}: ThemedSelectProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const autoCloseTimerRef = React.useRef<number | null>(null);

  const normalized = React.useMemo(() => {
    return options.map(opt =>
      typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value, label: opt.label || opt.value }
    );
  }, [options]);

  const selected = normalized.find(o => o.value === value);

  // Use theme-aware styles - these use CSS variables from ThemeContext
  // The actual colors come from --bg, --bgCard, --text, --border, --accent variables

  // Close when clicking outside
  React.useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Auto-close after 3s by default; pause while interacting with menu
  React.useEffect(() => {
    if (!isOpen) return;
    if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => setIsOpen(false), 3000);
    return () => {
      if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    };
  }, [isOpen]);

  const handleMenuMouseEnter = () => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (isOpen) {
      if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = window.setTimeout(() => setIsOpen(false), 3000);
    }
  };

  return (
    <div className="relative themed-select" ref={rootRef} aria-label={ariaLabel}>
      <button
        type="button"
        disabled={disabled}
        className={`themed-select-button w-full rounded-xl border px-3 py-2 text-sm flex items-center justify-between focus:outline-none focus:ring-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${buttonClassName || ''}`}
        onClick={() => setIsOpen(v => !v)}
      >
        <span className="themed-select-text">
          {selected?.label || placeholder || 'Select'}
        </span>
        <svg className="themed-select-icon w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <div
          className={`themed-select-menu absolute left-0 right-0 mt-1 max-h-64 overflow-auto rounded-xl border shadow-lg z-30 ${menuClassName || ''}`}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          {normalized.map(opt => (
            <button
              key={opt.value}
              className={`themed-select-item w-full text-left px-3 py-2 text-sm ${opt.value === value ? 'themed-select-item-selected' : ''}`}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


