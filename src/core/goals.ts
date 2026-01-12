import { v4 as uuidv4 } from 'uuid';
import { SavingsGoal, GoalContribution, FinanceData } from './types.js';
import { loadData, saveData } from './storage.js';

// ==================== SAVINGS GOALS MANAGEMENT ====================

/**
 * Create a new savings goal
 */
export function createGoal(
  name: string,
  targetAmount: number,
  deadline?: string,
  currency: string = 'USD'
): SavingsGoal {
  return {
    id: uuidv4(),
    name,
    targetAmount,
    currentAmount: 0,
    deadline,
    createdAt: new Date().toISOString(),
    currency,
    contributions: [],
  };
}

/**
 * Add a contribution to a goal
 */
export function addContribution(
  goalId: string,
  amount: number,
  note?: string
): { success: boolean; goal?: SavingsGoal; error?: string } {
  const data = loadData();
  const goal = data.savingsGoals.find(g => g.id === goalId);
  
  if (!goal) {
    return { success: false, error: 'Goal not found' };
  }
  
  const contribution: GoalContribution = {
    id: uuidv4(),
    amount,
    date: new Date().toISOString().split('T')[0],
    note,
  };
  
  goal.contributions.push(contribution);
  goal.currentAmount += amount;
  
  saveData(data);
  
  return { success: true, goal };
}

/**
 * Withdraw from a goal (negative contribution)
 */
export function withdrawFromGoal(
  goalId: string,
  amount: number,
  note?: string
): { success: boolean; goal?: SavingsGoal; error?: string } {
  const data = loadData();
  const goal = data.savingsGoals.find(g => g.id === goalId);
  
  if (!goal) {
    return { success: false, error: 'Goal not found' };
  }
  
  if (amount > goal.currentAmount) {
    return { success: false, error: 'Insufficient funds in goal' };
  }
  
  const contribution: GoalContribution = {
    id: uuidv4(),
    amount: -amount,
    date: new Date().toISOString().split('T')[0],
    note: note || 'Withdrawal',
  };
  
  goal.contributions.push(contribution);
  goal.currentAmount -= amount;
  
  saveData(data);
  
  return { success: true, goal };
}

/**
 * Get all savings goals with progress info
 */
export function getGoalsWithProgress(data: FinanceData): {
  goal: SavingsGoal;
  percentComplete: number;
  remaining: number;
  onTrack: boolean;
  projectedCompletion?: string;
  monthlyNeeded?: number;
}[] {
  const goals = data.savingsGoals || [];
  const today = new Date();
  
  return goals.map(goal => {
    const percentComplete = (goal.currentAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.currentAmount;
    
    let onTrack = true;
    let projectedCompletion: string | undefined;
    let monthlyNeeded: number | undefined;
    
    if (goal.deadline) {
      const deadlineDate = new Date(goal.deadline);
      const monthsRemaining = Math.max(
        (deadlineDate.getFullYear() - today.getFullYear()) * 12 +
        (deadlineDate.getMonth() - today.getMonth()),
        1
      );
      
      monthlyNeeded = remaining / monthsRemaining;
      
      // Calculate average monthly contribution
      const createdDate = new Date(goal.createdAt);
      const monthsSinceCreated = Math.max(
        (today.getFullYear() - createdDate.getFullYear()) * 12 +
        (today.getMonth() - createdDate.getMonth()),
        1
      );
      const avgMonthlyContribution = goal.currentAmount / monthsSinceCreated;
      
      if (avgMonthlyContribution > 0) {
        const monthsToComplete = remaining / avgMonthlyContribution;
        const completionDate = new Date();
        completionDate.setMonth(completionDate.getMonth() + Math.ceil(monthsToComplete));
        projectedCompletion = completionDate.toISOString().split('T')[0];
        
        onTrack = completionDate <= deadlineDate;
      } else {
        onTrack = false;
      }
    }
    
    return {
      goal,
      percentComplete,
      remaining,
      onTrack,
      projectedCompletion,
      monthlyNeeded,
    };
  });
}

/**
 * Delete a savings goal
 */
export function deleteGoal(id: string): boolean {
  const data = loadData();
  const index = data.savingsGoals.findIndex(g => g.id === id);
  
  if (index < 0) return false;
  
  data.savingsGoals.splice(index, 1);
  saveData(data);
  return true;
}

/**
 * Update goal target or deadline
 */
export function updateGoal(
  id: string,
  updates: { name?: string; targetAmount?: number; deadline?: string }
): { success: boolean; goal?: SavingsGoal; error?: string } {
  const data = loadData();
  const goal = data.savingsGoals.find(g => g.id === id);
  
  if (!goal) {
    return { success: false, error: 'Goal not found' };
  }
  
  if (updates.name) goal.name = updates.name;
  if (updates.targetAmount) goal.targetAmount = updates.targetAmount;
  if (updates.deadline) goal.deadline = updates.deadline;
  
  saveData(data);
  
  return { success: true, goal };
}

/**
 * Get goal summary stats
 */
export function getGoalsSummary(data: FinanceData): {
  totalGoals: number;
  totalTargetAmount: number;
  totalSaved: number;
  overallProgress: number;
  completedGoals: number;
} {
  const goals = data.savingsGoals || [];
  
  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  
  return {
    totalGoals: goals.length,
    totalTargetAmount,
    totalSaved,
    overallProgress: totalTargetAmount > 0 ? (totalSaved / totalTargetAmount) * 100 : 0,
    completedGoals,
  };
}
