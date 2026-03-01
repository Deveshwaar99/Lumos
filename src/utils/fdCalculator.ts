import { differenceInDays, parseISO } from 'date-fns';

export function daysBetween(startDate: string, endDate: string): number {
  return differenceInDays(parseISO(endDate), parseISO(startDate));
}

export function calculateFDInterest(
  principalCents: number,
  annualRate: number,
  startDate: string,
  endDate: string,
): number {
  const days = daysBetween(startDate, endDate);
  if (days <= 0) return 0;
  return Math.round(principalCents * (annualRate / 100) * (days / 365));
}

export function calculateTDS(interestCents: number, taxRate: number): number {
  return Math.round(interestCents * (taxRate / 100));
}

export function calculateNetInterest(interestCents: number, taxRate: number): number {
  return interestCents - calculateTDS(interestCents, taxRate);
}

export function getDaysRemaining(maturityDate: string): number {
  const today = new Date().toISOString().substring(0, 10);
  const remaining = daysBetween(today, maturityDate);
  return Math.max(0, remaining);
}
