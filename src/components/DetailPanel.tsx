import { createPortal } from 'react-dom';
import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, DollarSign, Info, ExternalLink, Loader2, X, ChevronLeft, ChevronRight, Star, Flag } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { Model } from '../types';
import { Badge, DomainIcon } from './UI';
import { fmtDate, kfmt } from '../utils/format';
import { handleExternalLink } from '../utils/external-links';
import { fetchCivitasBayDetails, CivitasBayDetails } from '../services/api/fetchers/image-platforms/civitas-bay-details';
import { fetchHuggingFaceDetails } from '../services/api/fetchers/huggingface-details';

const GalleryImage = ({ src, alt, onClick }: { src: string, alt: string, onClick: () => void }) => {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if this is a video file
  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov');

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      // For videos, just use the direct URL (don't proxy)
      if (isVideo) {
        if (!cancelled) {
          setImageSrc(src);
          setLoading(false);
        }
        return;
      }

      // If Electron is available and this looks like a CDN image, proxy it
      if (window.electronAPI?.proxyImage && (
        src.includes('imagecache.civitai.com') ||
        src.includes('image.civitai.com') ||
        src.includes('huggingface.co/')
      )) {
        try {
          const result = await window.electronAPI.proxyImage(src);
          if (!cancelled && result.success && result.dataUrl) {
            setImageSrc(result.dataUrl);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[GalleryImage] Proxy failed, falling back to direct URL');
        }
      }

      // Fallback: use direct URL
      if (!cancelled) {
        setImageSrc(src);
        setLoading(false);
      }
    };

    loadImage();
    return () => { cancelled = true; };
  }, [src, isVideo]);

  if (error) {
    return null;
  }

  if (loading || !imageSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    );
  }

  // Render video or image based on file type
  if (isVideo) {
    return (
      <video
        src={imageSrc}
        className="w-full h-full object-cover cursor-pointer"
        muted
        loop
        autoPlay
        playsInline
        onClick={onClick}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
      loading="lazy"
      onError={() => setError(true)}
      onClick={onClick}
    />
  );
};

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
  onToggleFavorite?: (model: Model) => void;
  onToggleNSFWFlag?: (model: Model) => void;
}

export function DetailPanel({ model, onClose, onDelete, triggerElement, onToggleFavorite, onToggleNSFWFlag }: DetailPanelProps) {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [modelDetails, setModelDetails] = useState<CivitasBayDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

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

  const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
  const bgInput = theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-300 bg-white';

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
        </div>        <section className={`mt-4 rounded-xl border p-4`}
          style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
          <div className="mb-2 flex items-center gap-2">
            <FileText className="size-4" />
            <strong className="text-sm">{t('detailPanel.licenseIP')}</strong>
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
            {model.provider && (
              <div>
                <span className={textSubtle}>{t('detailPanel.author')}</span>
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
                            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 mb-1`}
                            style={{
                              borderColor: theme === 'dark' ? '#7c2d12' : '#fb923c',
                              background: theme === 'dark' ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)'
                            }}
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
            <strong className="text-sm">{t('detailPanel.meta.title')}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.updated')}</span>
              <div>{fmtDate(model.updated_at)}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.released')}</span>
              <div>{fmtDate(model.release_date)}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.parameters')}</span>
              <div>{model.parameters || "—"}</div>
            </div>
            <div>
              <span className={textSubtle}>{t('detailPanel.meta.context')}</span>
              <div>{model.context_window || "—"}</div>
            </div>
          </div>

          {model.benchmarks && model.benchmarks.length > 0 && (
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${textSubtle}`}>{t('detailPanel.meta.benchmarks')}</div>
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
                {t('detailPanel.links.modelPage')} <ExternalLink className="size-3" />
              </a>
            )}
          </div>
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
                return (
                  <video
                    key={selectedImageIndex}
                    src={currentSrc}
                    className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200 select-none"
                    onClick={(e) => e.stopPropagation()}
                    controls
                    autoPlay
                    loop
                  />
                );
              }

              return (
                <img
                  key={selectedImageIndex} // Key forces re-render for animation reset
                  src={currentSrc}
                  alt={`Full preview ${selectedImageIndex + 1}`}
                  className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200 select-none"
                  onClick={(e) => e.stopPropagation()}
                />
              );
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
  const { t } = useTranslation();
  const label = name || t('common.unknown');
  const tip = (name && t(`detailPanel.licenseTips.${name}`, { defaultValue: t('detailPanel.licenseTipDefault') })) || t('detailPanel.licenseTipDefault');
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
