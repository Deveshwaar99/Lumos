export type CurrencyConfig = {
  code: string;
  symbol: string;
  decimalPlaces: number;
};

/**
 * Converts cents to dollars.
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Converts dollars to cents, rounded.
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Formats a cents value as currency string.
 * Falls back to manual formatting if Intl.NumberFormat is not fully available (e.g. React Native).
 */
export function formatMoney(
  cents: number,
  currency: string = 'USD',
  decimalPlaces: number = 2,
  currencySymbol?: string,
): string {
  const dollars = centsToDollars(cents);

  if (currencySymbol) {
    const fixed = dollars.toFixed(decimalPlaces);
    const isNeg = fixed.startsWith('-');
    const abs = isNeg ? fixed.slice(1) : fixed;
    const [whole, frac] = abs.split('.');
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = `${currencySymbol}${withCommas}${frac ? '.' + frac : ''}`;
    return isNeg ? `-${formatted}` : formatted;
  }

  try {
    if (
      typeof Intl !== 'undefined' &&
      typeof Intl.NumberFormat === 'function'
    ) {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(dollars);
    }
  } catch {
    // Intl might throw on some React Native environments
  }
  const fixed = dollars.toFixed(decimalPlaces);
  const isNeg = fixed.startsWith('-');
  const abs = isNeg ? fixed.slice(1) : fixed;
  const [whole, frac] = abs.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = currency === 'USD' ? '$' : currency + ' ';
  const formatted = `${symbol}${withCommas}${frac ? '.' + frac : ''}`;
  return isNeg ? `-${formatted}` : formatted;
}

/**
 * Parses a decimal string (e.g. "12.50", "$1,234.56") to cents.
 */
export function parseMoney(input: string): number {
  // Strip non-numeric except decimal point
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return dollarsToCents(parsed);
}
