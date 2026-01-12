import { Transaction, Budget, SpendingInsight, FinanceData } from './types.js';
import { getCurrentMonthTransactions, calculateSpendingByCategory } from './storage.js';

// ==================== ANALYTICS FUNCTIONS ====================

export function analyzeSpending(data: FinanceData): {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  byCategory: Record<string, number>;
  topCategories: { category: string; amount: number }[];
} {
  const monthlyTransactions = getCurrentMonthTransactions(data);
  
  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const byCategory = calculateSpendingByCategory(monthlyTransactions);
  
  const topCategories = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  return {
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    byCategory,
    topCategories
  };
}

export function checkBudgetAlerts(data: FinanceData): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  const monthlyTransactions = getCurrentMonthTransactions(data);
  const spending = calculateSpendingByCategory(monthlyTransactions);
  
  for (const budget of data.budgets) {
    const spent = spending[budget.category] || 0;
    const percentUsed = (spent / budget.limit) * 100;
    
    if (percentUsed >= 100) {
      insights.push({
        type: 'warning',
        message: `🚨 Budget EXCEEDED for ${budget.category}! Spent {0} of {1} limit.`,
        category: budget.category,
        amount: spent - budget.limit,
        amounts: [spent, budget.limit]
      });
    } else if (percentUsed >= budget.alertThreshold) {
      insights.push({
        type: 'warning',
        message: `⚠️ ${budget.category} budget at ${percentUsed.toFixed(0)}% ({0} of {1})`,
        category: budget.category,
        amount: budget.limit - spent,
        amounts: [spent, budget.limit]
      });
    }
  }
  
  return insights;
}

export function generateInsights(data: FinanceData): SpendingInsight[] {
  const insights: SpendingInsight[] = [];
  const analysis = analyzeSpending(data);
  
  // Budget alerts
  insights.push(...checkBudgetAlerts(data));
  
  // Savings rate insight
  if (analysis.totalIncome > 0) {
    const savingsRate = (analysis.netSavings / analysis.totalIncome) * 100;
    
    if (savingsRate < 0) {
      insights.push({
        type: 'warning',
        message: `📉 You're spending more than you earn this month. Deficit: {0}`,
        amounts: [Math.abs(analysis.netSavings)]
      });
    } else if (savingsRate < 10) {
      insights.push({
        type: 'tip',
        message: `💡 Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% for financial health.`
      });
    } else if (savingsRate >= 20) {
      insights.push({
        type: 'info',
        message: `🎉 Great job! You're saving ${savingsRate.toFixed(1)}% of your income.`
      });
    }
  }
  
  // Top spending category
  if (analysis.topCategories.length > 0) {
    const top = analysis.topCategories[0];
    const percentage = analysis.totalExpenses > 0 
      ? ((top.amount / analysis.totalExpenses) * 100).toFixed(0)
      : 0;
    
    insights.push({
      type: 'info',
      message: `📊 Your biggest expense category is ${top.category} at {0} (${percentage}% of spending)`,
      amounts: [top.amount]
    });
  }
  
  // Weekday vs weekend spending
  const weekdayVsWeekend = analyzeWeekdayVsWeekend(data);
  if (weekdayVsWeekend.difference > 20) {
    insights.push({
      type: 'tip',
      message: `🗓️ You spend ${weekdayVsWeekend.difference.toFixed(0)}% more on ${weekdayVsWeekend.higher}s. Consider balancing your spending.`
    });
  }
  
  return insights;
}

function analyzeWeekdayVsWeekend(data: FinanceData): {
  weekdayAvg: number;
  weekendAvg: number;
  difference: number;
  higher: 'weekday' | 'weekend';
} {
  const transactions = getCurrentMonthTransactions(data).filter(t => t.type === 'expense');
  
  let weekdayTotal = 0, weekdayCount = 0;
  let weekendTotal = 0, weekendCount = 0;
  
  transactions.forEach(t => {
    const day = new Date(t.date).getDay();
    if (day === 0 || day === 6) {
      weekendTotal += t.amount;
      weekendCount++;
    } else {
      weekdayTotal += t.amount;
      weekdayCount++;
    }
  });
  
  const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
  const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;
  
  const higher = weekendAvg > weekdayAvg ? 'weekend' : 'weekday';
  const difference = Math.abs(weekendAvg - weekdayAvg) / Math.max(weekdayAvg, weekendAvg, 1) * 100;
  
  return { weekdayAvg, weekendAvg, difference, higher };
}

// ==================== AUTO-CATEGORIZATION ====================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'sushi', 'lunch', 'dinner', 'breakfast', 'doordash', 'uber eats', 'grubhub'],
  'Groceries': ['grocery', 'supermarket', 'walmart', 'costco', 'trader joe', 'whole foods', 'kroger', 'safeway', 'target'],
  'Transportation': ['uber', 'lyft', 'gas', 'fuel', 'parking', 'metro', 'subway', 'bus', 'train', 'airline', 'flight'],
  'Shopping': ['amazon', 'ebay', 'mall', 'store', 'shop', 'buy', 'purchase'],
  'Entertainment': ['netflix', 'spotify', 'movie', 'theater', 'concert', 'game', 'steam', 'playstation', 'xbox'],
  'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'rent', 'mortgage', 'insurance', 'utility'],
  'Subscriptions': ['subscription', 'membership', 'monthly', 'annual', 'premium'],
  'Healthcare': ['doctor', 'hospital', 'pharmacy', 'medicine', 'dental', 'vision', 'health'],
  'Education': ['book', 'course', 'tuition', 'school', 'university', 'udemy', 'coursera'],
  'Personal Care': ['salon', 'spa', 'haircut', 'gym', 'fitness'],
  'Travel': ['hotel', 'airbnb', 'booking', 'vacation', 'trip'],
  'Income': ['salary', 'paycheck', 'deposit', 'refund', 'cashback', 'dividend', 'interest']
};

export function suggestCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Other';
}
