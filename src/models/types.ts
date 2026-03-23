export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  totalAmountCents: number;
  currency: string;
  categoryId: string | null;
  note: string | null;
  date: string;
  linkedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSplit {
  id: string;
  transactionId: string;
  accountId: string;
  amountCents: number;
}

export interface TransactionWithSplits extends Transaction {
  splits: TransactionSplit[];
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'card' | 'savings' | 'other';
  icon: string;
  openingBalanceCents: number;
}

export interface Budget {
  id: string;
  month: string;
  categoryId: string;
  limitCents: number;
  alertThresholdPct: number;
  enabled: boolean;
}

export interface AppSettings {
  decimalPlaces: number;
  currencySymbol: string;
  lastBackupAt: string | null;
  username: string;
  screenLockEnabled: boolean;
}

export interface TransactionFilter {
  dateFrom: string | null;
  dateTo: string | null;
  type: TransactionType | null;
  accountId: string | null;
  categoryId: string | null;
  searchQuery?: string | null;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  total: number;
}

export interface DailyCashFlow {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  type: Account['type'];
  balance: number;
}

export interface AccountPeriodBalance {
  accountId: string;
  accountName: string;
  type: Account['type'];
  icon: string;
  periodIncome: number;
  periodExpense: number;
}

export interface NetWorthPoint {
  month: string;
  netWorth: number;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  transactionSplits: TransactionSplit[];
  budgets: Budget[];
  fixedDeposits?: FixedDeposit[];
  recurringTransactions?: RecurringTransaction[];
  settings: Record<string, string>;
}

export interface SplitInput {
  accountId: string;
  amountCents: number;
}

export interface CreateTransactionInput {
  type: TransactionType;
  totalAmountCents: number;
  currency: string;
  categoryId: string | null;
  note?: string | null;
  date: string;
  splits: SplitInput[];
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  totalAmountCents: number;
  currency: string;
  categoryId: string | null;
  note: string | null;
  accountId: string;
  toAccountId: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringTransactionInput {
  type: TransactionType;
  totalAmountCents: number;
  currency: string;
  categoryId: string | null;
  note?: string | null;
  accountId: string;
  toAccountId?: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string | null;
}

export type FDStatus = 'active' | 'matured' | 'closed';

export interface FixedDeposit {
  id: string;
  fdAccountId: string;
  sourceAccountId: string;
  creditAccountId: string;
  interestCategoryId: string;
  principalCents: number;
  annualInterestRate: number;
  startDate: string;
  maturityDate: string;
  taxRate: number;
  currency: string;
  note: string | null;
  status: FDStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFDInput {
  label: string;
  sourceAccountId: string;
  creditAccountId: string;
  interestCategoryId: string;
  principalCents: number;
  annualInterestRate: number;
  startDate: string;
  maturityDate: string;
  taxRate: number;
  currency: string;
  note?: string | null;
}
