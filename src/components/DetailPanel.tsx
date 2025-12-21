import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, DollarSign, Info, ExternalLink, Loader2 } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Model } from '../types';
import { Badge, DomainIcon } from './UI';
import { fmtDate, kfmt } from '../utils/format';
import { handleExternalLink } from '../utils/external-links';
import { fetchCivitasBayDetails, CivitasBayDetails } from '../services/api/fetchers/image-platforms/civitas-bay-details';

// Helper function to determine pricing type
const getPricingType = (pricing: any): string => {
  if (pricing.input != null || pricing.output != null) {
    return 'API';
  }
  if (pricing.flat != null) {
    const unit = pricing.unit?.toLowerCase() || '';
    const isSubscription = unit.includes('month') || unit.includes('year') ||
      unit.includes('annual') || unit.includes('subscription') || unit.includes('plan');
    return isSubscription ? 'Subscription' : 'API';
  }
  return 'Variable';
};

interface DetailPanelProps {
  model: Model | null;
  onClose: () => void;
  onDelete: (modelId: string) => void;
  triggerElement?: HTMLElement | null;
}

export function DetailPanel({ model, onClose, onDelete, triggerElement }: DetailPanelProps) {
  const { theme } = useContext(ThemeContext);
  const [isAnimating, setIsAnimating] = useState(false);
  const [civitasBayDetails, setCivitasBayDetails] = useState<CivitasBayDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Debounce positioning calculations to prevent jankiness
  const [debouncedTriggerElement, setDebouncedTriggerElement] = useState(triggerElement);

  // Fetch CivitasBay details on-demand when viewing a CivitasBay model
  useEffect(() => {
    if (model?.source === 'CivitasBay' && model.url) {
      setLoadingDetails(true);
      fetchCivitasBayDetails(model.url)
        .then(details => {
          setCivitasBayDetails(details);
          setLoadingDetails(false);
        })
        .catch(err => {
          console.error('[DetailPanel] Failed to fetch CivitasBay details:', err);
          setLoadingDetails(false);
        });
    } else {
      setCivitasBayDetails(null);
    }
  }, [model?.id, model?.source, model?.url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTriggerElement(triggerElement);
    }, 50); // Small debounce to smooth out rapid changes

    return () => clearTimeout(timer);
  }, [triggerElement]);

  if (!model) return null;

  const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
  const bgInput = theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-300 bg-white';

  // Simple sticky positioning - account for header height
  const stickyStyle = useMemo((): React.CSSProperties => {
    if (!debouncedTriggerElement) {
      return {
        height: '100%',
      };
    }

    return {
      position: 'sticky',
      top: '80px', // Account for header height (header is ~60-80px)
      height: 'calc(100vh - 100px)', // Account for header (80px) + small bottom padding (20px)
      maxHeight: 'calc(100vh - 100px)', // Ensure it doesn't exceed available space
    };
  }, [debouncedTriggerElement]);

  // Handle animation state for smoother transitions
  useEffect(() => {
    if (debouncedTriggerElement) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [debouncedTriggerElement]);

  return (
    <div
      id="model-detail-panel"
      className={`
        overflow-auto rounded-2xl border backdrop-blur-sm scrollbar-thin
        ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/95' : 'border-zinc-200 bg-white/95'} 
        ${!debouncedTriggerElement ? 'h-full' : 'shadow-2xl'} 
        ${debouncedTriggerElement && !isAnimating ? 'shadow-2xl' : ''}
        ${isAnimating ? 'shadow-xl' : ''}
      `}
      style={stickyStyle}
    >
      <div className="flex flex-col p-5">
        <div className="flex items-start justify-between">
          <div className="max-w-[85%] min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold truncate" title={model.name}>{model.name}</h2>
            </div>
            <div className={`mt-1 flex items-center gap-2 text-sm ${textSubtle} flex-wrap`}>
              <DomainIcon d={model.domain} />
              <span>{model.domain}</span>
              <span>· {kfmt(model.downloads || 0)} downloads</span>
            </div>
            {model.description && (
              <p className={`mt-2 text-sm ${textSubtle} whitespace-pre-wrap`}>{model.description}</p>
            )}

            {/* CivitasBay Details */}
            {model.source === 'CivitasBay' && (
              <div className="mt-3">
                {loadingDetails && (
                  <div className="flex items-center gap-2 text-sm text-blue-500">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Loading details...</span>
                  </div>
                )}
                {civitasBayDetails?.imageUrl && (
                  <img
                    src={civitasBayDetails.imageUrl}
                    alt={model.name}
                    className="mt-2 rounded-lg max-w-full h-auto"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                {civitasBayDetails?.civitaiUrl && (
                  <a
                    href={civitasBayDetails.civitaiUrl}
                    onClick={(e) => handleExternalLink(e, civitasBayDetails.civitaiUrl!)}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View on CivitAI <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('edit-model', { detail: model }))}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (!model?.id) return;
                window.dispatchEvent(new CustomEvent('show-confirmation', {
                  detail: {
                    title: 'Delete Model',
                    message: `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
                    onConfirm: () => {
                      onDelete(model.id);
                      onClose();
                    }
                  }
                }));
              }}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              Close
            </button>
          </div>
        </div>        <section className={`mt-4 rounded-xl border p-4`}
          style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-4" />
            <strong className="text-sm">License & IP</strong>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className={textSubtle}>License</span>
              <div>
                <LicenseHover name={model.license.name} />
              </div>
            </div>
            <div>
              <span className={textSubtle}>Type</span>
              <div>{model.license.type}</div>
            </div>
            <div>
              <span className={textSubtle}>Commercial</span>
              <div>{model.license.commercial_use ? "Allowed" : "Not allowed"}</div>
            </div>
            <div>
              <span className={textSubtle}>Attribution</span>
              <div>{model.license.attribution_required ? "Required" : "Not required"}</div>
            </div>
            <div>
              <span className={textSubtle}>Copyleft</span>
              <div>{model.license.copyleft ? "Yes" : "No"}</div>
            </div>
            <div>
              <span className={textSubtle}>Indemnity</span>
              <div>{model.indemnity || "None"}</div>
            </div>
            {model.provider && (
              <div>
                <span className={textSubtle}>Author</span>
                <div>{model.provider}</div>
              </div>
            )}
          </div>

        </section>

        {model.pricing?.length ? (
          <section className={`mt-4 rounded-xl border p-4`}
            style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="size-4" />
              <strong className="text-sm">Pricing</strong>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {/* Group pricing by type */}
              {(() => {
                const apiPricing = model.pricing?.filter(p => getPricingType(p) === 'API') || [];
                const subPricing = model.pricing?.filter(p => getPricingType(p) === 'Subscription') || [];
                const otherPricing = model.pricing?.filter(p => !['API', 'Subscription'].includes(getPricingType(p))) || [];

                return (
                  <>
                    {/* API Pricing */}
                    {apiPricing.length > 0 && (
                      <div>
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>API Usage</div>
                        {apiPricing.map((p, i) => (
                          <div
                            key={`api-${i}`}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1`}
                            style={{
                              borderColor: theme === 'dark' ? '#7c2d12' : '#fb923c',
                              background: theme === 'dark' ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)'
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.model || 'API Access'}</div>
                              <div className={`truncate text-xs ${textSubtle}`}>
                                {(() => {
                                  // Enterprise-friendly format
                                  const currency = p.currency || '$';
                                  if (p.flat != null) {
                                    const per1K = Number(p.flat) / 1000;
                                    return `~${currency}${per1K.toFixed(3)} per 1K requests`;
                                  } else if (p.input != null && p.output != null) {
                                    const inputPer1K = Number(p.input) / 1000;
                                    const outputPer1K = Number(p.output) / 1000;
                                    const blended = (inputPer1K * 3 + outputPer1K) / 4;
                                    return `~${currency}${blended.toFixed(3)} per 1K requests (blended)`;
                                  }
                                  return 'API pricing';
                                })()}{p.notes ? ` • ${p.notes}` : ''}
                              </div>
                            </div>
                            <div className="text-right text-xs opacity-60">
                              {p.flat != null
                                ? `${p.currency || '$'}${p.flat}/1M`
                                : (p.input != null || p.output != null)
                                  ? `${p.currency || '$'}${p.input ?? '?'}/${p.output ?? '?'} per 1M`
                                  : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subscription Pricing */}
                    {subPricing.length > 0 && (
                      <div>
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>📅 Subscription Plans</div>
                        {subPricing.map((p, i) => (
                          <div
                            key={`sub-${i}`}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1`}
                            style={{
                              borderColor: theme === 'dark' ? '#7c2d12' : '#fb923c',
                              background: theme === 'dark' ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)'
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.model || 'Subscription'}</div>
                              <div className={`truncate text-xs ${textSubtle}`}>
                                {p.unit || 'Monthly'}{p.notes ? ` • ${p.notes}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              {p.flat != null ? `${p.currency || '$'}${p.flat}` : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Other Pricing */}
                    {otherPricing.length > 0 && (
                      <div>
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>💰 Other Costs</div>
                        {otherPricing.map((p, i) => (
                          <div
                            key={`other-${i}`}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1`}
                            style={{
                              borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
                              background: theme === 'dark' ? 'rgba(24,24,27,0.4)' : 'rgba(244,244,245,0.6)'
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate">{p.model || model.name}</div>
                              <div className={`truncate text-xs ${textSubtle}`}>
                                {getPricingType(p)} • {p.unit || 'License'}{p.notes ? ` • ${p.notes}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              {p.flat != null
                                ? `${p.currency || '$'}${p.flat}`
                                : (p.input != null || p.output != null)
                                  ? `${p.currency || '$'}${p.input ?? '?'} in → ${p.output ?? '?'} out`
                                  : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </section>
        ) : null}

        <section className={`mt-4 rounded-xl border p-4 text-sm`}
          style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
          <div className="mb-2 flex items-center gap-2">
            <Info className="size-4" />
            <strong className="text-sm">Meta</strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={textSubtle}>Updated</span>
              <div>{fmtDate(model.updated_at)}</div>
            </div>
            <div>
              <span className={textSubtle}>Released</span>
              <div>{fmtDate(model.release_date)}</div>
            </div>
            <div>
              <span className={textSubtle}>Parameters</span>
              <div>{model.parameters || "—"}</div>
            </div>
            <div>
              <span className={textSubtle}>Context</span>
              <div>{model.context_window || "—"}</div>
            </div>
          </div>

          {model.benchmarks && model.benchmarks.length > 0 && (
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${textSubtle}`}>Benchmarks</div>
              <div className="space-y-1">
                {model.benchmarks.slice(0, 6).map((b, i) => (
                  <div key={i} className={`flex justify-between rounded-md px-2 py-1 border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div className="truncate pr-2">{b.name}</div>
                    <div className="text-right text-xs opacity-80">{b.score}{b.unit ? ` ${b.unit}` : ''}{b.source ? ` • ${b.source}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {model.analytics && Object.keys(model.analytics).length > 0 && (
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${textSubtle}`}>Analytics</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(model.analytics).slice(0, 6).map(([k, v]) => (
                  <div key={k} className={`rounded-md px-2 py-1 border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <div className="text-[11px] opacity-70">{k}</div>
                    <div className="text-sm">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {model.tags?.length ? (
            <div className="mt-3 max-h-28 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">
                {model.tags.map(t => <Badge key={t}>{t}</Badge>)}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex gap-2 flex-wrap">
            {/* Show "Use on HuggingFace" if URL is from HuggingFace */}
            {model.url && model.url.includes('huggingface.co') && (
              <a
                href={model.url}
                onClick={(e) => handleExternalLink(e, model.url!)}
                className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
              >
                HuggingFace <ExternalLink className="size-3" />
              </a>
            )}

            {/* Show "Repo" if repo is GitHub */}
            {model.repo && model.repo.includes('github.com') && (
              <a
                href={model.repo}
                onClick={(e) => handleExternalLink(e, model.repo!)}
                className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
              >
                GitHub <ExternalLink className="size-3" />
              </a>
            )}

            {/* Show "Artificial Analysis" if URL is from artificialanalysis.ai */}
            {model.url && model.url.includes('artificialanalysis.ai') && (
              <a
                href={model.url}
                onClick={(e) => handleExternalLink(e, model.url!)}
                className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
              >
                Artificial Analysis <ExternalLink className="size-3" />
              </a>
            )}

            {/* Show "Model Page" if URL exists and is NOT HuggingFace, GitHub, or Artificial Analysis */}
            {model.url && !model.url.includes('huggingface.co') && !model.url.includes('github.com') && !model.url.includes('artificialanalysis.ai') && (
              <a
                href={model.url}
                onClick={(e) => handleExternalLink(e, model.url!)}
                className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-3 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity`}
              >
                Model Page <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Lightweight license explainer map
const LICENSE_TIPS: Record<string, string> = {
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

function LicenseHover({ name }: { name?: string | null }) {
  const label = name || 'Unknown';
  const tip = LICENSE_TIPS[label] || 'Review the license terms for commercial rights, attribution, and restrictions.';
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
