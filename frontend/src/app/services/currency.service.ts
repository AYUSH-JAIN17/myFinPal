import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  lastUpdated?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private apiUrl = 'http://localhost:3000/api';

  // Supported currencies
  readonly currencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  ];

  // Current selected currency (reactive signal)
  selectedCurrency = signal<string>('USD');
  
  // Exchange rates (base currency is USD)
  private exchangeRates = signal<Record<string, number>>({
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.0,
    CAD: 1.25,
    AUD: 1.35,
    CHF: 0.92,
    CNY: 6.45,
    INR: 83.0,
    MXN: 17.0,
    BRL: 5.0,
    KRW: 1300.0,
  });

  // Computed conversion rate from USD to selected currency
  conversionRate = computed(() => {
    return this.exchangeRates()[this.selectedCurrency()] || 1;
  });

  constructor(private http: HttpClient) {
    // Load saved currency from localStorage
    const saved = localStorage.getItem('myfinpal-currency');
    if (saved && this.currencies.some((c) => c.code === saved)) {
      this.selectedCurrency.set(saved);
    }

    // Fetch latest exchange rates from backend
    this.loadExchangeRates();
  }

  private loadExchangeRates() {
    this.http.get<ExchangeRates>(`${this.apiUrl}/currency/rates`).subscribe({
      next: (data) => {
        if (data?.rates) {
          this.exchangeRates.set(data.rates);
        }
      },
      error: (err) => {
        console.warn('Failed to load exchange rates, using defaults', err);
      },
    });
  }

  setCurrency(code: string) {
    this.selectedCurrency.set(code);
    localStorage.setItem('myfinpal-currency', code);

    // Also update on backend
    this.http.post(`${this.apiUrl}/currency/default`, { currency: code }).subscribe();
  }

  /**
   * Convert an amount from USD to the selected currency (for display)
   */
  convert(amountInUSD: number): number {
    return amountInUSD * this.conversionRate();
  }

  /**
   * Convert an amount from the selected currency to USD (for storage)
   * Use this when user enters an amount in their selected currency
   */
  convertToUSD(amountInSelectedCurrency: number): number {
    const rate = this.conversionRate();
    if (rate === 0) return amountInSelectedCurrency;
    return amountInSelectedCurrency / rate;
  }

  /**
   * Format an amount with conversion applied
   */
  formatAmount(amountInUSD: number): string {
    const converted = this.convert(amountInUSD);
    const symbol = this.getCurrencySymbol();
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getCurrencySymbol(code?: string): string {
    const currency = this.currencies.find(
      (c) => c.code === (code || this.selectedCurrency())
    );
    return currency?.symbol || '$';
  }

  getCurrency(code?: string): Currency | undefined {
    return this.currencies.find(
      (c) => c.code === (code || this.selectedCurrency())
    );
  }

  /**
   * Format an insight message by replacing {0}, {1}, etc. with formatted currency amounts
   */
  formatInsightMessage(message: string, amounts?: number[]): string {
    if (!amounts || amounts.length === 0) {
      return message;
    }
    
    let formattedMessage = message;
    amounts.forEach((amount, index) => {
      const formattedAmount = this.formatAmount(amount);
      formattedMessage = formattedMessage.replace(`{${index}}`, formattedAmount);
    });
    
    return formattedMessage;
  }
}
