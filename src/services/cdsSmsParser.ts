import type { StockMovementDirection } from '../models/types';

interface StockMovementDraft {
  stockCode: string;
  quantity: number;
  direction: StockMovementDirection;
}

export interface ParsedCdsSms {
  tradeDate: string;
  movements: StockMovementDraft[];
}

const MONTH_MAP: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function normalizeDate(day: string, month: string, year: string): string | null {
  const monthNum = MONTH_MAP[month.toUpperCase()];
  if (!monthNum) return null;

  const dd = Number(day);
  if (!Number.isInteger(dd) || dd < 1 || dd > 31) return null;

  const yy = Number(year);
  if (!Number.isInteger(yy)) return null;

  const yyyy = year.length === 2 ? 2000 + yy : yy;
  if (yyyy < 2000 || yyyy > 2100) return null;

  return `${String(yyyy).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function parseSection(section: string, direction: StockMovementDirection): StockMovementDraft[] {
  const cleaned = section.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === '0') return [];

  const tokens = cleaned.split(' ').filter(Boolean);
  const out: StockMovementDraft[] = [];

  for (let i = 0; i < tokens.length; i += 2) {
    const code = tokens[i]?.toUpperCase();
    const qtyToken = tokens[i + 1];
    if (!code || !qtyToken) break;

    if (!/^[A-Z]{2,8}$/.test(code)) continue;
    if (!/^\d+$/.test(qtyToken)) continue;

    const quantity = Number(qtyToken);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    out.push({ stockCode: code, quantity, direction });
  }

  return out;
}

export function parseCdsAlert(body: string): ParsedCdsSms | null {
  if (!body) return null;
  const text = body.replace(/\s+/g, ' ').trim().toUpperCase();
  if (!text.includes('PURCHASES') || !text.includes('SALES')) return null;

  const dateMatch = text.match(/\b(\d{1,2})-([A-Z]{3})-(\d{2,4})\b/);
  if (!dateMatch) return null;
  const tradeDate = normalizeDate(dateMatch[1], dateMatch[2], dateMatch[3]);
  if (!tradeDate) return null;

  const purchasesIdx = text.indexOf('PURCHASES');
  const salesIdx = text.indexOf('SALES');
  if (purchasesIdx < 0 || salesIdx <= purchasesIdx) return null;

  const purchasesSection = text.slice(purchasesIdx + 'PURCHASES'.length, salesIdx);
  const salesSection = text.slice(salesIdx + 'SALES'.length);

  const movements = [
    ...parseSection(purchasesSection, 'buy'),
    ...parseSection(salesSection, 'sell'),
  ];

  return { tradeDate, movements };
}

