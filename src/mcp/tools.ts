import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { v4 as uuidv4 } from 'uuid';

import { server } from './server.js';
import {
  Transaction,
  Budget,
  RecurringTransaction,
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
  getGoalsWithProgress,
  deleteGoal,
  getGoalsSummary,
  exportTransactionsToCSV,
  exportMonthlySummaryToCSV,
  exportCategoryBreakdownToCSV,
  exportTaxSummaryToCSV,
  convertCurrency,
  formatCurrency,
  setDefaultCurrency,
  getBalanceInCurrency,
  getSupportedCurrencies,
} from '../core/index.js';

// ==================== TOOL DEFINITIONS ====================

const TOOLS = [
  {
    name: "add_transaction",
    description: "Add a new income or expense transaction",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Transaction amount (positive number)" },
        type: { type: "string", enum: ["income", "expense"], description: "Transaction type" },
        category: { type: "string", description: "Category (e.g., 'Food & Dining'). Leave empty for auto-categorization." },
        description: { type: "string", description: "Description of the transaction" },
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
      },
      required: ["amount", "type", "description"],
    },
  },
  {
    name: "get_balance",
    description: "Get current account balance and financial summary",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "set_budget",
    description: "Set a monthly budget limit for a category",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category to set budget for" },
        limit: { type: "number", description: "Monthly spending limit" },
        alertThreshold: { type: "number", description: "Percentage at which to alert (default: 80)" },
      },
      required: ["category", "limit"],
    },
  },
  {
    name: "analyze_spending",
    description: "Get detailed analysis of spending patterns",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Specific category to analyze (optional)" },
      },
      required: [],
    },
  },
  {
    name: "get_insights",
    description: "Get AI-powered insights and recommendations about your finances",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "delete_transaction",
    description: "Delete a transaction by its ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Transaction ID to delete" } },
      required: ["id"],
    },
  },
  {
    name: "list_budgets",
    description: "List all budget limits and their current status",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  // Phase 3: Recurring Transactions
  {
    name: "add_recurring",
    description: "Set up a recurring transaction (subscription, salary, rent, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Transaction amount" },
        type: { type: "string", enum: ["income", "expense"], description: "Transaction type" },
        category: { type: "string", description: "Category for the transaction" },
        description: { type: "string", description: "Description (e.g., 'Netflix subscription')" },
        frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"], description: "How often this occurs" },
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
      },
      required: ["amount", "type", "description", "frequency"],
    },
  },
  {
    name: "list_recurring",
    description: "List all recurring transactions and upcoming due dates",
    inputSchema: {
      type: "object",
      properties: { days: { type: "number", description: "Show recurring due within N days (default: 30)" } },
      required: [],
    },
  },
  {
    name: "toggle_recurring",
    description: "Pause or resume a recurring transaction",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Recurring transaction ID" },
        active: { type: "boolean", description: "Set to true to activate, false to pause" },
      },
      required: ["id", "active"],
    },
  },
  {
    name: "delete_recurring",
    description: "Delete a recurring transaction",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Recurring transaction ID to delete" } },
      required: ["id"],
    },
  },
  {
    name: "process_recurring",
    description: "Process all due recurring transactions",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  // Phase 3: Savings Goals
  {
    name: "create_goal",
    description: "Create a new savings goal",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Goal name (e.g., 'Vacation')" },
        targetAmount: { type: "number", description: "Target amount to save" },
        deadline: { type: "string", description: "Optional deadline in YYYY-MM-DD format" },
      },
      required: ["name", "targetAmount"],
    },
  },
  {
    name: "contribute_to_goal",
    description: "Add money to a savings goal",
    inputSchema: {
      type: "object",
      properties: {
        goalId: { type: "string", description: "Goal ID to contribute to" },
        amount: { type: "number", description: "Amount to add" },
        note: { type: "string", description: "Optional note for this contribution" },
      },
      required: ["goalId", "amount"],
    },
  },
  {
    name: "list_goals",
    description: "List all savings goals with progress",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "delete_goal",
    description: "Delete a savings goal",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Goal ID to delete" } },
      required: ["id"],
    },
  },
  // Phase 3: CSV Export
  {
    name: "export_csv",
    description: "Export transactions to CSV format",
    inputSchema: {
      type: "object",
      properties: {
        exportType: { type: "string", enum: ["transactions", "monthly", "categories", "tax"], description: "Type of export" },
        startDate: { type: "string", description: "Filter start date YYYY-MM-DD" },
        endDate: { type: "string", description: "Filter end date YYYY-MM-DD" },
        year: { type: "number", description: "Year for monthly/tax export" },
        category: { type: "string", description: "Filter by category" },
      },
      required: ["exportType"],
    },
  },
  // Phase 3: Multi-Currency
  {
    name: "convert_currency",
    description: "Convert an amount between currencies",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to convert" },
        from: { type: "string", description: "Source currency code (e.g., USD)" },
        to: { type: "string", description: "Target currency code" },
      },
      required: ["amount", "from", "to"],
    },
  },
  {
    name: "set_currency",
    description: "Set default currency for the account",
    inputSchema: {
      type: "object",
      properties: { currency: { type: "string", description: "Currency code (USD, EUR, etc.)" } },
      required: ["currency"],
    },
  },
  {
    name: "list_currencies",
    description: "List all supported currencies",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "balance_by_currency",
    description: "Get balance breakdown by currency",
    inputSchema: {
      type: "object",
      properties: { targetCurrency: { type: "string", description: "Convert all to this currency" } },
      required: [],
    },
  },
];

