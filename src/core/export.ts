import { FinanceData, Transaction } from './types.js';
import { loadData, getCurrentMonthTransactions } from './storage.js';

// ==================== CSV EXPORT ====================

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export all transactions to CSV format
 */
export function exportTransactionsToCSV(
  options: {
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: 'income' | 'expense';
  } = {}
): string {
  const data = loadData();
  let transactions = [...data.transactions];
  
  // Apply filters
  if (options.startDate) {
    transactions = transactions.filter(t => t.date >= options.startDate!);
  }
  if (options.endDate) {
    transactions = transactions.filter(t => t.date <= options.endDate!);
  }
  if (options.category) {
    transactions = transactions.filter(
      t => t.category.toLowerCase() === options.category!.toLowerCase()
    );
  }
  if (options.type) {
    transactions = transactions.filter(t => t.type === options.type);
  }
  
  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  
  // Build CSV
  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'Tags', 'Recurring'];
  const rows = transactions.map(t => [
    escapeCSV(t.date),
    escapeCSV(t.type),
    escapeCSV(t.category),
    escapeCSV(t.description),
    escapeCSV(t.type === 'expense' ? -t.amount : t.amount),
    escapeCSV(t.currency || 'USD'),
    escapeCSV(t.tags?.join('; ') || ''),
    escapeCSV(t.recurring ? 'Yes' : 'No'),
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export monthly summary to CSV
 */
export function exportMonthlySummaryToCSV(year?: number): string {
  const data = loadData();
  const targetYear = year || new Date().getFullYear();
  
  // Group transactions by month
  const monthlyData: Record<string, { income: number; expenses: number; transactions: number }> = {};
  
  for (let month = 0; month < 12; month++) {
    const monthKey = `${targetYear}-${String(month + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { income: 0, expenses: 0, transactions: 0 };
  }
  
  data.transactions
    .filter(t => t.date.startsWith(String(targetYear)))
    .forEach(t => {
      const monthKey = t.date.substring(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].transactions++;
        if (t.type === 'income') {
          monthlyData[monthKey].income += t.amount;
        } else {
          monthlyData[monthKey].expenses += t.amount;
        }
      }
    });
  
  // Build CSV
  const headers = ['Month', 'Income', 'Expenses', 'Net', 'Transactions'];
  const rows = Object.entries(monthlyData).map(([month, data]) => [
    month,
    data.income.toFixed(2),
    data.expenses.toFixed(2),
    (data.income - data.expenses).toFixed(2),
    data.transactions,
  ]);
  
  // Add totals row
  const totals = Object.values(monthlyData).reduce(
    (acc, data) => ({
      income: acc.income + data.income,
      expenses: acc.expenses + data.expenses,
      transactions: acc.transactions + data.transactions,
    }),
    { income: 0, expenses: 0, transactions: 0 }
  );
  
  rows.push([
    'TOTAL',
    totals.income.toFixed(2),
    totals.expenses.toFixed(2),
    (totals.income - totals.expenses).toFixed(2),
    totals.transactions,
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export category breakdown to CSV
 */
export function exportCategoryBreakdownToCSV(
  startDate?: string,
  endDate?: string
): string {
  const data = loadData();
  let transactions = [...data.transactions];
  
  if (startDate) {
    transactions = transactions.filter(t => t.date >= startDate);
  }
  if (endDate) {
    transactions = transactions.filter(t => t.date <= endDate);
  }
  
  // Group by category
  const categoryData: Record<string, { income: number; expenses: number; count: number }> = {};
  
  transactions.forEach(t => {
    if (!categoryData[t.category]) {
      categoryData[t.category] = { income: 0, expenses: 0, count: 0 };
    }
    categoryData[t.category].count++;
    if (t.type === 'income') {
      categoryData[t.category].income += t.amount;
    } else {
      categoryData[t.category].expenses += t.amount;
    }
  });
  
  // Build CSV
  const headers = ['Category', 'Income', 'Expenses', 'Net', 'Transaction Count'];
  const rows = Object.entries(categoryData)
    .sort((a, b) => (b[1].expenses + b[1].income) - (a[1].expenses + a[1].income))
    .map(([category, data]) => [
      escapeCSV(category),
      data.income.toFixed(2),
      data.expenses.toFixed(2),
      (data.income - data.expenses).toFixed(2),
      data.count,
    ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export for tax purposes (income/expenses summary with categories)
 */
export function exportTaxSummaryToCSV(year: number): string {
  const data = loadData();
  
  const transactions = data.transactions.filter(t => 
    t.date.startsWith(String(year))
  );
  
  // Separate income and expenses
  const incomeByCategory: Record<string, number> = {};
  const expensesByCategory: Record<string, number> = {};
  
  transactions.forEach(t => {
    if (t.type === 'income') {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    } else {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    }
  });
  
  const lines: string[] = [];
  
  // Header
  lines.push(`Tax Summary for ${year}`);
  lines.push('');
  
  // Income section
  lines.push('INCOME');
  lines.push('Category,Amount');
  let totalIncome = 0;
  Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amount]) => {
      lines.push(`${escapeCSV(cat)},${amount.toFixed(2)}`);
      totalIncome += amount;
    });
  lines.push(`Total Income,${totalIncome.toFixed(2)}`);
  lines.push('');
  
  // Expenses section
  lines.push('EXPENSES');
  lines.push('Category,Amount');
  let totalExpenses = 0;
  Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amount]) => {
      lines.push(`${escapeCSV(cat)},${amount.toFixed(2)}`);
      totalExpenses += amount;
    });
  lines.push(`Total Expenses,${totalExpenses.toFixed(2)}`);
  lines.push('');
  
  // Net
  lines.push(`Net Income,${(totalIncome - totalExpenses).toFixed(2)}`);
  
  return lines.join('\n');
}
