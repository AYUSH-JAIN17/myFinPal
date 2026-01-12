// ==================== INTERFACES ====================

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  currency?: string;
  recurring?: boolean;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  alertThreshold: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
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

export interface GoalWithProgress extends SavingsGoal {
  percentComplete: number;
  remaining: number;
  onTrack: boolean;
  projectedCompletion?: string;
  monthlyNeeded?: number;
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  nextDue: string;
  lastProcessed?: string;
  active: boolean;
  currency?: string;
}

export interface UpcomingRecurring extends RecurringTransaction {
  nextDate: string;
  daysUntilDue: number;
}

export interface SpendingInsight {
  type: 'warning' | 'info' | 'tip';
  message: string;
  category?: string;
  amount?: number;
  amounts?: number[];  // Array of amounts to be formatted (replaces {0}, {1}, etc. in message)
}

export interface DashboardData {
  balance: number;
  income: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  spendingByCategory: Record<string, number>;
  insights: SpendingInsight[];
  budgets: Budget[];
  recentTransactions: Transaction[];
}

export interface SpendingAnalysis {
  totalIncome: number;
  totalExpenses: number;
  totalSpending: number;
  netSavings: number;
  averageDaily: number;
  transactionCount: number;
  byCategory: Record<string, number>;
  topCategory: string;
  topCategories: { category: string; amount: number }[];
  monthlyTrend?: Record<string, number>;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface GoalsSummary {
  totalGoals: number;
  totalTarget: number;
  totalSaved: number;
  overallProgress: number;
  completedGoals: number;
}
