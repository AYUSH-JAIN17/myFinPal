import { v4 as uuidv4 } from 'uuid';
import { RecurringTransaction, Transaction, FinanceData } from './types.js';
import { loadData, saveData } from './storage.js';

// ==================== RECURRING TRANSACTION MANAGEMENT ====================

/**
 * Create a new recurring transaction
 */
export function createRecurringTransaction(
  amount: number,
  type: 'income' | 'expense',
  category: string,
  description: string,
  frequency: RecurringTransaction['frequency'],
  startDate?: string,
  currency?: string
): RecurringTransaction {
  const start = startDate || new Date().toISOString().split('T')[0];
  
  return {
    id: uuidv4(),
    amount: Math.abs(amount),
    type,
    category,
    description,
    frequency,
    startDate: start,
    nextDue: start,
    active: true,
    currency,
  };
}

/**
 * Calculate the next due date based on frequency
 */
export function calculateNextDueDate(
  currentDate: string,
  frequency: RecurringTransaction['frequency']
): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Process all due recurring transactions and create actual transactions
 */
export function processRecurringTransactions(): {
  processed: number;
  transactions: Transaction[];
} {
  const data = loadData();
  const recurringList = data.recurringTransactions || [];
  const today = new Date().toISOString().split('T')[0];
  const processedTransactions: Transaction[] = [];
  
  for (const recurring of recurringList) {
    if (!recurring.active) continue;
    
    // Process all missed dates up to today
    while (recurring.nextDue <= today) {
      const transaction: Transaction = {
        id: uuidv4(),
        date: recurring.nextDue,
        amount: recurring.amount,
        category: recurring.category,
        description: `${recurring.description} (recurring)`,
        type: recurring.type,
        recurring: true,
        recurringFrequency: recurring.frequency,
        currency: recurring.currency,
      };
      
      data.transactions.push(transaction);
      processedTransactions.push(transaction);
      
      recurring.lastProcessed = recurring.nextDue;
      recurring.nextDue = calculateNextDueDate(recurring.nextDue, recurring.frequency);
    }
  }
  
  if (processedTransactions.length > 0) {
    saveData(data);
  }
  
  return {
    processed: processedTransactions.length,
    transactions: processedTransactions,
  };
}

/**
 * Get all recurring transactions
 */
export function getRecurringTransactions(data: FinanceData): RecurringTransaction[] {
  return data.recurringTransactions || [];
}

/**
 * Toggle recurring transaction active status
 */
export function toggleRecurringTransaction(id: string, active: boolean): boolean {
  const data = loadData();
  const recurringList = data.recurringTransactions || [];
  const recurring = recurringList.find(r => r.id === id);
  
  if (!recurring) return false;
  
  recurring.active = active;
  saveData(data);
  return true;
}

/**
 * Delete a recurring transaction
 */
export function deleteRecurringTransaction(id: string): boolean {
  const data = loadData();
  const recurringList = data.recurringTransactions || [];
  const index = recurringList.findIndex(r => r.id === id);
  
  if (index < 0) return false;
  
  recurringList.splice(index, 1);
  data.recurringTransactions = recurringList;
  saveData(data);
  return true;
}

/**
 * Get upcoming recurring transactions for the next N days
 */
export function getUpcomingRecurring(days: number = 30): {
  recurring: RecurringTransaction;
  dueDate: string;
  daysUntilDue: number;
}[] {
  const data = loadData();
  const recurringList = data.recurringTransactions || [];
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const upcoming: {
    recurring: RecurringTransaction;
    dueDate: string;
    daysUntilDue: number;
  }[] = [];
  
  for (const recurring of recurringList) {
    if (!recurring.active) continue;
    
    const dueDate = new Date(recurring.nextDue);
    if (dueDate <= futureDate) {
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      upcoming.push({
        recurring,
        dueDate: recurring.nextDue,
        daysUntilDue,
      });
    }
  }
  
  return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
