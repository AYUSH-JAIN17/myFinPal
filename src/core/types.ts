// ==================== DATA TYPES ====================

export interface Transaction {
  id: string;
  date: string;           // ISO date string
  amount: number;         // Positive = income, Negative = expense
  category: string;
  description: string;
  type: 'income' | 'expense';
  tags?: string[];
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  currency?: string;      // Currency code (e.g., 'USD', 'EUR')
  originalAmount?: number; // Original amount before conversion
  originalCurrency?: string; // Original currency before conversion
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;      // When the recurring transaction starts
  nextDue: string;        // Next scheduled date
  lastProcessed?: string; // Last time this was auto-logged
  active: boolean;        // Can be paused
  currency?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;           // e.g., "Vacation", "Emergency Fund"
  targetAmount: number;
  currentAmount: number;
  deadline?: string;      // Optional target date
  createdAt: string;
  currency: string;
  contributions: GoalContribution[];
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Budget {
  category: string;
  limit: number;          // Monthly limit
  spent: number;          // Current month spending
  alertThreshold: number; // Percentage (e.g., 80 = alert at 80%)
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  currency: string;
}

// ==================== CURRENCY TYPES ====================

export interface ExchangeRates {
  base?: string;
  date?: string;
  rates: Record<string, number>;
  lastUpdated?: string;  // ISO date string for cache invalidation
}

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'KRW'
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

// Default exchange rates (fallback when API unavailable)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.12,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1320.50,
};

export interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  categories: string[];
  lastUpdated: string;
  // Phase 3 additions
  recurringTransactions: RecurringTransaction[];
  savingsGoals: SavingsGoal[];
  defaultCurrency: string;
  exchangeRates?: ExchangeRates;
}

export interface SpendingInsight {
  type: 'warning' | 'info' | 'tip';
  message: string;
  category?: string;
  amount?: number;
  amounts?: number[];  // Array of amounts to be formatted by frontend (replaces {0}, {1}, etc. in message)
}

// ==================== CATEGORY CONSTANTS ====================

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Subscriptions',
  'Income',
  'Investments',
  'Gifts',
  'Personal Care',
  'Home',
  'Other'
];

// ==================== HELPER FUNCTIONS ====================

export function createEmptyFinanceData(): FinanceData {
  return {
    transactions: [],
    budgets: [],
    accounts: [
      {
        id: 'default',
        name: 'Main Account',
        type: 'checking',
        balance: 0,
        currency: 'USD'
      }
    ],
    categories: [...DEFAULT_CATEGORIES],
    lastUpdated: new Date().toISOString(),
    // Phase 3 additions
    recurringTransactions: [],
    savingsGoals: [],
    defaultCurrency: 'USD',
  };
}
