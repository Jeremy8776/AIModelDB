import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, DollarSign, Info, ExternalLink, Loader2, X, ChevronLeft, ChevronRight, Star, Flag, EyeOff, Download, Copy } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Model } from '../types';
import { Badge, DomainIcon } from './UI';
import { fmtDate, kfmt } from '../utils/format';
import { handleExternalLink } from '../utils/external-links';
import { fetchCivitasBayDetails, CivitasBayDetails } from '../services/api/fetchers/image-platforms/civitas-bay-details';
import { fetchHuggingFaceDetails } from '../services/api/fetchers/huggingface-details';
import { GalleryImage } from './detail/GalleryImage';
import { LicenseHover } from './detail/LicenseHover';
import { useImageContextMenu } from '../hooks/useImageContextMenu';
import { getPricingType, isSubscriptionPricing, formatReleaseDate } from '../utils/pricing';

interface DetailPanelProps {
  model: Model | null;
  onClose: () => void;
  onDelete: (modelId: string) => void;
  triggerElement?: HTMLElement | null;
  onToggleFavorite?: (model: Model) => void;
  onToggleNSFWFlag?: (model: Model) => void;
  onToggleImageNSFW?: (model: Model, imageUrl: string) => void;
  hideNSFW?: boolean;
  className?: string; // Add optional className prop
}



