import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { Budget } from '../../models/finance.model';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    ConvertCurrencyPipe,
  ],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent implements OnInit {
  loading = signal(true);
  budgets = signal<Budget[]>([]);
  showForm = signal(false);
  editingBudget = signal<Budget | null>(null);

  budgetForm: FormGroup;

  categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Health & Fitness',
    'Travel',
    'Education',
    'Groceries',
    'Subscriptions',
    'Other',
  ];

  constructor(
    private financeService: FinanceService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public currencyService: CurrencyService
  ) {
    this.budgetForm = this.fb.group({
      category: ['', Validators.required],
      limit: ['', [Validators.required, Validators.min(1)]],
      alertThreshold: [80, [Validators.min(1), Validators.max(100)]],
    });
  }

  ngOnInit() {
    this.loadBudgets();
  }

  loadBudgets() {
    this.loading.set(true);
    this.financeService.getBudgets().subscribe({
      next: (budgets) => {
        this.budgets.set(budgets || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading budgets:', err);
        this.snackBar.open('Failed to load budgets', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.budgetForm.reset({ alertThreshold: 80 });
      this.editingBudget.set(null);
    }
  }

  editBudget(budget: Budget) {
    this.editingBudget.set(budget);
    // Convert USD value to selected currency for display in form
    const limitInSelectedCurrency = this.currencyService.convert(budget.limit);
    this.budgetForm.patchValue({
      category: budget.category,
      limit: Math.round(limitInSelectedCurrency * 100) / 100, // Round to 2 decimal places
      alertThreshold: budget.alertThreshold * 100, // Convert from decimal to percentage
    });
    this.showForm.set(true);
  }

  onSubmit() {
    if (this.budgetForm.valid) {
      const formValue = this.budgetForm.value;
      // Convert from selected currency to USD for storage
      const limitInUSD = this.currencyService.convertToUSD(formValue.limit);
      const budget = {
        category: this.editingBudget() ? this.editingBudget()!.category : formValue.category,
        limit: limitInUSD,
        alertThreshold: formValue.alertThreshold / 100,
      };

      const isEditing = this.editingBudget() !== null;
      this.financeService.setBudget(budget).subscribe({
        next: () => {
          this.snackBar.open(isEditing ? 'Budget updated successfully!' : 'Budget created successfully!', 'Close', { duration: 3000 });
          this.toggleForm();
          this.loadBudgets();
        },
        error: (err) => {
          console.error('Error saving budget:', err);
          this.snackBar.open(isEditing ? 'Failed to update budget' : 'Failed to create budget', 'Close', { duration: 3000 });
        },
      });
    }
  }

  deleteBudget(budget: Budget) {
    if (confirm(`Delete budget for "${budget.category}"?`)) {
      this.financeService.deleteBudget(budget.category).subscribe({
        next: () => {
          this.snackBar.open('Budget deleted', 'Close', { duration: 3000 });
          this.loadBudgets();
        },
        error: (err) => {
          console.error('Error deleting budget:', err);
          this.snackBar.open('Failed to delete budget', 'Close', { duration: 3000 });
        },
      });
    }
  }

  getProgress(budget: Budget): number {
    return budget.limit > 0 ? Math.min((budget.spent / budget.limit) * 100, 100) : 0;
  }

  getProgressColor(budget: Budget): string {
    const progress = this.getProgress(budget);
    if (progress >= 90) return 'warn';
    if (progress >= 70) return 'accent';
    return 'primary';
  }

  getStatusIcon(budget: Budget): string {
    const progress = this.getProgress(budget);
    if (progress >= 100) return 'error';
    if (progress >= 80) return 'warning';
    return 'check_circle';
  }

  getStatusClass(budget: Budget): string {
    const progress = this.getProgress(budget);
    if (progress >= 100) return 'over-budget';
    if (progress >= 80) return 'near-limit';
    return 'on-track';
  }

  getRemaining(budget: Budget): number {
    return Math.max(budget.limit - budget.spent, 0);
  }

  getTotalBudget(): number {
    return this.budgets().reduce((sum, b) => sum + b.limit, 0);
  }

  getTotalSpent(): number {
    return this.budgets().reduce((sum, b) => sum + b.spent, 0);
  }

  getOverallProgress(): number {
    const total = this.getTotalBudget();
    return total > 0 ? (this.getTotalSpent() / total) * 100 : 0;
  }
}
