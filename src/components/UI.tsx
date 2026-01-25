import React, { useContext, useEffect } from 'react';
import { Brain, Box, AudioLines, Image as ImageIcon, Video, Cpu, Globe, Layers, SlidersHorizontal, Wrench, X } from 'lucide-react';
import { Domain } from '../types';
import ThemeContext from '../context/ThemeContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export function DomainIcon({ d, className }: { d: Domain, className?: string }) {
  switch (d) {
    case "LLM":
      return <Brain className={className || "h-4 w-4 align-middle"} />;
    case "VLM":
      return <Globe className={className || "h-4 w-4 align-middle"} />;
    case "Vision":
      return <Cpu className={className || "h-4 w-4 align-middle"} />;
    case "ImageGen":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    case "VideoGen":
      return <Video className={className || "h-4 w-4 align-middle"} />;
    case "Audio":
    case "ASR":
    case "TTS":
      return <AudioLines className={className || "h-4 w-4 align-middle"} />;
    case "3D":
      return <Box className={className || "h-4 w-4 align-middle"} />;
    case "LoRA":
      return <SlidersHorizontal className={className || "h-4 w-4 align-middle"} />;
    case "FineTune":
      return <Wrench className={className || "h-4 w-4 align-middle"} />;
    case "BackgroundRemoval":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    case "Upscaler":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    default:
      return <Layers className={className || "h-4 w-4 align-middle"} />;
  }
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-border bg-bg-card/60 text-text-secondary px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
}) => {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-[90vw]',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClasses[size]} bg-bg border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-card/30">
          {title ? <h3 className="text-xl font-bold text-text truncate">{title}</h3> : <div />}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg-input text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
