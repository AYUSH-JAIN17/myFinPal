import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'convertCurrency',
  standalone: true,
  pure: false, // Needs to update when currency changes
})
export class ConvertCurrencyPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(amountInUSD: number | null | undefined, showSymbol: boolean = true): string {
    if (amountInUSD == null) {
      return showSymbol ? `${this.currencyService.getCurrencySymbol()}0.00` : '0.00';
    }

    const converted = this.currencyService.convert(amountInUSD);
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (showSymbol) {
      return `${this.currencyService.getCurrencySymbol()}${formatted}`;
    }
    return formatted;
  }
}
