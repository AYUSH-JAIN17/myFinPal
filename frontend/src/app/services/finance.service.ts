import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Transaction,
  Budget,
  SavingsGoal,
  GoalWithProgress,
  GoalsSummary,
  RecurringTransaction,
  UpcomingRecurring,
  DashboardData,
  SpendingAnalysis,
  SpendingInsight,
  Currency,
} from '../models/finance.model';

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // ==================== DASHBOARD ====================

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`);
  }

  // ==================== TRANSACTIONS ====================

  getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    type?: 'income' | 'expense';
  }): Observable<{ transactions: Transaction[]; total: number; categories: string[] }> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.type) params = params.set('type', filters.type);

    return this.http.get<{ transactions: Transaction[]; total: number; categories: string[] }>(
      `${this.apiUrl}/transactions`,
      { params }
    );
  }

  getCurrentMonthTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions/current-month`);
  }

  addTransaction(transaction: {
    amount: number;
    type: 'income' | 'expense';
    description: string;
    category?: string;
    date?: string;
    currency?: string;
  }): Observable<{ transaction: Transaction; alert?: SpendingInsight }> {
    return this.http.post<{ transaction: Transaction; alert?: SpendingInsight }>(
      `${this.apiUrl}/transactions`,
      transaction
    );
  }

  deleteTransaction(id: string): Observable<{ deleted: Transaction }> {
    return this.http.delete<{ deleted: Transaction }>(`${this.apiUrl}/transactions/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/transactions/categories`);
  }

  suggestCategory(description: string): Observable<{ category: string }> {
    return this.http.get<{ category: string }>(`${this.apiUrl}/transactions/suggest-category`, {
      params: { description },
    });
  }

  // ==================== BUDGETS ====================

  getBudgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.apiUrl}/budgets`);
  }

  setBudget(budget: {
    category: string;
    limit: number;
    alertThreshold?: number;
  }): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl}/budgets`, budget);
  }

  deleteBudget(category: string): Observable<{ deleted: Budget }> {
    return this.http.delete<{ deleted: Budget }>(`${this.apiUrl}/budgets/${encodeURIComponent(category)}`);
  }

  // ==================== GOALS ====================

  getGoals(): Observable<{ goals: GoalWithProgress[]; summary: GoalsSummary }> {
    return this.http.get<{ goals: GoalWithProgress[]; summary: GoalsSummary }>(`${this.apiUrl}/goals`);
  }

  createGoal(goal: {
    name: string;
    targetAmount: number;
    deadline?: string;
  }): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.apiUrl}/goals`, goal);
  }

  contributeToGoal(goalId: string, amount: number, note?: string): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.apiUrl}/goals/${goalId}/contribute`, { amount, note });
  }

  withdrawFromGoal(goalId: string, amount: number, note?: string): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.apiUrl}/goals/${goalId}/withdraw`, { amount, note });
  }

  deleteGoal(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/goals/${id}`);
  }

  // ==================== RECURRING ====================

  getRecurring(): Observable<{ recurring: RecurringTransaction[]; upcoming: UpcomingRecurring[] }> {
    return this.http.get<{ recurring: RecurringTransaction[]; upcoming: UpcomingRecurring[] }>(
      `${this.apiUrl}/recurring`
    );
  }

  addRecurring(recurring: {
    amount: number;
    type: 'income' | 'expense';
    category?: string;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate?: string;
  }): Observable<RecurringTransaction> {
    return this.http.post<RecurringTransaction>(`${this.apiUrl}/recurring`, recurring);
  }

  toggleRecurring(id: string, active: boolean): Observable<{ success: boolean; active: boolean }> {
    return this.http.patch<{ success: boolean; active: boolean }>(`${this.apiUrl}/recurring/${id}/toggle`, {
      active,
    });
  }

  deleteRecurring(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/recurring/${id}`);
  }

  processRecurring(): Observable<{ processed: number; transactions: Transaction[] }> {
    return this.http.post<{ processed: number; transactions: Transaction[] }>(
      `${this.apiUrl}/recurring/process`,
      {}
    );
  }

  // ==================== ANALYTICS ====================

  getSpendingAnalysis(): Observable<SpendingAnalysis> {
    return this.http.get<SpendingAnalysis>(`${this.apiUrl}/analytics/spending`);
  }

  getInsights(): Observable<SpendingInsight[]> {
    return this.http.get<SpendingInsight[]>(`${this.apiUrl}/analytics/insights`);
  }

  getBudgetAlerts(): Observable<SpendingInsight[]> {
    return this.http.get<SpendingInsight[]>(`${this.apiUrl}/analytics/alerts`);
  }

  // ==================== CURRENCY ====================

  getSupportedCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>(`${this.apiUrl}/currency/supported`);
  }

  convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Observable<{ convertedAmount: number; rate: number }> {
    return this.http.get<{ convertedAmount: number; rate: number }>(`${this.apiUrl}/currency/convert`, {
      params: { amount: amount.toString(), from, to },
    });
  }

  setDefaultCurrency(currency: string): Observable<{ success: boolean; currency: string }> {
    return this.http.post<{ success: boolean; currency: string }>(`${this.apiUrl}/currency/default`, {
      currency,
    });
  }

  // ==================== EXPORT ====================

  exportTransactions(filters?: { startDate?: string; endDate?: string; category?: string }): string {
    let url = `${this.apiUrl}/export/transactions`;
    const params: string[] = [];
    if (filters?.startDate) params.push(`startDate=${filters.startDate}`);
    if (filters?.endDate) params.push(`endDate=${filters.endDate}`);
    if (filters?.category) params.push(`category=${filters.category}`);
    if (params.length) url += '?' + params.join('&');
    return url;
  }

  exportMonthly(year: number): string {
    return `${this.apiUrl}/export/monthly/${year}`;
  }

  exportTax(year: number): string {
    return `${this.apiUrl}/export/tax/${year}`;
  }
}
