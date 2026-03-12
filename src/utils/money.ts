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
 * Formats a cents value as currency string using the given symbol.
 */
export function formatMoney(
  cents: number,
  currencySymbol: string = '$',
  decimalPlaces: number = 2,
): string {
  const dollars = centsToDollars(cents);
  const fixed = dollars.toFixed(decimalPlaces);
  const isNeg = fixed.startsWith('-');
  const abs = isNeg ? fixed.slice(1) : fixed;
  const [whole, frac] = abs.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${currencySymbol} ${withCommas}${frac ? '.' + frac : ''}`;
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