// ==================== TOOL HANDLERS ====================

function handleAddTransaction(args: Record<string, unknown>) {
  const data = loadData();
  const amount = args.amount as number;
  const type = args.type as 'income' | 'expense';
  const description = args.description as string;
  const date = (args.date as string) || new Date().toISOString().split('T')[0];
  let category = args.category as string;
  if (!category) category = suggestCategory(description);

  const transaction: Transaction = {
    id: uuidv4(),
    date,
    amount: Math.abs(amount),
    category,
    description,
    type,
  };

  data.transactions.push(transaction);
  saveData(data);

  const alerts = checkBudgetAlerts(data);
  const categoryAlert = alerts.find(a => a.category === category);

  let response = `✅ Added ${type}: $${amount.toFixed(2)} for "${description}"\n`;
  response += `📁 Category: ${category}\n📅 Date: ${date}`;
  if (categoryAlert) response += `\n\n${categoryAlert.message}`;
  return response;
}

function handleGetBalance() {
  const data = loadData();
  const balance = calculateBalance(data);
  const analysis = analyzeSpending(data);
  
  return `💰 Financial Summary\n━━━━━━━━━━━━━━━━━━━━\n📊 Current Balance: $${balance.toFixed(2)}\n\n📅 This Month:\n   💵 Income: $${analysis.totalIncome.toFixed(2)}\n   💸 Expenses: $${analysis.totalExpenses.toFixed(2)}\n   💎 Net Savings: $${analysis.netSavings.toFixed(2)}`;
}

function handleSetBudget(args: Record<string, unknown>) {
  const data = loadData();
  const category = args.category as string;
  const limit = args.limit as number;
  const alertThreshold = (args.alertThreshold as number) || 80;

  const existingIndex = data.budgets.findIndex(b => b.category.toLowerCase() === category.toLowerCase());
  const budget: Budget = { category, limit, spent: 0, alertThreshold };

  if (existingIndex >= 0) data.budgets[existingIndex] = budget;
  else data.budgets.push(budget);

  saveData(data);
  return `✅ Budget set for ${category}: $${limit}/month\n🔔 Alert at ${alertThreshold}% ($${(limit * alertThreshold / 100).toFixed(2)})`;
}

function handleAnalyzeSpending(args: Record<string, unknown>) {
  const data = loadData();
  const categoryFilter = args.category as string;
  const analysis = analyzeSpending(data);

  let response = `📊 Spending Analysis\n━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (categoryFilter) {
    const amount = analysis.byCategory[categoryFilter] || 0;
    const percentage = analysis.totalExpenses > 0 ? ((amount / analysis.totalExpenses) * 100).toFixed(1) : 0;
    response += `📁 ${categoryFilter}\n   Spent: $${amount.toFixed(2)} (${percentage}% of total)\n`;
  } else {
    response += `💰 Total Expenses: $${analysis.totalExpenses.toFixed(2)}\n\n🏆 Top Categories:\n`;
    analysis.topCategories.forEach((cat, i) => {
      const percentage = ((cat.amount / analysis.totalExpenses) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(Number(percentage) / 5));
      response += `   ${i + 1}. ${cat.category}: $${cat.amount.toFixed(2)} (${percentage}%) ${bar}\n`;
    });
  }
  return response;
}

function handleGetInsights() {
  const data = loadData();
  const insights = generateInsights(data);
  let response = `🧠 Financial Insights\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  if (insights.length === 0) response += `No insights yet. Add more transactions to get personalized recommendations!`;
  else insights.forEach((insight) => { response += `${insight.message}\n\n`; });
  return response;
}

