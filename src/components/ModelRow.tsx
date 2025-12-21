import React, { useContext } from 'react';
import { DatabaseZap, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Model } from '../types';
import { DomainIcon } from './UI';
import { kfmt } from '../utils/format';
import { formatCurrency, convertCurrency, detectCurrency, validateModelCost, factCheckModelCost, CurrencyCode } from '../utils/currency';

interface ModelRowProps {
  m: Model;
  onOpen: (m: Model, element?: HTMLElement) => void;
}

export const ModelRow = React.memo(function ModelRow({ m, onOpen }: ModelRowProps) {
  const { theme } = useContext(ThemeContext);
  const { settings } = useSettings();

  const rowBg = theme === 'dark'
    ? 'border-zinc-800 bg-zinc-950/40'
    : 'border-gray-400 bg-white shadow-sm';

  const textMain = theme === 'dark'
    ? 'text-zinc-100'
    : 'text-black';

  const textSecondary = theme === 'dark'
    ? 'text-zinc-300'
    : 'text-gray-800';

  const hoverBorder = theme === 'dark'
    ? 'hover:border-zinc-700'
    : 'hover:border-gray-600';

  const focusRing = theme === 'dark'
    ? 'focus:ring-zinc-600/40'
    : 'focus:ring-gray-500/60';

  const subtleText = theme === 'dark'
    ? 'text-zinc-500'
    : 'text-gray-700';

  // Format the release date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get cost display for the model with currency conversion and validation
  const getCostDisplay = (model: Model): JSX.Element => {
    // Check if model is open-source
    const isOpenSource = (model.license?.type === 'OSI' || model.license?.type === 'Copyleft') && model.license?.name && model.license.name !== 'Proprietary';

    // If open-source and no pricing, show Free and Local Run badge only
    if ((!model.pricing || model.pricing.length === 0) && isOpenSource) {
      const vramTag = (model.tags || []).find(t => /vram|gb|gpu/i.test(t));
      return (
        <span className="inline-flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded text-green-700 dark:bg-green-900/40 dark:text-green-300 text-sm font-medium">Free</span>
          <span className="px-1.5 py-0.5 rounded text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-medium">Local</span>
          {vramTag && (
            <span className="px-1.5 py-0.5 rounded text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 text-sm font-medium" title="Minimum VRAM requirement (from tags)">{vramTag}</span>
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

    // Helper to format API pricing - show cost per 1M tokens
    const formatEnterprisePricing = (inputCost: number, outputCost: number | null, currency: string): string => {
      if (outputCost !== null) {
        // Show blended cost (3:1 ratio input:output is typical)
        const blendedCost = (inputCost * 3 + outputCost) / 4;
        return formatCurrency(blendedCost, currency as any);
      }
      return formatCurrency(inputCost, currency as any);
    };

    const toPerMillion = (amount: number, unit?: string | null): number => {
      const u = (unit || '').toLowerCase();
      let perM = amount;
      if (u.includes('token')) perM = amount * 1_000_000;
      else if (u.includes('1k') || u.includes('thousand')) perM = amount * 1_000;
      // Heuristic: fix scuffed values accidentally scaled up
      if (perM > 10000) perM = perM / 1_000_000; // if someone passed per 1M but also tagged as per token
      if (perM > 10000) perM = perM / 1_000;     // last-resort correction
      return perM;
    };

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
      <span className="px-1.5 py-0.5 rounded text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 text-sm font-medium whitespace-nowrap">{label}</span>
    );

    // If open-source with API pricing, show both Free/Local AND API cost
    const vramTag = (model.tags || []).find(t => /vram|gb|gpu/i.test(t));
    return (
      <div className="flex items-center gap-1">
        <div className="flex flex-wrap gap-1">
          {isOpenSource && (
            <>
              <span className="px-1.5 py-0.5 rounded text-green-700 dark:bg-green-900/40 dark:text-green-300 text-sm font-medium">Free</span>
              <span className="px-1.5 py-0.5 rounded text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-medium">Local</span>
              {vramTag && (
                <span className="px-1.5 py-0.5 rounded text-gray-700 dark:bg-zinc-800 dark:text-zinc-200 text-sm font-medium" title="Minimum VRAM requirement (from tags)">{vramTag}</span>
              )}
            </>
          )}
          {displays.map((display, index) => (
            <React.Fragment key={index}>{renderBadge(display)}</React.Fragment>
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

  // Check if pricing is subscription-based
  const isSubscriptionPricing = (pricing: any): boolean => {
    if (!pricing.unit) return false;
    const unit = pricing.unit.toLowerCase();
    return unit.includes('month') ||
      unit.includes('year') ||
      unit.includes('annual') ||
      unit.includes('subscription') ||
      unit.includes('plan') ||
      (pricing.flat != null && !unit.includes('token') && !unit.includes('request') && !unit.includes('call'));
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
    <button
      onClick={(e) => onOpen(m, e.currentTarget)}
      className={`grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${rowBg} px-3 py-2 text-left transition ${hoverBorder} focus:outline-none focus:ring-2 ${focusRing}`}
    >
      <div className="col-span-3 flex min-w-0 items-center gap-2 overflow-hidden">
        <DatabaseZap className={`h-4 w-4 flex-shrink-0 align-middle ${textSecondary}`} />
        <div className="flex min-w-0 flex-col">
          <span className={`truncate text-sm ${textMain}`} title={m.name || 'Unknown Model'}>{(m.name || 'Unknown Model').replace(/^[^/]+\//, '')}</span>
          <span className={`truncate text-xs ${subtleText} flex items-center gap-1`}>
            <span className="truncate">{m.provider || ((m.name || '').includes('/') ? (m.name || '').split('/')[0] : '')}</span> · <Download className="h-3 w-3 flex-shrink-0 align-middle relative top-0.5" /> {kfmt(m.downloads || 0)}
          </span>
        </div>
      </div>
      <div className={`col-span-2 truncate text-sm ${textSecondary}`}>
        {formatDate(m.release_date)}
      </div>
      <div className={`col-span-2 flex items-center gap-2 text-sm ${textSecondary} overflow-hidden`}>
        <DomainIcon d={m.domain} className="h-4 w-4 flex-shrink-0 align-middle" />
        <span className="truncate">{m.domain}</span>
      </div>
      <div className={`col-span-2 text-sm ${textSecondary}`} title={getCostSummary(m)}>
        {getCostDisplay(m)}
      </div>
      <div className={`col-span-3 truncate text-sm ${textSecondary}`} title={m.license?.name || 'Unknown'}>{m.license?.name || 'Unknown'}</div>
    </button>
  );
});

export function SkeletonRow() {
  const { theme } = useContext(ThemeContext);

  const border = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
  const bg = theme === 'dark' ? 'bg-zinc-950/40' : 'bg-zinc-50/80';
  const shimmer = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200';

  return (
    <div className={`grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${border} ${bg} px-3 py-3`}>
      <div className={`col-span-3 h-4 rounded ${shimmer}`} />
      <div className={`col-span-2 h-4 rounded ${shimmer}`} />
      <div className={`col-span-2 h-4 rounded ${shimmer}`} />
      <div className={`col-span-2 h-4 rounded ${shimmer}`} />
      <div className={`col-span-3 h-4 rounded ${shimmer}`} />
    </div>
  );
}
