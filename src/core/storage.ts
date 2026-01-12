import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FinanceData, createEmptyFinanceData } from './types.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Data file path (stored in project root)
const DATA_FILE = join(__dirname, '..', '..', '..', 'data', 'finance-data.json');

// ==================== STORAGE FUNCTIONS ====================

export function loadData(): FinanceData {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as FinanceData;
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  // Return empty data if file doesn't exist or is corrupted
  const emptyData = createEmptyFinanceData();
  saveData(emptyData);
  return emptyData;
}

export function saveData(data: FinanceData): void {
  try {
    // Ensure directory exists
    const dir = dirname(DATA_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    data.lastUpdated = new Date().toISOString();
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving data:', error);
    throw error;
  }
}

// ==================== DATA HELPERS ====================

export function getCurrentMonthTransactions(data: FinanceData): FinanceData['transactions'] {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return data.transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
}

export function getTransactionsByCategory(
  transactions: FinanceData['transactions'],
  category: string
): FinanceData['transactions'] {
  return transactions.filter(t => 
    t.category.toLowerCase() === category.toLowerCase()
  );
}

export function calculateBalance(data: FinanceData): number {
  return data.transactions.reduce((sum, t) => {
    return sum + (t.type === 'income' ? t.amount : -t.amount);
  }, 0);
}

export function calculateSpendingByCategory(
  transactions: FinanceData['transactions']
): Record<string, number> {
  const spending: Record<string, number> = {};
  
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
  
  return spending;
}
