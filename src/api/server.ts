import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

import {
  Transaction,
  Budget,
  loadData,
  saveData,
  getCurrentMonthTransactions,
  calculateBalance,
  calculateSpendingByCategory,
  analyzeSpending,
  suggestCategory,
  checkBudgetAlerts,
  generateInsights,
  createRecurringTransaction,
  processRecurringTransactions,
  getUpcomingRecurring,
  toggleRecurringTransaction,
  deleteRecurringTransaction,
  createGoal,
  addContribution,
  withdrawFromGoal,
  getGoalsWithProgress,
  deleteGoal,
  getGoalsSummary,
  exportTransactionsToCSV,
  exportMonthlySummaryToCSV,
  exportCategoryBreakdownToCSV,
  exportTaxSummaryToCSV,
  convertCurrency,
  setDefaultCurrency,
  getBalanceInCurrency,
  getSupportedCurrencies,
  updateExchangeRatesIfStale,
  getExchangeRates,
} from '../core/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== DASHBOARD ====================

app.get('/api/dashboard', (req: Request, res: Response) => {
  const data = loadData();
  const balance = calculateBalance(data);
  const analysis = analyzeSpending(data);
  const insights = generateInsights(data);
  const goalsProgress = getGoalsWithProgress(data);
  const upcoming = getUpcomingRecurring(7);
  
  // Calculate budget data with spent amounts
  const spending = calculateSpendingByCategory(getCurrentMonthTransactions(data));
  const budgets = data.budgets.map(b => ({
    ...b,
    spent: spending[b.category] || 0,
    remaining: b.limit - (spending[b.category] || 0),
    percentUsed: ((spending[b.category] || 0) / b.limit) * 100,
  }));
  
  res.json({
    balance,
    income: analysis.totalIncome,
    monthlyIncome: analysis.totalIncome,
    expenses: analysis.totalExpenses,
    monthlyExpenses: analysis.totalExpenses,
    savings: analysis.netSavings,
    topCategories: analysis.topCategories,
    spendingByCategory: analysis.byCategory,
    insights,
    budgets,
    goals: goalsProgress.slice(0, 3),
    upcomingRecurring: upcoming.slice(0, 5),
    recentTransactions: getCurrentMonthTransactions(data).slice(-5).reverse(),
  });
});

// ==================== TRANSACTIONS ====================

const transactionsRouter = Router();

transactionsRouter.get('/', (req: Request, res: Response) => {
  const data = loadData();
  const { startDate, endDate, category, type } = req.query;
  
  let transactions = [...data.transactions];
  
  if (startDate) transactions = transactions.filter(t => t.date >= (startDate as string));
  if (endDate) transactions = transactions.filter(t => t.date <= (endDate as string));
  if (category) transactions = transactions.filter(t => t.category.toLowerCase() === (category as string).toLowerCase());
  if (type) transactions = transactions.filter(t => t.type === type);
  
  transactions.sort((a, b) => b.date.localeCompare(a.date));
  
  res.json({ transactions, total: transactions.length, categories: data.categories });
});

transactionsRouter.get('/current-month', (req: Request, res: Response) => {
  const data = loadData();
  const transactions = getCurrentMonthTransactions(data);
  res.json(transactions.reverse());
});

transactionsRouter.post('/', (req: Request, res: Response) => {
  const data = loadData();
  const { amount, type, description, category, date, currency } = req.body;
  
  const transaction: Transaction = {
    id: uuidv4(),
    date: date || new Date().toISOString().split('T')[0],
    amount: Math.abs(amount),
    category: category || suggestCategory(description),
    description,
    type,
    currency,
  };
  
  data.transactions.push(transaction);
  saveData(data);
  
  const alerts = checkBudgetAlerts(data);
  const categoryAlert = alerts.find(a => a.category === transaction.category);
  
  res.status(201).json({ transaction, alert: categoryAlert });
});

transactionsRouter.delete('/:id', (req: Request, res: Response) => {
  const data = loadData();
  const { id } = req.params;
  
  const index = data.transactions.findIndex(t => t.id === id);
  if (index < 0) return res.status(404).json({ error: 'Transaction not found' });
  
  const deleted = data.transactions.splice(index, 1)[0];
  saveData(data);
  
  res.json({ deleted });
});

transactionsRouter.get('/categories', (req: Request, res: Response) => {
  const data = loadData();
  res.json(data.categories);
});

