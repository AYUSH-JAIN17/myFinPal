import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { RecurringTransaction, UpcomingRecurring } from '../../models/finance.model';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    ConvertCurrencyPipe,
  ],
  templateUrl: './recurring.component.html',
  styleUrl: './recurring.component.scss',
})
export class RecurringComponent implements OnInit {
  loading = signal(true);
  recurring = signal<RecurringTransaction[]>([]);
  upcoming = signal<UpcomingRecurring[]>([]);
  showForm = signal(false);

  recurringForm: FormGroup;

  frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  categories = [
    'Bills & Utilities',
    'Subscriptions',
    'Rent/Mortgage',
    'Insurance',
    'Salary',
    'Freelance',
    'Investment Income',
    'Other',
  ];

  constructor(
    private financeService: FinanceService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public currencyService: CurrencyService
  ) {
    this.recurringForm = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      category: [''],
      frequency: ['monthly', Validators.required],
    });
  }

  ngOnInit() {
    this.loadRecurring();
  }

  loadRecurring() {
    this.loading.set(true);
    this.financeService.getRecurring().subscribe({
      next: (data) => {
        this.recurring.set(data.recurring || []);
        this.upcoming.set(data.upcoming || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading recurring:', err);
        this.snackBar.open('Failed to load recurring transactions', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.recurringForm.reset({ type: 'expense', frequency: 'monthly' });
    }
  }

  onSubmit() {
    if (this.recurringForm.valid) {
      const formValue = this.recurringForm.value;
      // Convert from selected currency to USD for storage
      const amountInUSD = this.currencyService.convertToUSD(formValue.amount);
      const recurring = {
        ...formValue,
        amount: amountInUSD,
      };
      this.financeService.addRecurring(recurring).subscribe({
        next: () => {
          this.snackBar.open('Recurring transaction created!', 'Close', { duration: 3000 });
          this.toggleForm();
          this.loadRecurring();
        },
        error: (err) => {
          console.error('Error creating recurring:', err);
          this.snackBar.open('Failed to create recurring transaction', 'Close', { duration: 3000 });
        },
      });
    }
  }

  toggleActive(item: RecurringTransaction) {
    this.financeService.toggleRecurring(item.id, !item.active).subscribe({
      next: () => {
        this.snackBar.open(
          `Recurring transaction ${!item.active ? 'activated' : 'paused'}`,
          'Close',
          { duration: 3000 }
        );
        this.loadRecurring();
      },
      error: () => {
        this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
      },
    });
  }

  deleteRecurring(item: RecurringTransaction) {
    if (confirm(`Delete "${item.description}"?`)) {
      this.financeService.deleteRecurring(item.id).subscribe({
        next: () => {
          this.snackBar.open('Recurring transaction deleted', 'Close', { duration: 3000 });
          this.loadRecurring();
        },
        error: () => {
          this.snackBar.open('Failed to delete', 'Close', { duration: 3000 });
        },
      });
    }
  }

  processAll() {
    this.financeService.processRecurring().subscribe({
      next: (result) => {
        this.snackBar.open(
          `Processed ${result.processed} recurring transactions`,
          'Close',
          { duration: 3000 }
        );
        this.loadRecurring();
      },
      error: () => {
        this.snackBar.open('Failed to process', 'Close', { duration: 3000 });
      },
    });
  }

  getFrequencyLabel(freq: string): string {
    return this.frequencies.find((f) => f.value === freq)?.label || freq;
  }

  getMonthlyTotal(): { income: number; expense: number } {
    let income = 0;
    let expense = 0;

    for (const r of this.recurring()) {
      if (!r.active) continue;
      let monthly = r.amount;
      switch (r.frequency) {
        case 'daily':
          monthly = r.amount * 30;
          break;
        case 'weekly':
          monthly = r.amount * 4;
          break;
        case 'yearly':
          monthly = r.amount / 12;
          break;
      }
      if (r.type === 'income') income += monthly;
      else expense += monthly;
    }

    return { income, expense };
  }
}
