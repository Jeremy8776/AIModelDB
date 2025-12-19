// Currency utilities for model pricing display

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'INR' | 'CAD' | 'AUD' | 'CHF' | 'KRW';

// Currency symbol mapping
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: '₣',
  KRW: '₩'
};

// Currency names for display
export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  KRW: 'Korean Won'
};

// Exchange rates (would typically come from an API)
// Base currency: USD
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110.0,
  CNY: 6.45,
  INR: 74.5,
  CAD: 1.25,
  AUD: 1.35,
  CHF: 0.92,
  KRW: 1180.0
};

// Get currency symbol from currency code or string
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return '$'; // Default to USD
  
  const code = currency.toUpperCase() as CurrencyCode;
  return CURRENCY_SYMBOLS[code] || currency;
}

// Convert amount between currencies
export function convertCurrency(
  amount: number | string, 
  fromCurrency: CurrencyCode, 
  toCurrency: CurrencyCode
): number {
  const n = Number(amount);
  if (!isFinite(n)) return NaN;
  if (fromCurrency === toCurrency) return n;
  
  // Convert to USD first, then to target currency
  const usdAmount = n / EXCHANGE_RATES[fromCurrency];
  const convertedAmount = usdAmount * EXCHANGE_RATES[toCurrency];
  
  return Math.round(convertedAmount * 10000) / 10000; // Round to 4 decimal places
}

// Format currency amount with proper symbol and precision
export function formatCurrency(
  amount: number | null | undefined, 
  currency: CurrencyCode = 'USD'
): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  
  const symbol = CURRENCY_SYMBOLS[currency];
  
  // Different precision for different currencies
  if (currency === 'JPY' || currency === 'KRW') {
    // Yen and Won don't use decimal places
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  } else if (amount < 0.01) {
    // Very small amounts (like token costs) - show more precision
    return `${symbol}${amount.toFixed(6)}`;
  } else if (amount < 1) {
    // Small amounts - show 3 decimal places
    return `${symbol}${amount.toFixed(3)}`;
  } else {
    // Regular amounts - show 2 decimal places
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Detect currency from pricing string or model data
export function detectCurrency(pricing: any): CurrencyCode {
  if (pricing?.currency) {
    const normalized = pricing.currency.toUpperCase().replace(/[^A-Z]/g, '');
    if (normalized in CURRENCY_SYMBOLS) {
      return normalized as CurrencyCode;
    }
  }
  
  // Default fallback
  return 'USD';
}

// Validate if a cost seems reasonable for AI model pricing
export interface CostValidation {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
  suggestedRange?: { min: number; max: number };
}

export function validateModelCost(
  pricing: any, 
  modelName: string, 
  domain: string
): CostValidation {
  const validation: CostValidation = {
    isValid: true,
    confidence: 'high',
    issues: []
  };

  if (!pricing || (!pricing.flat && !pricing.input && !pricing.output)) {
    validation.isValid = false;
    validation.confidence = 'low';
    validation.issues.push('No pricing information available');
    return validation;
  }

  const currency = detectCurrency(pricing);
  
  // Convert to USD for validation
  let usdAmount = 0;
  if (pricing.flat) {
    usdAmount = convertCurrency(pricing.flat, currency, 'USD');
  } else if (pricing.input) {
    usdAmount = convertCurrency(pricing.input, currency, 'USD');
  }

  // Validation rules based on domain and pricing type
  if (pricing.input || pricing.output) {
    // API token pricing validation
    if (domain === 'LLM' || domain === 'VLM') {
      if (usdAmount > 0.1) {
        validation.issues.push('Token cost seems unusually high for LLM');
        validation.confidence = 'low';
      } else if (usdAmount < 0.000001) {
        validation.issues.push('Token cost seems unusually low');
        validation.confidence = 'medium';
      }
      validation.suggestedRange = { min: 0.000001, max: 0.1 };
    }
  } else if (pricing.flat) {
    // Flat rate validation
    const unit = pricing.unit?.toLowerCase() || '';
    if (unit.includes('month') || unit.includes('subscription')) {
      if (usdAmount > 1000) {
        validation.issues.push('Monthly subscription seems very expensive');
        validation.confidence = 'medium';
      } else if (usdAmount < 1) {
        validation.issues.push('Monthly subscription seems unusually cheap');
        validation.confidence = 'medium';
      }
      validation.suggestedRange = { min: 5, max: 500 };
    }
  }

  // Model-specific validation
  if (modelName.toLowerCase().includes('gpt-4')) {
    if (pricing.input && convertCurrency(pricing.input, currency, 'USD') < 0.01) {
      validation.issues.push('GPT-4 pricing seems lower than expected');
      validation.confidence = 'low';
    }
  }

  if (validation.issues.length > 0) {
    validation.isValid = false;
  }

  return validation;
}

// Fact-check pricing against known model costs
export function factCheckModelCost(modelName: string, pricing: any): CostValidation {
  const knownPricing: Record<string, { input?: number; output?: number; flat?: number; currency: CurrencyCode }> = {
    'gpt-4': { input: 0.03, output: 0.06, currency: 'USD' },
    'gpt-4-turbo': { input: 0.01, output: 0.03, currency: 'USD' },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002, currency: 'USD' },
    'claude-3-opus': { input: 0.015, output: 0.075, currency: 'USD' },
    'claude-3-sonnet': { input: 0.003, output: 0.015, currency: 'USD' },
    'claude-3-haiku': { input: 0.00025, output: 0.00125, currency: 'USD' },
  };

  const modelKey = modelName.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const known = knownPricing[modelKey];

  const validation: CostValidation = {
    isValid: true,
    confidence: 'medium',
    issues: []
  };

  if (!known) {
    validation.confidence = 'low';
    validation.issues.push('No reference pricing data available for fact-checking');
    return validation;
  }

  if (!pricing || (!pricing.input && !pricing.output)) {
    validation.isValid = false;
    validation.issues.push('Missing pricing data to fact-check');
    return validation;
  }

  const currency = detectCurrency(pricing);
  
  // Compare input costs
  if (known.input && pricing.input) {
    const actualUSD = convertCurrency(pricing.input, currency, 'USD');
    const difference = Math.abs(actualUSD - known.input) / known.input;
    
    if (difference > 0.5) { // More than 50% difference
      validation.isValid = false;
      validation.confidence = 'low';
      validation.issues.push(`Input cost differs significantly from known pricing (expected ~$${known.input})`);
    } else if (difference > 0.2) { // More than 20% difference
      validation.confidence = 'medium';
      validation.issues.push(`Input cost may be outdated (expected ~$${known.input})`);
    }
  }

  // Compare output costs
  if (known.output && pricing.output) {
    const actualUSD = convertCurrency(pricing.output, currency, 'USD');
    const difference = Math.abs(actualUSD - known.output) / known.output;
    
    if (difference > 0.5) {
      validation.isValid = false;
      validation.confidence = 'low';
      validation.issues.push(`Output cost differs significantly from known pricing (expected ~$${known.output})`);
    } else if (difference > 0.2) {
      validation.confidence = 'medium';
      validation.issues.push(`Output cost may be outdated (expected ~$${known.output})`);
    }
  }

  return validation;
}