function handleDeleteTransaction(args: Record<string, unknown>) {
  const data = loadData();
  const id = args.id as string;
  const index = data.transactions.findIndex(t => t.id === id);
  if (index < 0) return `❌ Transaction not found: ${id}`;
  const deleted = data.transactions.splice(index, 1)[0];
  saveData(data);
  return `🗑️ Deleted: ${deleted.type} of $${deleted.amount.toFixed(2)} - "${deleted.description}"`;
}

function handleListBudgets() {
  const data = loadData();
  const spending = calculateSpendingByCategory(getCurrentMonthTransactions(data));
  if (data.budgets.length === 0) return `📋 No budgets set yet.\n\nUse set_budget to create one.`;

  let response = `📋 Budget Status\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  data.budgets.forEach(budget => {
    const spent = spending[budget.category] || 0;
    const remaining = budget.limit - spent;
    const percentUsed = (spent / budget.limit) * 100;
    const statusEmoji = percentUsed >= 100 ? '🔴' : percentUsed >= budget.alertThreshold ? '🟡' : '🟢';
    const progressBar = '█'.repeat(Math.min(Math.round(percentUsed / 10), 10)) + '░'.repeat(Math.max(10 - Math.round(percentUsed / 10), 0));
    response += `${statusEmoji} ${budget.category}\n   [${progressBar}] ${percentUsed.toFixed(0)}%\n   Spent: $${spent.toFixed(2)} / $${budget.limit} (Remaining: $${remaining.toFixed(2)})\n\n`;
  });
  return response;
}

function handleAddRecurring(args: Record<string, unknown>) {
  const data = loadData();
  const amount = args.amount as number;
  const type = args.type as 'income' | 'expense';
  const description = args.description as string;
  const frequency = args.frequency as RecurringTransaction['frequency'];
  const startDate = args.startDate as string | undefined;
  let category = args.category as string;
  if (!category) category = suggestCategory(description);
  
  const recurring = createRecurringTransaction(amount, type, category, description, frequency, startDate);
  data.recurringTransactions = data.recurringTransactions || [];
  data.recurringTransactions.push(recurring);
  saveData(data);
  
  const frequencyLabel = { daily: 'every day', weekly: 'every week', monthly: 'every month', yearly: 'every year' }[frequency];
  return `🔄 Recurring transaction created!\n━━━━━━━━━━━━━━━━━━━━\n📝 ${description}\n💰 ${type === 'income' ? '+' : '-'}$${amount.toFixed(2)} ${frequencyLabel}\n📁 Category: ${category}\n📅 Next due: ${recurring.nextDue}\n🆔 ID: ${recurring.id}`;
}

function handleListRecurring(args: Record<string, unknown>) {
  const days = (args.days as number) || 30;
  const data = loadData();
  const recurring = data.recurringTransactions || [];
  if (recurring.length === 0) return `🔄 No recurring transactions set up.\n\nUse add_recurring to create one.`;
  
  const upcoming = getUpcomingRecurring(days);
  let response = `🔄 Recurring Transactions\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  recurring.forEach(r => {
    const statusEmoji = r.active ? '✅' : '⏸️';
    const typeEmoji = r.type === 'income' ? '💵' : '💸';
    response += `${statusEmoji} ${r.description}\n   ${typeEmoji} $${r.amount.toFixed(2)} / ${r.frequency}\n   📁 ${r.category}\n   📅 Next: ${r.nextDue}${!r.active ? ' (paused)' : ''}\n   🆔 ${r.id}\n\n`;
  });
  
  if (upcoming.length > 0) {
    response += `\n📆 Upcoming in next ${days} days:\n`;
    upcoming.slice(0, 5).forEach(u => {
      const emoji = u.daysUntilDue <= 3 ? '🔔' : '📌';
      response += `   ${emoji} ${u.recurring.description}: $${u.recurring.amount.toFixed(2)} in ${u.daysUntilDue} days\n`;
    });
  }
  return response;
}

