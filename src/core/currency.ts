import { DEFAULT_EXCHANGE_RATES, SUPPORTED_CURRENCIES, CurrencyCode, FinanceData } from './types.js';
import { loadData, saveData } from './storage.js';

// ==================== EXCHANGE RATE API ====================

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch fresh exchange rates from API
 */
export async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(EXCHANGE_RATE_API_URL);
    if (!response.ok) {
      console.error('Failed to fetch exchange rates:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.rates as Record<string, number>;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

/**
 * Update cached exchange rates if stale (older than 24 hours)
 */
export async function updateExchangeRatesIfStale(): Promise<Record<string, number>> {
  const data = loadData();
  const now = Date.now();
  
  // Check if we have cached rates and they're still fresh
  if (data.exchangeRates?.rates && data.exchangeRates?.lastUpdated) {
    const lastUpdated = new Date(data.exchangeRates.lastUpdated).getTime();
    const age = now - lastUpdated;
    
    if (age < CACHE_DURATION_MS) {
      console.log(`Using cached exchange rates (${Math.round(age / 3600000)}h old)`);
      return data.exchangeRates.rates;
    }
  }
  
  // Fetch fresh rates
  console.log('Fetching fresh exchange rates...');
  const freshRates = await fetchExchangeRates();
  
  if (freshRates) {
    // Cache the new rates
    data.exchangeRates = {
      rates: freshRates,
      lastUpdated: new Date().toISOString(),
    };
    saveData(data);
    console.log('Exchange rates updated successfully');
    return freshRates;
  }
  
  // Fallback to cached or default rates
  console.log('Using fallback exchange rates');
  return data.exchangeRates?.rates || DEFAULT_EXCHANGE_RATES;
}

// ==================== CURRENCY CONVERSION ====================

/**
 * Get current exchange rates (uses cached rates or defaults)
 */
export function getExchangeRates(data: FinanceData): Record<string, number> {
  if (data.exchangeRates && data.exchangeRates.rates) {
    return data.exchangeRates.rates;
  }
  return DEFAULT_EXCHANGE_RATES;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates?: Record<string, number>
): { convertedAmount: number; rate: number } {
  const exchangeRates = rates || DEFAULT_EXCHANGE_RATES;
  
  // Normalize currency codes
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  if (from === to) {
    return { convertedAmount: amount, rate: 1 };
  }
  
  // Convert to USD first (base currency), then to target
  const fromRate = exchangeRates[from] || 1;
  const toRate = exchangeRates[to] || 1;
  
  // amount in FROM -> USD -> TO
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  const rate = toRate / fromRate;
  
  return {
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    rate: Math.round(rate * 10000) / 10000,
  };
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF ',
    CNY: '¥',
    INR: '₹',
    MXN: 'MX$',
    BRL: 'R$',
    KRW: '₩',
  };
  
  const symbol = symbols[currency.toUpperCase()] || currency + ' ';
  
  // Format based on currency
  if (currency === 'JPY' || currency === 'KRW') {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Set default currency for the account
 */
export function setDefaultCurrency(currency: string): boolean {
  const data = loadData();
  const upperCurrency = currency.toUpperCase();
  
  if (!SUPPORTED_CURRENCIES.includes(upperCurrency as CurrencyCode)) {
    return false;
  }
  
  data.defaultCurrency = upperCurrency;
  saveData(data);
  return true;
}

/**
 * Get all transactions converted to a single currency
 */
export function getTransactionsInCurrency(
  data: FinanceData,
  targetCurrency: string
): {
  transactions: Array<{
    id: string;
    date: string;
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    category: string;
    description: string;
    type: 'income' | 'expense';
  }>;
  totalIncome: number;
  totalExpenses: number;
} {
  const rates = getExchangeRates(data);
  const target = targetCurrency.toUpperCase();
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  const transactions = data.transactions.map(t => {
    const originalCurrency = t.currency || data.defaultCurrency || 'USD';
    const { convertedAmount } = convertCurrency(t.amount, originalCurrency, target, rates);
    
    if (t.type === 'income') {
      totalIncome += convertedAmount;
    } else {
      totalExpenses += convertedAmount;
    }
    
    return {
      id: t.id,
      date: t.date,
      originalAmount: t.amount,
      originalCurrency,
      convertedAmount,
      targetCurrency: target,
      category: t.category,
      description: t.description,
      type: t.type,
    };
  });
  
  return {
    transactions,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
  };
}

/**
 * Get balance in a specific currency
 */
export function getBalanceInCurrency(
  data: FinanceData,
  targetCurrency: string
): {
  balance: number;
  currency: string;
  breakdown: Record<string, { original: number; converted: number }>;
} {
  const rates = getExchangeRates(data);
  const target = targetCurrency.toUpperCase();
  
  // Track amounts by original currency
  const byCurrency: Record<string, number> = {};
  
  data.transactions.forEach(t => {
    const currency = t.currency || data.defaultCurrency || 'USD';
    const amount = t.type === 'income' ? t.amount : -t.amount;
    byCurrency[currency] = (byCurrency[currency] || 0) + amount;
  });
  
  // Convert all to target currency
  let totalBalance = 0;
  const breakdown: Record<string, { original: number; converted: number }> = {};
  
  Object.entries(byCurrency).forEach(([currency, amount]) => {
    const { convertedAmount } = convertCurrency(amount, currency, target, rates);
    breakdown[currency] = { original: amount, converted: convertedAmount };
    totalBalance += convertedAmount;
  });
  
  return {
    balance: Math.round(totalBalance * 100) / 100,
    currency: target,
    breakdown,
  };
}

/**
 * Get supported currencies list
 */
export function getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
  const currencyNames: Record<string, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    MXN: 'Mexican Peso',
    BRL: 'Brazilian Real',
    KRW: 'South Korean Won',
  };
  
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    MXN: 'MX$',
    BRL: 'R$',
    KRW: '₩',
  };
  
  return SUPPORTED_CURRENCIES.map(code => ({
    code,
    name: currencyNames[code] || code,
    symbol: symbols[code] || code,
  }));
}
