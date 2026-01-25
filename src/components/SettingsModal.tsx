import React, { useContext, useState } from 'react';
import { X, Settings, Database, Shield, Server, Palette, Info, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useUpdate } from '../context/UpdateContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Import section components
import { DataSourcesSection } from './settings/DataSourcesSection';
import { APIConfigSection } from './settings/APIConfigSection';
import { ValidationSection } from './settings/ValidationSection';
import { DisplaySection } from './settings/DisplaySection';
import { SecuritySection } from './settings/SecuritySection';
import { SystemSection } from './settings/SystemSection';
import { HistorySection } from './settings/HistorySection';
import { Model } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (options?: any) => void;
  addConsoleLog: (msg: string) => void;
  currentModels: Model[];
  onRestore: (models: Model[]) => void;
}

export function SettingsModal({ isOpen, onClose, onSync, addConsoleLog, currentModels, onRestore }: SettingsModalProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();
  const { updateAvailable } = useUpdate();
  const [activeTab, setActiveTab] = useState('data-sources');

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const bgModal = 'border-border';
  const bgTab = 'bg-transparent border-transparent text-text-secondary';
  const bgActiveTab = 'bg-bg-card border-border text-text';

  const tabs = [
    { id: 'data-sources', label: t('settings.tabs.dataSources'), icon: Database },
    { id: 'history', label: t('settings.tabs.history'), icon: History },
    { id: 'api-config', label: t('settings.tabs.apiConfig'), icon: Server },
    { id: 'validation', label: t('settings.tabs.validation'), icon: Shield },
    { id: 'display', label: t('settings.tabs.display'), icon: Palette },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'system', label: t('settings.tabs.system'), icon: Settings, hasNotification: updateAvailable },
  ];

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'data-sources':
        return <DataSourcesSection onSync={onSync} addConsoleLog={addConsoleLog} />;
      case 'history':
        return <HistorySection currentModels={currentModels} onRestore={onRestore} addConsoleLog={addConsoleLog} />;
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
      <div
        className={`settings-modal-container w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border ${bgModal} bg-bg`}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="settings-modal-header flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-text">
            <Settings size={20} />
            <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-bg-input transition-colors text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="settings-modal-sidebar w-64 border-r border-border p-4 overflow-y-auto">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${isActive
                      ? `${bgActiveTab} shadow-sm`
                      : `${bgTab} hover:bg-bg-card`
                      }`}
                  >
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-text-subtle'} />
                    {tab.label}
                    {tab.hasNotification && (
                      <span className="absolute right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
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