import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { CurrencyService } from './services/currency.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('MyFinPal');

  navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/transactions', icon: 'receipt_long', label: 'Transactions' },
    { path: '/budgets', icon: 'account_balance_wallet', label: 'Budgets' },
    { path: '/goals', icon: 'savings', label: 'Goals' },
    { path: '/recurring', icon: 'autorenew', label: 'Recurring' },
    { path: '/analytics', icon: 'insights', label: 'Analytics' },
  ];

  constructor(public currencyService: CurrencyService) {}
}
