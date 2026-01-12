import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { Transaction } from '../../models/finance.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    ConvertCurrencyPipe,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit {
  loading = signal(true);
  transactions = signal<Transaction[]>([]);
  categories = signal<string[]>([]);
  showForm = signal(false);

  displayedColumns = ['date', 'description', 'category', 'type', 'amount', 'actions'];

  transactionForm: FormGroup;

  // Filter values
  filterCategory = signal<string>('');
  filterType = signal<string>('');

  defaultCategories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Health & Fitness',
    'Travel',
    'Education',
    'Income',
    'Salary',
    'Investment',
    'Other',
  ];

  constructor(
    private financeService: FinanceService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public currencyService: CurrencyService
  ) {
    this.transactionForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      description: ['', Validators.required],
      category: [''],
      date: [new Date()],
    });
  }

  ngOnInit() {
    this.loadTransactions();
    this.loadCategories();
  }

  loadTransactions() {
    this.loading.set(true);

    const filters: { category?: string; type?: 'income' | 'expense' } = {};
    if (this.filterCategory()) filters.category = this.filterCategory();
    if (this.filterType()) filters.type = this.filterType() as 'income' | 'expense';

    this.financeService.getTransactions(filters).subscribe({
      next: (data) => {
        this.transactions.set(data.transactions || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.snackBar.open('Failed to load transactions', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  loadCategories() {
    this.financeService.getCategories().subscribe({
      next: (cats) => {
        this.categories.set([...new Set([...this.defaultCategories, ...cats])]);
      },
      error: () => {
        this.categories.set(this.defaultCategories);
      },
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.transactionForm.reset({ type: 'expense', date: new Date() });
    }
  }

  onSubmit() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      // Convert from selected currency to USD for storage
      const amountInUSD = this.currencyService.convertToUSD(formValue.amount);
      const transaction = {
        amount: amountInUSD,
        type: formValue.type,
        description: formValue.description,
        category: formValue.category || undefined,
        date: formValue.date ? new Date(formValue.date).toISOString().split('T')[0] : undefined,
      };

      this.financeService.addTransaction(transaction).subscribe({
        next: (result) => {
          this.snackBar.open('Transaction added successfully!', 'Close', { duration: 3000 });
          this.toggleForm();
          this.loadTransactions();

          if (result.alert && result.alert.message) {
            setTimeout(() => {
              this.snackBar.open(`⚠️ ${result.alert!.message}`, 'Close', { duration: 5000 });
            }, 500);
          }
        },
        error: (err) => {
          console.error('Error adding transaction:', err);
          this.snackBar.open('Failed to add transaction', 'Close', { duration: 3000 });
        },
      });
    }
  }

  deleteTransaction(transaction: Transaction) {
    if (confirm(`Delete "${transaction.description}"?`)) {
      this.financeService.deleteTransaction(transaction.id).subscribe({
        next: () => {
          this.snackBar.open('Transaction deleted', 'Close', { duration: 3000 });
          this.loadTransactions();
        },
        error: (err) => {
          console.error('Error deleting transaction:', err);
          this.snackBar.open('Failed to delete transaction', 'Close', { duration: 3000 });
        },
      });
    }
  }

  applyFilter() {
    this.loadTransactions();
  }

  clearFilters() {
    this.filterCategory.set('');
    this.filterType.set('');
    this.loadTransactions();
  }

  exportCsv() {
    const url = this.financeService.exportTransactions();
    window.open(url, '_blank');
  }
}