transactionsRouter.get('/suggest-category', (req: Request, res: Response) => {
  const { description } = req.query;
  const category = suggestCategory(description as string || '');
  res.json({ category });
});

app.use('/api/transactions', transactionsRouter);

// ==================== BUDGETS ====================

const budgetsRouter = Router();

budgetsRouter.get('/', (req: Request, res: Response) => {
  const data = loadData();
  const spending = calculateSpendingByCategory(getCurrentMonthTransactions(data));
  
  const budgets = data.budgets.map(b => ({
    ...b,
    spent: spending[b.category] || 0,
    remaining: b.limit - (spending[b.category] || 0),
    percentUsed: ((spending[b.category] || 0) / b.limit) * 100,
  }));
  
  res.json(budgets);
});

budgetsRouter.post('/', (req: Request, res: Response) => {
  const data = loadData();
  const { category, limit, alertThreshold = 80 } = req.body;
  
  const existingIndex = data.budgets.findIndex(b => b.category.toLowerCase() === category.toLowerCase());
  const budget: Budget = { category, limit, spent: 0, alertThreshold };
  
  if (existingIndex >= 0) data.budgets[existingIndex] = budget;
  else data.budgets.push(budget);
  
  saveData(data);
  res.status(201).json(budget);
});

budgetsRouter.delete('/:category', (req: Request, res: Response) => {
  const data = loadData();
  const category = req.params.category as string;
  
  const index = data.budgets.findIndex(b => b.category.toLowerCase() === category.toLowerCase());
  if (index < 0) return res.status(404).json({ error: 'Budget not found' });
  
  const deleted = data.budgets.splice(index, 1)[0];
  saveData(data);
  
  res.json({ deleted });
});

app.use('/api/budgets', budgetsRouter);

// ==================== GOALS ====================

const goalsRouter = Router();

goalsRouter.get('/', (req: Request, res: Response) => {
  const data = loadData();
  const goalsWithProgress = getGoalsWithProgress(data);
  // Flatten the response so goal properties are at top level
  const goals = goalsWithProgress.map(({ goal, ...progress }) => ({
    ...goal,
    ...progress,
  }));
  const summary = getGoalsSummary(data);
  res.json({ goals, summary });
});

goalsRouter.post('/', (req: Request, res: Response) => {
  const data = loadData();
  const { name, targetAmount, deadline } = req.body;
  
  const goal = createGoal(name, targetAmount, deadline, data.defaultCurrency || 'USD');
  data.savingsGoals = data.savingsGoals || [];
  data.savingsGoals.push(goal);
  saveData(data);
  
  res.status(201).json(goal);
});

goalsRouter.post('/:id/contribute', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { amount, note } = req.body;
  const result = addContribution(id, amount, note);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result.goal);
});

goalsRouter.post('/:id/withdraw', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { amount, note } = req.body;
  const result = withdrawFromGoal(id, amount, note);
  if (!result.success) return res.status(400).json({ error: result.error });
  res.json(result.goal);
});

goalsRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const success = deleteGoal(id);
  if (!success) return res.status(404).json({ error: 'Goal not found' });
  res.json({ deleted: true });
});

app.use('/api/goals', goalsRouter);

// ==================== RECURRING ====================

const recurringRouter = Router();

recurringRouter.get('/', (req: Request, res: Response) => {
  const data = loadData();
  const recurring = data.recurringTransactions || [];
  const upcoming = getUpcomingRecurring(30);
  res.json({ recurring, upcoming });
});

recurringRouter.post('/', (req: Request, res: Response) => {
  const data = loadData();
  const { amount, type, category, description, frequency, startDate } = req.body;
  
  const recurring = createRecurringTransaction(
    amount, type, category || suggestCategory(description), description, frequency, startDate
  );
  
  data.recurringTransactions = data.recurringTransactions || [];
  data.recurringTransactions.push(recurring);
  saveData(data);
  
  res.status(201).json(recurring);
});

recurringRouter.patch('/:id/toggle', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { active } = req.body;
  const success = toggleRecurringTransaction(id, active);
  if (!success) return res.status(404).json({ error: 'Recurring transaction not found' });
  res.json({ success: true, active });
});

recurringRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const success = deleteRecurringTransaction(id);
  if (!success) return res.status(404).json({ error: 'Recurring transaction not found' });
  res.json({ deleted: true });
});

