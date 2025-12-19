import React, { useContext } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';

interface ConfirmationToastProps {
  isOpen: boolean;
  title: string;
  message?: string;
  type?: 'confirm' | 'alert' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationToast({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmationToastProps) {
  const { theme } = useContext(ThemeContext);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      case 'alert':
      case 'confirm':
      default:
        return <AlertTriangle className="h-5 w-5 text-violet-500" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-accent hover:bg-accent-dark text-white';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onCancel}
      />

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-xl border px-4 py-3 shadow-lg max-w-md w-full mx-4 ${theme === 'dark' ? 'border-zinc-800 bg-black text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{title}</div>
            {message && (
              <div className="text-xs opacity-80 mt-1">{message}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3 justify-end">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${getConfirmButtonStyle()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}