export function DetailPanel({ model, onClose, onDelete, triggerElement, onToggleFavorite, onToggleNSFWFlag, onToggleImageNSFW, hideNSFW = true, className = "" }: DetailPanelProps) {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [modelDetails, setModelDetails] = useState<CivitasBayDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const { contextMenu, handleImageContextMenu, handleCopyImage, handleSaveImage, closeContextMenu } = useImageContextMenu();

  // Debounce positioning calculations to prevent jankiness
  const [debouncedTriggerElement, setDebouncedTriggerElement] = useState(triggerElement);

  // Fetch details on-demand based on source
  useEffect(() => {
    if (!model) return;

    // Reset details when model changes
    setModelDetails(null);
    setLoadingDetails(false);

    const loadDetails = async () => {
      setLoadingDetails(true);
      try {
        if (model.source === 'CivitasBay' && model.url) {
          const details = await fetchCivitasBayDetails(model.url);
          setModelDetails(details);
        } else if (model.source === 'HuggingFace') {
          const details = await fetchHuggingFaceDetails(model.id);
          // Adapt to shared interface
          if (details) {
            setModelDetails({
              images: details.images,
              fullDescription: details.description
            });
          }
        }
      } catch (err) {
        console.error('[DetailPanel] Failed to fetch details:', err);
      } finally {
        setLoadingDetails(false);
      }
    };

    if (model.source === 'CivitasBay' || model.source === 'HuggingFace') {
      loadDetails();
    }
  }, [model?.id, model?.source, model?.url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTriggerElement(triggerElement);
    }, 50); // Small debounce to smooth out rapid changes

    return () => clearTimeout(timer);
  }, [triggerElement]);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modelDetails?.images) return;

      if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) =>
          prev === null ? null : (prev + 1) % modelDetails.images!.length
        );
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) =>
          prev === null ? null : (prev - 1 + modelDetails.images!.length) % modelDetails.images!.length
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, modelDetails?.images]);

  if (!model) return null;

  const textSubtle = "text-text-secondary";
  const bgInput = "border-border bg-bg-input text-text";

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (modelDetails?.images && selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % modelDetails.images.length);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (modelDetails?.images && selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + modelDetails.images.length) % modelDetails.images.length);
    }
  };

  return (
    <div
      id="model-detail-panel"
      className={`
        h-full flex flex-col rounded-2xl border backdrop-blur-sm
        border-border bg-bg/95
        ${!debouncedTriggerElement ? '' : 'shadow-2xl'} 
        ${debouncedTriggerElement && !isAnimating ? 'shadow-2xl' : ''}
        ${isAnimating ? 'shadow-xl' : ''}
        ${className}
      `}
    >
      <div className="flex-1 overflow-y-auto p-5">
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

            {/* Extended Details (CivitasBay/HF) */}
            {(model.source === 'CivitasBay' || model.source === 'HuggingFace') && (
              <div className="mt-3">
                {loadingDetails && (
                  <div className="flex items-center gap-2 text-sm text-blue-500">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t('detailPanel.loadingDetails')}</span>
                  </div>
                )}
                {modelDetails?.civitaiUrl && (
                  <a
                    href={modelDetails.civitaiUrl}
                    onClick={(e) => handleExternalLink(e, modelDetails.civitaiUrl!)}
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {t('detailPanel.viewOnCivitAI')} <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(model)}
                className={`flex items-center gap-1 rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap transition-all duration-150 active:scale-90 ${model.isFavorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-500/30' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                title={model.isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
              >
                <Star className={`size-3 transition-transform duration-150 ${model.isFavorite ? 'fill-current scale-110' : ''}`} />
                {model.isFavorite ? t('common.favorited') : t('common.favorite')}
              </button>
            )}
            {onToggleNSFWFlag && (
              <button
                onClick={() => onToggleNSFWFlag(model)}
                className={`flex items-center gap-1 rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap transition-all duration-150 active:scale-90 ${model.isNSFWFlagged ? 'text-red-500 bg-red-50 dark:bg-red-900/30 ring-1 ring-red-500/30' : 'hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                title={model.isNSFWFlagged ? t('common.unflag') : t('common.flag')}
              >
                <Flag className={`size-3 transition-transform duration-150 ${model.isNSFWFlagged ? 'fill-current scale-110' : ''}`} />
                {model.isNSFWFlagged ? t('common.flagged') : t('common.flag')}
              </button>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('edit-model', { detail: model }))}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              {t('common.edit')}
            </button>
            <button
              onClick={() => {
                if (!model?.id) return;
                window.dispatchEvent(new CustomEvent('show-confirmation', {
                  detail: {
                    title: t('detailPanel.deleteTitle'),
                    message: t('detailPanel.deleteMessage', { name: model.name }),
                    onConfirm: () => {
                      onDelete(model.id);
                      onClose();
                    }
                  }
                }));
              }}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              {t('common.delete')}
            </button>
            <button
              onClick={onClose}
              className={`rounded-xl ${bgInput} px-3 py-1 text-xs whitespace-nowrap`}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
        <section className="mt-4 rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-4" />
            <strong className="text-sm">{t('detailPanel.licenseIPDeployment', 'License, IP & Deployment')}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className={textSubtle}>{t('detailPanel.license')}</span>
              <div>
                <LicenseHover name={model.license.name} />
              </div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.type')}</span>
              <div>{model.license.type}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.commercial')}</span>
              <div>{model.license.commercial_use ? t('detailPanel.allowed') : t('detailPanel.notAllowed')}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.attribution')}</span>
              <div>{model.license.attribution_required ? t('detailPanel.required') : t('detailPanel.notRequired')}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.copyleft')}</span>
              <div>{model.license.copyleft ? t('common.yes') : t('common.no')}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.indemnity')}</span>
              <div>{model.indemnity || t('common.none')}</div>
            </div>
            {model.data_provenance && (
              <div>
                <span className={textSubtle}>{t('detailPanel.dataProvenance', 'Data Provenance')}</span>
                <div>{model.data_provenance}</div>
              </div>
            )}
            {model.provider && (
              <div>
                <span className={textSubtle}>{t('detailPanel.author')}</span>
                <div>{model.provider}</div>
              </div>
            )}

            {/* Hosting / Deployment Flags */}
            <div className="col-span-2 mt-2 pt-2 border-t border-dashed border-border/50">
              <div className="flex gap-4 flex-wrap">
                {model.hosting.weights_available && (
                  <div className="flex items-center gap-1.5" title="Model weights can be downloaded">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{t('detailPanel.weights', 'Weights Available')}</span>
                  </div>
                )}
                {model.hosting.api_available && (
                  <div className="flex items-center gap-1.5" title="Available via API">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{t('detailPanel.api', 'API Available')}</span>
                  </div>
                )}
                {model.hosting.on_premise_friendly && (
                  <div className="flex items-center gap-1.5" title="Can be run locally/on-premise">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>{t('detailPanel.onPrem', 'On-Prem Friendly')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Restrictions */}
            {model.usage_restrictions && model.usage_restrictions.length > 0 && (
              <div className="col-span-2">
                <span className={textSubtle}>{t('detailPanel.usageRestrictions', 'Usage Restrictions')}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {model.usage_restrictions.map(r => (
                    <span key={r} className={`px-1.5 py-0.5 rounded text-xs border border-red-500/30 bg-red-500/10 text-red-500`}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </section>

        {model.pricing?.length ? (
          <section className="mt-4 rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="size-4" />
              <strong className="text-sm">{t('detailPanel.pricing.title')}</strong>
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
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.pricing.apiUsage')}</div>
                        {apiPricing.map((p, i) => (
                          <div
                            key={`api-${i}`}
                            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1 border-accent/20 bg-accent/10"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.model || 'API Access'}</div>
                              <div className={`truncate text-xs ${textSubtle}`}>
                                {(() => {
                                  // Enterprise-friendly format
                                  const currency = p.currency || '$';
                                  if (p.flat != null) {
                                    const per1K = Number(p.flat) / 1000;
                                    return `~${currency}${per1K.toFixed(3)} ${t('detailPanel.pricing.per1k')}`;
                                  } else if (p.input != null && p.output != null) {
                                    const inputPer1K = Number(p.input) / 1000;
                                    const outputPer1K = Number(p.output) / 1000;
                                    const blended = (inputPer1K * 3 + outputPer1K) / 4;
                                    return `~${currency}${blended.toFixed(3)} ${t('detailPanel.pricing.per1kBlended')}`;
                                  }
                                  return t('detailPanel.pricing.apiPricing');
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
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.pricing.subscription')}</div>
                        {subPricing.map((p, i) => (
                          <div
                            key={`sub-${i}`}
                            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1 border-accent/20 bg-accent/10"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{p.model || 'Subscription'}</div>
                              <div className={`truncate text-xs ${textSubtle}`}>
                                {p.unit || t('detailPanel.pricing.monthly')}{p.notes ? ` • ${p.notes}` : ''}
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
                        <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.pricing.other')}</div>
                        {otherPricing.map((p, i) => (
                          <div
                            key={`other-${i}`}
                            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1 border-border/50 bg-bg-card/50"
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

        <section className={`mt-4 rounded-xl border border-border p-4 text-sm`}>
          <div className="mb-2 flex items-center gap-2">
            <Info className="size-4" />
            <strong className="text-sm">{t('detailPanel.meta.title')}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.updated')}</span>
              <div>{fmtDate(model.updated_at)}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.released')}</span>
              <div>{formatReleaseDate(model)}</div>
            </div>
            {model.parameters && (
              <div>
                <span className={textSubtle}>{t('detailPanel.meta.parameters')}</span>
                <div>{model.parameters}</div>
              </div>
            )}
            {model.context_window && (
              <div>
                <span className={textSubtle}>{t('detailPanel.meta.context')}</span>
                <div>{model.context_window}</div>
              </div>
            )}
          </div>

          {model.benchmarks && model.benchmarks.length > 0 && (
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.meta.benchmarks')}</div>
              <div className="space-y-1">
                {model.benchmarks.slice(0, 6).map((b, i) => (
                  <div key={i} className={`flex justify-between rounded-md px-2 py-1 border border-border`}>
                    <div className="truncate pr-2">{b.name}</div>
                    <div className="text-right text-xs opacity-80">{b.score}{b.unit ? ` ${b.unit}` : ''}{b.source ? ` • ${b.source}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {model.analytics && Object.keys(model.analytics).length > 0 && (
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.meta.analytics')}</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(model.analytics)
                  .filter(([_, v]) => v != null && v !== '')
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <div key={k} className={`rounded-md px-2 py-1 border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
                      <div className="text-[11px] opacity-70">
                        {k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm">{String(v)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Credits & External References */}
          {(() => {
            const allLinks = model.links || [];

            // If no links array but we have primary urls, we should still show them
            const displayLinks = allLinks.length > 0
              ? allLinks
              : [
                ...(model.url ? [{ label: model.source.split(',')[0].trim(), url: model.url }] : []),
                ...(model.repo ? [{ label: 'Repository', url: model.repo }] : [])
              ];

            if (displayLinks.length === 0) return null;

            return (
              <div className="mt-6 space-y-5">
                {/* Tags */}
                {model.tags && model.tags.length > 0 && (
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${textSubtle} opacity-60`}>
                      {t('detailPanel.tags', 'Model Tags')}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                      {model.tags.map(t => <Badge key={t}>{t}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Sources & External Links */}
                <div className={`rounded-xl p-4 bg-bg-card`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${textSubtle} opacity-60`}>
                    {t('detailPanel.links.sources', 'Credited Sources & Links')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displayLinks.map((btn, i) => (
                      <a
                        key={i}
                        href={btn.url}
                        onClick={(e) => handleExternalLink(e, btn.url)}
                        className={`
                          inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold
                          transition-all hover:scale-105 active:scale-95 hover:shadow-md
                          bg-purple-600/10 text-purple-700 dark:text-purple-300 border-purple-600/20
                          hover:bg-purple-600/20
                        `}
                      >
                        {btn.label} <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* Image Gallery */}
        {modelDetails?.images && modelDetails.images.length > 0 && (
          <section className={`mt-4 rounded-xl border p-4`}
            style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
            <div className="mb-2 flex items-center gap-2">
              <strong className="text-sm">{t('detailPanel.gallery', 'Gallery')}</strong>
              <span className={`text-xs ${textSubtle}`}>({modelDetails.images.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {modelDetails.images.map((imgUrl, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg group empty:hidden">
                  <GalleryImage
                    src={imgUrl}
                    alt={`Preview ${i + 1}`}
                    onClick={() => setSelectedImageIndex(i)}
                    onContextMenu={(e) => handleImageContextMenu(e, imgUrl)}
                    isFlagged={model.flaggedImageUrls?.includes(imgUrl)}
                    hideNSFW={hideNSFW}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox Overlay */}
      {selectedImageIndex !== null && modelDetails?.images && createPortal(
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/45 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImageIndex(null);
            }}
          >
            <X className="size-8" />
          </button>

          {/* Main Image View Area */}
          <div className="relative flex-1 w-full flex items-center justify-center p-8 min-h-0 overflow-hidden">
            {/* Previous Button */}
            {modelDetails.images.length > 1 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                onClick={handlePrevImage}
              >
                <ChevronLeft className="size-10" />
              </button>
            )}

            {/* Image/Video View */}
            {(() => {
              const currentSrc = modelDetails.images[selectedImageIndex];
              const isVideo = currentSrc.endsWith('.mp4') || currentSrc.endsWith('.webm') || currentSrc.endsWith('.mov');

              if (isVideo) {
                const videoIsFlagged = model.flaggedImageUrls?.includes(currentSrc);
                return (
                  <div className="relative">
                    <video
                      key={selectedImageIndex}
                      src={currentSrc}
                      className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200 select-none"
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => handleImageContextMenu(e, currentSrc)}
                      controls
                      autoPlay
                      loop
                    />
                    {videoIsFlagged && hideNSFW && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/95 rounded-lg">
                        <EyeOff className="size-24 text-zinc-500" />
                      </div>
                    )}
                  </div>
                );
              }

              const imgIsFlagged = model.flaggedImageUrls?.includes(currentSrc);
              return (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <img
                    key={selectedImageIndex}
                    src={currentSrc}
                    alt={`Full preview ${selectedImageIndex + 1}`}
                    className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200 select-none"
                    onContextMenu={(e) => handleImageContextMenu(e, currentSrc)}
                  />
                  {imgIsFlagged && hideNSFW && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-zinc-900/95 rounded-lg">
                      <EyeOff className="size-24 text-zinc-500" />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Flagged Overlay for Lightbox */}
            {(() => {
              const currentSrc = modelDetails.images[selectedImageIndex];
              if (hideNSFW && model.flaggedImageUrls?.includes(currentSrc)) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <EyeOff className="size-32 text-white/80 drop-shadow-2xl" />
                  </div>
                );
              }
              return null;
            })()}

            {/* Next Button */}
            {modelDetails.images.length > 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                onClick={handleNextImage}
              >
                <ChevronRight className="size-10" />
              </button>
            )}
          </div>

          {/* Carousel thumbnails */}
          <div className="h-24 w-full bg-black/40 backdrop-blur-sm border-t border-white/10 flex items-center justify-center gap-2 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent shrink-0"
            onClick={(e) => e.stopPropagation()}>
            {modelDetails.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative h-16 w-16 min-w-[4rem] rounded-md overflow-hidden transition-all duration-200 border-2 ${selectedImageIndex === idx ? 'border-white scale-105 opacity-100 ring-2 ring-white/20' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
              >
                {(() => {
                  const isVideo = img.endsWith('.mp4') || img.endsWith('.webm') || img.endsWith('.mov');
                  if (isVideo) {
                    return <video src={img} className="w-full h-full object-cover" muted />;
                  }
                  return <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />;
                })()}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Context Menu */}
      {contextMenu && createPortal(
        <div
          className="fixed z-[9999] min-w-[160px] overflow-hidden rounded-lg border bg-white p-1 text-sm shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleCopyImage(contextMenu.imageUrl)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Copy className="size-4 opacity-70" />
            <span>
              {(contextMenu.imageUrl.endsWith('.mp4') || contextMenu.imageUrl.endsWith('.webm'))
                ? 'Copy Video URL'
                : 'Copy Image'}
            </span>
          </button>
          <button
            onClick={() => handleSaveImage(contextMenu.imageUrl)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Download className="size-4 opacity-70" />
            <span>
              {(contextMenu.imageUrl.endsWith('.mp4') || contextMenu.imageUrl.endsWith('.webm'))
                ? 'Save Video'
                : 'Save Image'}
            </span>
          </button>
          {onToggleImageNSFW && (
            <>
              <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              <button
                onClick={() => {
                  if (model) onToggleImageNSFW(model, contextMenu.imageUrl);
                  closeContextMenu();
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${model.flaggedImageUrls?.includes(contextMenu.imageUrl) ? 'text-red-500' : ''
                  }`}
              >
                <EyeOff className="size-4 opacity-70" />
                <span>{model.flaggedImageUrls?.includes(contextMenu.imageUrl) ? 'Unflag NSFW' : 'Flag as NSFW'}</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
