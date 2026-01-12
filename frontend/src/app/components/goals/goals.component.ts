import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../services/finance.service';
import { CurrencyService } from '../../services/currency.service';
import { ConvertCurrencyPipe } from '../../pipes/convert-currency.pipe';
import { GoalWithProgress, GoalsSummary } from '../../models/finance.model';

@Component({
  selector: 'app-goals',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    ConvertCurrencyPipe,
  ],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class GoalsComponent implements OnInit {
  loading = signal(true);
  goals = signal<GoalWithProgress[]>([]);
  summary = signal<GoalsSummary | null>(null);
  showForm = signal(false);
  contributeGoalId = signal<string | null>(null);

  goalForm: FormGroup;
  contributeForm: FormGroup;

  constructor(
    private financeService: FinanceService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public currencyService: CurrencyService
  ) {
    this.goalForm = this.fb.group({
      name: ['', Validators.required],
      targetAmount: ['', [Validators.required, Validators.min(1)]],
      deadline: [''],
    });

    this.contributeForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      note: [''],
    });
  }

  ngOnInit() {
    this.loadGoals();
  }

  loadGoals() {
    this.loading.set(true);
    this.financeService.getGoals().subscribe({
      next: (data) => {
        this.goals.set(data.goals || []);
        this.summary.set(data.summary);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading goals:', err);
        this.snackBar.open('Failed to load goals', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  toggleForm() {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.goalForm.reset();
    }
  }

  onSubmit() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;
      // Convert from selected currency to USD for storage
      const targetAmountInUSD = this.currencyService.convertToUSD(formValue.targetAmount);
      const goal = {
        name: formValue.name,
        targetAmount: targetAmountInUSD,
        deadline: formValue.deadline ? new Date(formValue.deadline).toISOString().split('T')[0] : undefined,
      };

      this.financeService.createGoal(goal).subscribe({
        next: () => {
          this.snackBar.open('Goal created successfully!', 'Close', { duration: 3000 });
          this.toggleForm();
          this.loadGoals();
        },
        error: (err) => {
          console.error('Error creating goal:', err);
          this.snackBar.open('Failed to create goal', 'Close', { duration: 3000 });
        },
      });
    }
  }

  showContributeForm(goalId: string) {
    this.contributeGoalId.set(goalId);
    this.contributeForm.reset();
  }

  hideContributeForm() {
    this.contributeGoalId.set(null);
  }

  contribute(goalId: string) {
    if (this.contributeForm.valid) {
      const { amount, note } = this.contributeForm.value;
      // Convert from selected currency to USD for storage
      const amountInUSD = this.currencyService.convertToUSD(amount);

      this.financeService.contributeToGoal(goalId, amountInUSD, note).subscribe({
        next: () => {
          this.snackBar.open('Contribution added!', 'Close', { duration: 3000 });
          this.hideContributeForm();
          this.loadGoals();
        },
        error: (err) => {
          console.error('Error contributing:', err);
          this.snackBar.open('Failed to add contribution', 'Close', { duration: 3000 });
        },
      });
    }
  }

  deleteGoal(goal: GoalWithProgress) {
    if (confirm(`Delete goal "${goal.name}"?`)) {
      this.financeService.deleteGoal(goal.id).subscribe({
        next: () => {
          this.snackBar.open('Goal deleted', 'Close', { duration: 3000 });
          this.loadGoals();
        },
        error: (err) => {
          console.error('Error deleting goal:', err);
          this.snackBar.open('Failed to delete goal', 'Close', { duration: 3000 });
        },
      });
    }
  }

  getProgress(goal: GoalWithProgress): number {
    return goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  }

  getDaysRemaining(goal: GoalWithProgress): number | null {
    if (!goal.deadline) return null;
    const deadline = new Date(goal.deadline);
    const today = new Date();
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDeadlineStatus(goal: GoalWithProgress): string {
    const days = this.getDaysRemaining(goal);
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'soon';
    return 'normal';
  }
}
