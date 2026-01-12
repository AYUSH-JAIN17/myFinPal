import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./components/transactions/transactions.component').then((m) => m.TransactionsComponent),
  },
  {
    path: 'budgets',
    loadComponent: () =>
      import('./components/budgets/budgets.component').then((m) => m.BudgetsComponent),
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./components/goals/goals.component').then((m) => m.GoalsComponent),
  },
  {
    path: 'recurring',
    loadComponent: () =>
      import('./components/recurring/recurring.component').then((m) => m.RecurringComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./components/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
];
