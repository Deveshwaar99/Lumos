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

/** Clamps decimal places for display (matches typical money UI). */
export function clampMoneyDecimalPlaces(decimalPlaces: number): number {
  if (!Number.isFinite(decimalPlaces)) return 2;
  return Math.min(6, Math.max(0, Math.round(decimalPlaces)));
}

/**
 * Formats a cents value as currency string using the given symbol.
 * Uses the device locale for digit grouping (e.g. en-IN lakh/crore groups).
 */
export function formatMoney(
  cents: number,
  currencySymbol: string = '$',
  decimalPlaces: number = 2,
): string {
  const dp = clampMoneyDecimalPlaces(decimalPlaces);
  const dollars = centsToDollars(cents);

  if (!Number.isFinite(dollars)) {
    const zero = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
      useGrouping: true,
    }).format(0);
    const sym = currencySymbol.trim();
    return sym ? `${sym} ${zero}` : zero;
  }

  const isNeg = dollars < 0 || Object.is(dollars, -0);
  const abs = Math.abs(dollars);

  let numPart: string;
  try {
    numPart = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
      useGrouping: true,
    }).format(abs);
  } catch {
    const fixed = abs.toFixed(dp);
    const [whole, frac] = fixed.split('.');
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    numPart = frac !== undefined ? `${withCommas}.${frac}` : withCommas;
  }

  const sym = currencySymbol.trim();
  const formatted = sym.length > 0 ? `${sym} ${numPart}` : numPart;
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
