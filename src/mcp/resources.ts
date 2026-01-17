import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { server } from './server.js';
import { 
  loadData, 
  getCurrentMonthTransactions, 
  calculateSpendingByCategory,
  analyzeSpending,
  generateInsights 
} from '../core/index.js';

// ==================== RESOURCE DEFINITIONS ====================

const RESOURCES = [
  {
    uri: "finance://transactions",
    name: "Recent Transactions",
    description: "List of all transactions for the current month",
    mimeType: "application/json",
  },
  {
    uri: "finance://budget",
    name: "Budget Status",
    description: "Current budget limits and spending by category",
    mimeType: "application/json",
  },
  {
    uri: "finance://summary",
    name: "Financial Summary",
    description: "Overview of income, expenses, and savings",
    mimeType: "application/json",
  },
  {
    uri: "finance://categories",
    name: "Expense Categories",
    description: "Available expense and income categories",
    mimeType: "application/json",
  },
  {
    uri: "finance://insights",
    name: "Financial Insights",
    description: "AI-generated insights and alerts about spending",
    mimeType: "application/json",
  },
];

// ==================== REGISTER HANDLERS ====================

export function registerResourceHandlers(): void {
  // List all available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: RESOURCES };
  });

  // Read specific resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri.toString();
    const data = loadData();

    switch (uri) {
      case "finance://transactions": {
        const transactions = getCurrentMonthTransactions(data);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(transactions, null, 2),
          }],
        };
      }

      case "finance://budget": {
        const spending = calculateSpendingByCategory(getCurrentMonthTransactions(data));
        const budgetStatus = data.budgets.map(b => ({
          ...b,
          spent: spending[b.category] || 0,
          remaining: b.limit - (spending[b.category] || 0),
          percentUsed: ((spending[b.category] || 0) / b.limit * 100).toFixed(1) + '%'
        }));
        
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(budgetStatus, null, 2),
          }],
        };
      }

      case "finance://summary": {
        const analysis = analyzeSpending(data);
        const balance = data.transactions.reduce((sum, t) => {
          return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              currentBalance: balance,
              thisMonth: analysis,
              lastUpdated: data.lastUpdated
            }, null, 2),
          }],
        };
      }

      case "finance://categories": {
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data.categories, null, 2),
          }],
        };
      }

      case "finance://insights": {
        const insights = generateInsights(data);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(insights, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
