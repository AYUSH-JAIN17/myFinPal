import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { DashboardData, Transaction, Budget, SpendingInsight } from '../../models/finance.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatProgressBarModule,
    MatChipsModule,
    RouterLink,
    BaseChartDirective,
    ConvertCurrencyPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);

  balance = signal(0);
  monthlyIncome = signal(0);
  monthlyExpenses = signal(0);
  recentTransactions = signal<Transaction[]>([]);
  budgets = signal<Budget[]>([]);
  insights = signal<SpendingInsight[]>([]);

  // Chart data
  spendingChartData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: [{ data: [] }],
  });

  spendingChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  constructor(
    private financeService: FinanceService,
    public currencyService: CurrencyService
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);

    this.financeService.getDashboard().subscribe({
      next: (data: DashboardData) => {
        this.balance.set(data.balance);
        this.monthlyIncome.set(data.monthlyIncome);
        this.monthlyExpenses.set(data.monthlyExpenses);
        this.recentTransactions.set(data.recentTransactions || []);
        this.budgets.set(data.budgets || []);
        this.insights.set(data.insights || []);

        // Build chart data from spending by category
        if (data.spendingByCategory) {
          const categories = Object.keys(data.spendingByCategory);
          const amounts = Object.values(data.spendingByCategory);

          this.spendingChartData.set({
            labels: categories,
            datasets: [
              {
                data: amounts,
                backgroundColor: [
                  '#1976d2',
                  '#388e3c',
                  '#f57c00',
                  '#7b1fa2',
                  '#d32f2f',
                  '#0097a7',
                  '#fbc02d',
                  '#455a64',
                ],
              },
            ],
          });
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.error.set('Failed to load dashboard. Make sure the API server is running.');
        this.loading.set(false);
      },
    });
  }

  getBudgetProgress(budget: Budget): number {
    return budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  }

  getBudgetColor(budget: Budget): string {
    const progress = this.getBudgetProgress(budget);
    if (progress >= 90) return 'warn';
    if (progress >= 70) return 'accent';
    return 'primary';
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'alert':
        return 'error';
      case 'tip':
        return 'lightbulb';
      default:
        return 'info';
    }
  }

  getInsightClass(type: string): string {
    switch (type) {
      case 'warning':
        return 'insight-warning';
      case 'alert':
        return 'insight-alert';
      case 'tip':
        return 'insight-tip';
      default:
        return 'insight-info';
    }
  }
}
