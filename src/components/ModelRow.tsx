import React, { useContext, memo, Fragment } from 'react';
import { Database, Download, CheckCircle, Star, Flag } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Model } from '../types';
import { RoundCheckbox } from './RoundCheckbox';
import { DomainIcon } from './UI';
import { kfmt } from '../utils/format';
import {
  formatCurrency,
  convertCurrency,
  detectCurrency,
  validateModelCost,
  factCheckModelCost
} from '../utils/currency';
import {
  formatReleaseDate,
  isSubscriptionPricing,
  toPerMillion,
  formatEnterprisePricing
} from '../utils/pricing';

interface ModelRowProps {
  m: Model;
  onOpen: (m: Model, element?: HTMLElement) => void;
  isActive?: boolean;
  isSelected?: boolean;
  onSelect?: (m: Model, selected: boolean) => void;
  isFocused?: boolean;
  onToggleFavorite?: (m: Model) => void;
  onToggleNSFWFlag?: (m: Model) => void;
}

export const ModelRow = memo(function ModelRow({
  m,
  onOpen,
  isActive,
  isSelected,
  onSelect,
  isFocused,
  onToggleFavorite,
  onToggleNSFWFlag,
}: ModelRowProps) {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();

  const rowBg = isActive
    ? 'border-accent/50 bg-accent/10 shadow-[0_0_15px_rgba(var(--accent-rgb,139,92,246),0.1)]'
    : 'border-border bg-bg-card';

  const textMain = 'text-text';
  const textSecondary = 'text-text-secondary';
  const subtleText = 'text-text-subtle';

  const getCostDisplay = (model: Model): JSX.Element => {
    // Check if model is open-source
    const isOpenSource = (model.license?.type === 'OSI' || model.license?.type === 'Copyleft') && model.license?.name && model.license.name !== 'Proprietary';

    // If open-source and no pricing, show Free and Local Run badge only
    if ((!model.pricing || model.pricing.length === 0) && isOpenSource) {
      const vramTag = (model.tags || []).find(t => /vram|gb|gpu/i.test(t));
      return (
        <span className="inline-flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded text-green-500 bg-green-500/10 text-sm font-medium">Free</span>
          <span className="px-1.5 py-0.5 rounded text-blue-500 bg-blue-500/10 text-sm font-medium">Local</span>
          {vramTag && (
            <span className="px-1.5 py-0.5 rounded text-text-secondary bg-bg-input text-sm font-medium" title="Minimum VRAM requirement (from tags)">{vramTag}</span>
          )}
        </span>
      );
    }
    if (!model.pricing || model.pricing.length === 0) return <span>—</span>;

    // Separate API and subscription pricing
    const apiPricing = model.pricing.filter(p => !isSubscriptionPricing(p));
    const subPricing = model.pricing.filter(p => isSubscriptionPricing(p));

    const targetCurrency = settings.currency;
    const displays: string[] = [];
    let hasValidationIssues = false;

    // Process API pricing (badge formatting)
    if (apiPricing.length > 0) {
      const pricing = apiPricing[0];
      const hasValidFlat = pricing.flat != null && !isNaN(Number(pricing.flat));
      const hasValidInput = pricing.input != null && !isNaN(Number(pricing.input));
      const hasValidOutput = pricing.output != null && !isNaN(Number(pricing.output));

      if (hasValidFlat || hasValidInput || hasValidOutput) {
        const sourceCurrency = detectCurrency(pricing);

        try {
          if (hasValidFlat) {
            const perM = toPerMillion(Number(pricing.flat), pricing.unit);
            const convertedAmount = convertCurrency(perM, sourceCurrency, targetCurrency);
            const enterpriseFormat = formatEnterprisePricing(convertedAmount, null, targetCurrency);
            displays.push(enterpriseFormat);
          } else if (hasValidInput && hasValidOutput) {
            const inputPerM = toPerMillion(Number(pricing.input), pricing.unit);
            const outputPerM = toPerMillion(Number(pricing.output), pricing.unit);
            const inputConverted = convertCurrency(inputPerM, sourceCurrency, targetCurrency);
            const outputConverted = convertCurrency(outputPerM, sourceCurrency, targetCurrency);
            const enterpriseFormat = formatEnterprisePricing(inputConverted, outputConverted, targetCurrency);
            displays.push(enterpriseFormat);
          } else if (hasValidInput) {
            const perM = toPerMillion(Number(pricing.input), pricing.unit);
            const convertedAmount = convertCurrency(perM, sourceCurrency, targetCurrency);
            const enterpriseFormat = formatEnterprisePricing(convertedAmount, null, targetCurrency);
            displays.push(enterpriseFormat);
          }

          // Validate API costs if enabled
          if (settings.showCostValidation) {
            const validation = validateModelCost(pricing, model.name, model.domain);
            const factCheck = factCheckModelCost(model.name, pricing);
            hasValidationIssues = hasValidationIssues ||
              (validation && (!validation.isValid || validation.confidence === 'low')) ||
              (factCheck && (!factCheck.isValid || factCheck.confidence === 'low'));
          }
        } catch (error) {
          console.warn('Error converting API currency for model:', model.name, error);
        }
      }
    }

    // Process subscription pricing (badge formatting)
    if (subPricing.length > 0) {
      const pricing = subPricing[0];
      const hasValidFlat = pricing.flat != null && !isNaN(Number(pricing.flat));

      if (hasValidFlat) {
        const sourceCurrency = detectCurrency(pricing);

        try {
          const convertedAmount = convertCurrency(Number(pricing.flat), sourceCurrency, targetCurrency);
          const unit = pricing.unit || 'month';
          const period = unit.toLowerCase().includes('year') || unit.toLowerCase().includes('annual') ? '/yr' : '/mo';
          displays.push(`Sub • ${formatCurrency(convertedAmount, targetCurrency)}${period}`);

          // Validate subscription costs if enabled
          if (settings.showCostValidation) {
            const validation = validateModelCost(pricing, model.name, model.domain);
            const factCheck = factCheckModelCost(model.name, pricing);
            hasValidationIssues = hasValidationIssues ||
              (validation && (!validation.isValid || validation.confidence === 'low')) ||
              (factCheck && (!factCheck.isValid || factCheck.confidence === 'low'));
          }
        } catch (error) {
          console.warn('Error converting subscription currency for model:', model.name, error);
        }
      }
    }

    if (displays.length === 0) {
      return <span>—</span>;
    }

    const renderBadge = (label: string) => (
      <span className="px-1.5 py-0.5 rounded text-text-secondary bg-bg-input text-sm font-medium whitespace-nowrap">{label}</span>
    );

    // If open-source with API pricing, show both Free/Local AND API cost
    const vramTag = (model.tags || []).find(t => /vram|gb|gpu/i.test(t));
    return (
      <div className="flex items-center gap-1">
        <div className="flex flex-wrap gap-1">
          {isOpenSource && (
            <Fragment>
              <span className="px-1.5 py-0.5 rounded text-green-500 bg-green-500/10 text-sm font-medium">Free</span>
              <span className="px-1.5 py-0.5 rounded text-blue-500 bg-blue-500/10 text-sm font-medium">Local</span>
              {vramTag && (
                <span className="px-1.5 py-0.5 rounded text-text-secondary bg-bg-input text-sm font-medium" title="Minimum VRAM requirement (from tags)">{vramTag}</span>
              )}
            </Fragment>
          )}
          {displays.map((display, index) => (
            <Fragment key={index}>{renderBadge(display)}</Fragment>
          ))}
        </div>
        {settings.showCostValidation && !hasValidationIssues && displays.length > 0 && (
          <div title="Pricing validated">
            <CheckCircle className="size-3 text-green-500 flex-shrink-0 opacity-50" />
          </div>
        )}
      </div>
    );
  };

  // Get cost summary for tooltip
  const getCostSummary = (model: Model): string => {
    const getApiUnitSuffix = (p: any): string => {
      const u = (p?.unit || '').toLowerCase();
      if (u.includes('1m') || u.includes('million')) return ' per 1M tokens';
      if (u.includes('1k') || u.includes('thousand')) return ' per 1K tokens';
      if (u.includes('token')) return ' per token';
      return ' per token';
    };
    if (!model.pricing || model.pricing.length === 0) return 'No pricing information available';

    const pricing = model.pricing[0];
    const sourceCurrency = detectCurrency(pricing);
    const targetCurrency = settings.currency;
    const isSubscription = isSubscriptionPricing(pricing);

    let summary = '';

    if (pricing.flat != null) {
      const convertedAmount = convertCurrency(pricing.flat, sourceCurrency, targetCurrency);
      const type = isSubscription ? 'Subscription' : 'API';
      summary = `${type}: ${formatCurrency(convertedAmount, targetCurrency)}`;
    } else if (pricing.input != null && pricing.output != null) {
      const inputConverted = convertCurrency(pricing.input, sourceCurrency, targetCurrency);
      const outputConverted = convertCurrency(pricing.output, sourceCurrency, targetCurrency);
      summary = `API: ${formatCurrency(inputConverted, targetCurrency)} input / ${formatCurrency(outputConverted, targetCurrency)} output${getApiUnitSuffix(pricing)}`;
    } else if (pricing.input != null) {
      const convertedAmount = convertCurrency(pricing.input, sourceCurrency, targetCurrency);
      summary = `API: ${formatCurrency(convertedAmount, targetCurrency)}${getApiUnitSuffix(pricing)}`;
    } else {
      summary = 'Variable pricing';
    }

    if (pricing.unit) {
      summary += ` per ${pricing.unit}`;
    }

    if (sourceCurrency !== targetCurrency) {
      summary += ` (converted from ${sourceCurrency})`;
    }

    // Add validation info
    if (settings.showCostValidation) {
      const validation = validateModelCost(pricing, model.name, model.domain);
      const factCheck = factCheckModelCost(model.name, pricing);

      if (validation.issues.length > 0 || factCheck.issues.length > 0) {
        summary += '\n⚠️ Validation issues found';
      }
    }

    if (model.pricing.length > 1) {
      summary += ` (${model.pricing.length} pricing options)`;
    }

    return summary;
  };

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) return;
        onOpen(m, e.currentTarget);
      }}
      className={`group/row relative grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${rowBg} px-3 py-2 text-left transition cursor-pointer hover:border-accent ${isFocused ? 'ring-2 ring-accent z-10' : ''}`}
    >
      <div className="col-span-1 flex justify-center items-center h-full">
        <RoundCheckbox
          checked={!!isSelected}
          onChange={(checked) => onSelect && onSelect(m, checked)}
          size="sm"
          ariaLabel={`Select ${m.name}`}
        />
      </div>

      <div className="col-span-3 flex min-w-0 items-center gap-2 overflow-hidden text-left">
        <Database className={`h-4 w-4 flex-shrink-0 align-middle ${textSecondary}`} />
        <div className="flex min-w-0 flex-col">
          <span className={`truncate text-sm ${textMain}`} title={m.name || 'Unknown Model'}>{(m.name || 'Unknown Model').replace(/^[^/]+\//, '')}</span>
          <span className={`truncate text-xs ${subtleText} flex items-center gap-1`}>
            <span className="truncate">{m.provider || ((m.name || '').includes('/') ? (m.name || '').split('/')[0] : '')}</span> · <Download className="h-3 w-3 flex-shrink-0 align-middle relative top-0.5" /> {kfmt(m.downloads || 0)}
          </span>
        </div>
      </div>

      <div className={`col-span-2 truncate text-sm ${textSecondary}`}>
        {formatReleaseDate(m)}
      </div>
      <div className={`col-span-2 flex items-center gap-2 text-sm ${textSecondary} overflow-hidden`}>
        <DomainIcon d={m.domain} className="h-4 w-4 flex-shrink-0 align-middle" />
        <span className="truncate">{m.domain}</span>
      </div>
      <div className={`col-span-2 text-sm ${textSecondary}`} title={getCostSummary(m)}>
        {getCostDisplay(m)}
      </div>
      <div className={`col-span-2 truncate text-sm ${textSecondary}`} title={m.license?.name || 'Unknown'}>{m.license?.name || 'Unknown'}</div>
    </div>
  );
});

export function SkeletonRow() {
  return (
    <div className="grid w-full grid-cols-12 items-center gap-3 rounded-xl border border-border bg-bg-card px-3 py-3">
      <div className="col-span-1 h-4 rounded w-4 mx-auto bg-bg-input animate-pulse" />
      <div className="col-span-3 h-4 rounded bg-bg-input animate-pulse" />
      <div className="col-span-2 h-4 rounded bg-bg-input animate-pulse" />
      <div className="col-span-2 h-4 rounded bg-bg-input animate-pulse" />
      <div className="col-span-2 h-4 rounded bg-bg-input animate-pulse" />
      <div className="col-span-2 h-4 rounded bg-bg-input animate-pulse" />
    </div>
  );
}
