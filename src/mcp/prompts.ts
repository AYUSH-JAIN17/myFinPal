import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { server } from './server.js';
import { loadData, analyzeSpending } from '../core/index.js';

// ==================== PROMPT DEFINITIONS ====================

const PROMPTS = [
  {
    name: "monthly_report",
    description: "Generate a comprehensive monthly financial report",
    arguments: [
      {
        name: "month",
        description: "Month to report on (e.g., 'January 2026'). Defaults to current month.",
        required: false,
      },
    ],
  },
  {
    name: "budget_advice",
    description: "Get personalized budget recommendations based on spending patterns",
    arguments: [],
  },
  {
    name: "savings_plan",
    description: "Create a savings plan to reach a financial goal",
    arguments: [
      {
        name: "goal",
        description: "What are you saving for? (e.g., 'vacation', 'emergency fund')",
        required: true,
      },
      {
        name: "targetAmount",
        description: "How much do you need to save?",
        required: true,
      },
    ],
  },
];

// ==================== PROMPT HANDLERS ====================

function handleMonthlyReport(args: Record<string, string> | undefined) {
  const data = loadData();
  const analysis = analyzeSpending(data);
  const month = args?.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Generate a detailed monthly financial report for ${month}.

Here's my financial data:
- Total Income: $${analysis.totalIncome.toFixed(2)}
- Total Expenses: $${analysis.totalExpenses.toFixed(2)}  
- Net Savings: $${analysis.netSavings.toFixed(2)}
- Top spending categories: ${analysis.topCategories.map(c => `${c.category}: $${c.amount.toFixed(2)}`).join(', ')}

Please provide:
1. A summary of my financial health this month
2. Analysis of where my money went
3. Comparison to recommended budget percentages
4. Specific actionable recommendations for next month
5. Praise for any good habits and warnings for any concerning patterns`,
      },
    }],
  };
}

function handleBudgetAdvice() {
  const data = loadData();
  const analysis = analyzeSpending(data);
  
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Based on my spending patterns, give me personalized budget recommendations.

My spending breakdown:
${Object.entries(analysis.byCategory)
  .map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`)
  .join('\n')}

Total monthly expenses: $${analysis.totalExpenses.toFixed(2)}
Total monthly income: $${analysis.totalIncome.toFixed(2)}

Please recommend:
1. Realistic budget limits for each category
2. Categories where I could cut back
3. The 50/30/20 rule applied to my income
4. Priority order for setting budget limits`,
      },
    }],
  };
}

function handleSavingsPlan(args: Record<string, string> | undefined) {
  const data = loadData();
  const analysis = analyzeSpending(data);
  const goal = args?.goal as string;
  const targetAmount = args?.targetAmount as string;
  
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Help me create a savings plan.

Goal: ${goal}
Target Amount: $${targetAmount}
Current Monthly Savings: $${analysis.netSavings.toFixed(2)}
Monthly Income: $${analysis.totalIncome.toFixed(2)}
Monthly Expenses: $${analysis.totalExpenses.toFixed(2)}

Please provide:
1. How long it will take to reach my goal at current savings rate
2. How to accelerate savings by cutting expenses
3. A monthly savings target to reach the goal in 6 months and 12 months
4. Specific categories where I could reduce spending
5. Tips to stay motivated`,
      },
    }],
  };
}

// ==================== REGISTER HANDLERS ====================

export function registerPromptHandlers(): void {
  // List all available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: PROMPTS };
  });

  // Handle prompt requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "monthly_report":
        return handleMonthlyReport(args);
      
      case "budget_advice":
        return handleBudgetAdvice();
      
      case "savings_plan":
        return handleSavingsPlan(args);
      
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
