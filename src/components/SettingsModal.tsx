import React, { useContext, useState } from 'react';
import { X, Settings, Database, Shield, Zap, Palette, Download } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Import section components
import { DataSourcesSection } from './settings/DataSourcesSection';
import { APIConfigSection } from './settings/APIConfigSection';
import { ValidationSection } from './settings/ValidationSection';
import { DisplaySection } from './settings/DisplaySection';
import { SecuritySection } from './settings/SecuritySection';
import { SystemSection } from './settings/SystemSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (options?: any) => void;
  addConsoleLog: (msg: string) => void;
}

export function SettingsModal({ isOpen, onClose, onSync, addConsoleLog }: SettingsModalProps) {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('data-sources');

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const bgModal = 'border-zinc-800 bg-black';
  const bgTab = 'bg-zinc-900/40 border-zinc-800';
  const bgActiveTab = 'bg-zinc-800 border-zinc-700';

  const tabs = [
    { id: 'data-sources', label: 'Data Sources', icon: Database },
    { id: 'api-config', label: 'API Config', icon: Zap },
    { id: 'validation', label: 'Validation', icon: Shield },
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Settings },
  ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'data-sources':
        return <DataSourcesSection onSync={onSync} addConsoleLog={addConsoleLog} />;
      case 'api-config':
        return <APIConfigSection />;
      case 'validation':
        return <ValidationSection />;
      case 'display':
        return <DisplaySection />;
      case 'security':
        return <SecuritySection />;
      case 'system':
        return <SystemSection />;
      default:
        return <DataSourcesSection onSync={onSync} addConsoleLog={addConsoleLog} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border ${bgModal}`} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-300 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings size={20} />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 border-r border-zinc-300 dark:border-zinc-800 p-4 overflow-y-auto">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? `${bgActiveTab} shadow-sm`
                        : `${bgTab} hover:bg-zinc-100 dark:hover:bg-zinc-800`
                      }`}
                  >
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-zinc-500'} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
}