function handleToggleRecurring(args: Record<string, unknown>) {
  const id = args.id as string;
  const active = args.active as boolean;
  const success = toggleRecurringTransaction(id, active);
  if (!success) return `❌ Recurring transaction not found: ${id}`;
  return active ? `▶️ Recurring transaction resumed` : `⏸️ Recurring transaction paused`;
}

function handleDeleteRecurring(args: Record<string, unknown>) {
  const id = args.id as string;
  const success = deleteRecurringTransaction(id);
  if (!success) return `❌ Recurring transaction not found: ${id}`;
  return `🗑️ Recurring transaction deleted`;
}

function handleProcessRecurring() {
  const result = processRecurringTransactions();
  if (result.processed === 0) return `✅ No recurring transactions due today.`;
  let response = `🔄 Processed ${result.processed} recurring transaction(s):\n\n`;
  result.transactions.forEach(t => {
    const emoji = t.type === 'income' ? '💵' : '💸';
    response += `${emoji} ${t.description}: $${t.amount.toFixed(2)}\n`;
  });
  return response;
}

function handleCreateGoal(args: Record<string, unknown>) {
  const data = loadData();
  const name = args.name as string;
  const targetAmount = args.targetAmount as number;
  const deadline = args.deadline as string | undefined;
  
  const goal = createGoal(name, targetAmount, deadline, data.defaultCurrency || 'USD');
  data.savingsGoals = data.savingsGoals || [];
  data.savingsGoals.push(goal);
  saveData(data);
  
  let response = `🎯 Savings goal created!\n━━━━━━━━━━━━━━━━━━━━\n📌 ${name}\n🎯 Target: $${targetAmount.toFixed(2)}\n`;
  if (deadline) response += `📅 Deadline: ${deadline}\n`;
  response += `🆔 ID: ${goal.id}`;
  return response;
}

function handleContributeToGoal(args: Record<string, unknown>) {
  const goalId = args.goalId as string;
  const amount = args.amount as number;
  const note = args.note as string | undefined;
  
  const result = addContribution(goalId, amount, note);
  if (!result.success) return `❌ ${result.error}`;
  
  const goal = result.goal!;
  const percentComplete = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
  const remaining = goal.targetAmount - goal.currentAmount;
  
  let response = `💰 Contributed $${amount.toFixed(2)} to "${goal.name}"!\n━━━━━━━━━━━━━━━━━━━━\n📊 Progress: ${percentComplete}%\n✅ Saved: $${goal.currentAmount.toFixed(2)}\n🎯 Remaining: $${remaining.toFixed(2)}`;
  if (goal.currentAmount >= goal.targetAmount) response += `\n\n🎉 CONGRATULATIONS! You've reached your goal!`;
  return response;
}

function handleListGoals() {
  const data = loadData();
  const goalsWithProgress = getGoalsWithProgress(data);
  if (goalsWithProgress.length === 0) return `🎯 No savings goals yet.\n\nUse create_goal to start saving!`;
  
  const summary = getGoalsSummary(data);
  let response = `🎯 Savings Goals\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  goalsWithProgress.forEach(({ goal, percentComplete, remaining, onTrack, monthlyNeeded }) => {
    const progressBar = '█'.repeat(Math.min(Math.round(percentComplete / 10), 10)) + '░'.repeat(Math.max(10 - Math.round(percentComplete / 10), 0));
    const statusEmoji = percentComplete >= 100 ? '🎉' : onTrack ? '✅' : '⚠️';
    response += `${statusEmoji} ${goal.name}\n   [${progressBar}] ${percentComplete.toFixed(1)}%\n   💰 $${goal.currentAmount.toFixed(2)} / $${goal.targetAmount.toFixed(2)}\n`;
    if (goal.deadline) {
      response += `   📅 Deadline: ${goal.deadline}\n`;
      if (monthlyNeeded && remaining > 0) response += `   📈 Need: $${monthlyNeeded.toFixed(2)}/month to reach goal\n`;
    }
    response += `   🆔 ${goal.id}\n\n`;
  });
  
  response += `\n📊 Total: $${summary.totalSaved.toFixed(2)} saved across ${summary.totalGoals} goal(s)`;
  return response;
}

function handleDeleteGoal(args: Record<string, unknown>) {
  const id = args.id as string;
  const success = deleteGoal(id);
  if (!success) return `❌ Goal not found: ${id}`;
  return `🗑️ Savings goal deleted`;
}

function handleExportCSV(args: Record<string, unknown>) {
  const exportType = args.exportType as string;
  const startDate = args.startDate as string | undefined;
  const endDate = args.endDate as string | undefined;
  const year = (args.year as number) || new Date().getFullYear();
  const category = args.category as string | undefined;
  
  let csv: string;
  let filename: string;
  
  switch (exportType) {
    case 'transactions':
      csv = exportTransactionsToCSV({ startDate, endDate, category });
      filename = `transactions_${startDate || 'all'}_to_${endDate || 'now'}.csv`;
      break;
    case 'monthly':
      csv = exportMonthlySummaryToCSV(year);
      filename = `monthly_summary_${year}.csv`;
      break;
    case 'categories':
      csv = exportCategoryBreakdownToCSV(startDate, endDate);
      filename = `category_breakdown.csv`;
      break;
    case 'tax':
      csv = exportTaxSummaryToCSV(year);
      filename = `tax_summary_${year}.csv`;
      break;
    default:
      return `❌ Unknown export type: ${exportType}`;
  }
  
  return `📄 CSV Export: ${filename}\n━━━━━━━━━━━━━━━━━━━━\n\n\`\`\`csv\n${csv}\n\`\`\``;
}

