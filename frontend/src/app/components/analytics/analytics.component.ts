import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { SpendingAnalysis, SpendingInsight } from '../../models/finance.model';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    KeyValuePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatProgressBarModule,
    BaseChartDirective,
    ConvertCurrencyPipe,
  ],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  loading = signal(true);
  analysis = signal<SpendingAnalysis | null>(null);
  insights = signal<SpendingInsight[]>([]);
  alerts = signal<SpendingInsight[]>([]);

  // Charts
  categoryChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  trendChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  pieChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
    },
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { display: true },
    },
  };

  constructor(
    private financeService: FinanceService,
    public currencyService: CurrencyService
  ) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading.set(true);

    // Load spending analysis
    this.financeService.getSpendingAnalysis().subscribe({
      next: (data) => {
        this.analysis.set(data);
        this.buildCategoryChart(data);
        this.buildTrendChart(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.loading.set(false);
      },
    });

    // Load insights
    this.financeService.getInsights().subscribe({
      next: (data) => this.insights.set(data || []),
    });

    // Load alerts
    this.financeService.getBudgetAlerts().subscribe({
      next: (data) => this.alerts.set(data || []),
    });
  }

  buildCategoryChart(data: SpendingAnalysis) {
    if (!data.byCategory) return;

    const categories = Object.keys(data.byCategory);
    const amounts = Object.values(data.byCategory);

    this.categoryChartData.set({
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
            '#e91e63',
            '#00bcd4',
          ],
        },
      ],
    });
  }

  buildTrendChart(data: SpendingAnalysis) {
    if (!data.monthlyTrend) return;

    const months = Object.keys(data.monthlyTrend).sort();
    const amounts = months.map((m) => data.monthlyTrend![m]);

    this.trendChartData.set({
      labels: months.map((m) => {
        const [year, month] = m.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
      }),
      datasets: [
        {
          label: 'Monthly Spending',
          data: amounts,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    });
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
    return `insight-${type}`;
  }

  getCategoryPercentage(category: string): number {
    const data = this.analysis();
    if (!data?.byCategory || !data.totalSpending) return 0;
    return (data.byCategory[category] / data.totalSpending) * 100;
  }

  exportTaxReport() {
    const year = new Date().getFullYear();
    const url = this.financeService.exportTax(year);
    window.open(url, '_blank');
  }

  exportMonthlyReport() {
    const year = new Date().getFullYear();
    const url = this.financeService.exportMonthly(year);
    window.open(url, '_blank');
  }
}