recurringRouter.post('/process', (req: Request, res: Response) => {
  const result = processRecurringTransactions();
  res.json(result);
});

app.use('/api/recurring', recurringRouter);

// ==================== ANALYTICS ====================

const analyticsRouter = Router();

analyticsRouter.get('/spending', (req: Request, res: Response) => {
  const data = loadData();
  const analysis = analyzeSpending(data);
  res.json(analysis);
});

analyticsRouter.get('/insights', (req: Request, res: Response) => {
  const data = loadData();
  const insights = generateInsights(data);
  res.json(insights);
});

analyticsRouter.get('/alerts', (req: Request, res: Response) => {
  const data = loadData();
  const alerts = checkBudgetAlerts(data);
  res.json(alerts);
});

app.use('/api/analytics', analyticsRouter);

// ==================== EXPORT ====================

const exportRouter = Router();

exportRouter.get('/transactions', (req: Request, res: Response) => {
  const { startDate, endDate, category, type } = req.query;
  const csv = exportTransactionsToCSV({
    startDate: startDate as string,
    endDate: endDate as string,
    category: category as string,
    type: type as 'income' | 'expense',
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  res.send(csv);
});

exportRouter.get('/monthly/:year', (req: Request, res: Response) => {
  const year = parseInt(req.params.year as string) || new Date().getFullYear();
  const csv = exportMonthlySummaryToCSV(year);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=monthly_${year}.csv`);
  res.send(csv);
});

exportRouter.get('/categories', (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const csv = exportCategoryBreakdownToCSV(startDate as string, endDate as string);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=categories.csv');
  res.send(csv);
});

exportRouter.get('/tax/:year', (req: Request, res: Response) => {
  const year = parseInt(req.params.year as string);
  const csv = exportTaxSummaryToCSV(year);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=tax_${year}.csv`);
  res.send(csv);
});

app.use('/api/export', exportRouter);

// ==================== CURRENCY ====================

const currencyRouter = Router();

currencyRouter.get('/supported', (req: Request, res: Response) => {
  const currencies = getSupportedCurrencies();
  res.json(currencies);
});

currencyRouter.get('/convert', (req: Request, res: Response) => {
  const { amount, from, to } = req.query;
  const result = convertCurrency(parseFloat(amount as string), from as string, to as string);
  res.json(result);
});

currencyRouter.get('/balance', (req: Request, res: Response) => {
  const data = loadData();
  const { currency } = req.query;
  const targetCurrency = (currency as string) || data.defaultCurrency || 'USD';
  const result = getBalanceInCurrency(data, targetCurrency);
  res.json(result);
});

currencyRouter.post('/default', (req: Request, res: Response) => {
  const { currency } = req.body;
  const success = setDefaultCurrency(currency);
  if (!success) return res.status(400).json({ error: 'Unsupported currency' });
  res.json({ success: true, currency });
});

currencyRouter.get('/rates', async (req: Request, res: Response) => {
  try {
    // Automatically fetch/refresh rates if stale or missing
    const rates = await updateExchangeRatesIfStale();
    const data = loadData();
    res.json({
      rates,
      lastUpdated: data.exchangeRates?.lastUpdated || new Date().toISOString(),
      source: 'live',
    });
  } catch (error) {
    // Fallback to cached/default rates on error
    const data = loadData();
    const rates = getExchangeRates(data);
    res.json({
      rates,
      lastUpdated: data.exchangeRates?.lastUpdated || null,
      source: data.exchangeRates?.lastUpdated ? 'cached' : 'default',
    });
  }
});

currencyRouter.post('/rates/refresh', async (req: Request, res: Response) => {
  try {
    const rates = await updateExchangeRatesIfStale();
    const data = loadData();
    res.json({
      success: true,
      rates,
      lastUpdated: data.exchangeRates?.lastUpdated || new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh exchange rates' });
  }
});

app.use('/api/currency', currencyRouter);

// ==================== SETTINGS ====================

app.get('/api/settings', (req: Request, res: Response) => {
  const data = loadData();
  res.json({
    defaultCurrency: data.defaultCurrency || 'USD',
    categories: data.categories,
    lastUpdated: data.lastUpdated,
  });
});

// ==================== START SERVER ====================

export function startApiServer() {
  app.listen(PORT, () => {
    console.log(`🚀 MyFinPal API running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  });
}

export { app };