function handleConvertCurrency(args: Record<string, unknown>) {
  const amount = args.amount as number;
  const from = (args.from as string).toUpperCase();
  const to = (args.to as string).toUpperCase();
  const result = convertCurrency(amount, from, to);
  return `💱 Currency Conversion\n━━━━━━━━━━━━━━━━━━━━\n${formatCurrency(amount, from)} = ${formatCurrency(result.convertedAmount, to)}\n📊 Rate: 1 ${from} = ${result.rate} ${to}`;
}

function handleSetCurrency(args: Record<string, unknown>) {
  const currency = (args.currency as string).toUpperCase();
  const success = setDefaultCurrency(currency);
  if (!success) {
    const supported = getSupportedCurrencies().map(c => c.code).join(', ');
    return `❌ Unsupported currency: ${currency}\n\nSupported: ${supported}`;
  }
  return `✅ Default currency set to ${currency}`;
}

function handleListCurrencies() {
  const currencies = getSupportedCurrencies();
  let response = `💱 Supported Currencies\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  currencies.forEach(c => { response += `${c.symbol} ${c.code} - ${c.name}\n`; });
  return response;
}

function handleBalanceByCurrency(args: Record<string, unknown>) {
  const data = loadData();
  const targetCurrency = ((args.targetCurrency as string) || data.defaultCurrency || 'USD').toUpperCase();
  const result = getBalanceInCurrency(data, targetCurrency);
  
  let response = `💰 Balance by Currency\n━━━━━━━━━━━━━━━━━━━━\n\n`;
  if (Object.keys(result.breakdown).length > 1) {
    response += `📊 Breakdown:\n`;
    Object.entries(result.breakdown).forEach(([currency, { original, converted }]) => {
      response += `   ${currency}: ${formatCurrency(original, currency)} → ${formatCurrency(converted, targetCurrency)}\n`;
    });
    response += `\n`;
  }
  response += `💵 Total Balance: ${formatCurrency(result.balance, result.currency)}`;
  return response;
}

// ==================== REGISTER HANDLERS ====================

export function registerToolHandlers(): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handlers: Record<string, (args: Record<string, unknown>) => string> = {
      add_transaction: handleAddTransaction,
      get_balance: handleGetBalance,
      set_budget: handleSetBudget,
      analyze_spending: handleAnalyzeSpending,
      get_insights: handleGetInsights,
      delete_transaction: handleDeleteTransaction,
      list_budgets: handleListBudgets,
      add_recurring: handleAddRecurring,
      list_recurring: handleListRecurring,
      toggle_recurring: handleToggleRecurring,
      delete_recurring: handleDeleteRecurring,
      process_recurring: handleProcessRecurring,
      create_goal: handleCreateGoal,
      contribute_to_goal: handleContributeToGoal,
      list_goals: handleListGoals,
      delete_goal: handleDeleteGoal,
      export_csv: handleExportCSV,
      convert_currency: handleConvertCurrency,
      set_currency: handleSetCurrency,
      list_currencies: handleListCurrencies,
      balance_by_currency: handleBalanceByCurrency,
    };

    const handler = handlers[name];
    if (!handler) throw new Error(`Unknown tool: ${name}`);

    const result = handler(args || {});
    return { content: [{ type: "text", text: result }] };
  });
}
