import { z } from 'zod';

export const splitInputSchema = z.object({
  accountId: z.string().min(1),
  amountCents: z.number().int().positive(),
});

export const transactionSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    totalAmountCents: z.number().int().positive(),
    currency: z.string().min(1),
    categoryId: z.string().nullable(),
    note: z.string().optional(),
    date: z.string(),
    splits: z.array(splitInputSchema).min(1).max(2),
  })
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return data.splits.length === 2;
      }
      return true;
    },
    {
      message: 'Transfers must have exactly two accounts (from and to)',
      path: ['splits'],
    },
  )
  .refine(
    (data) => {
      if (data.type !== 'transfer') {
        return data.categoryId != null && data.categoryId.length > 0;
      }
      return true;
    },
    {
      message: 'Category is required for income/expense',
      path: ['categoryId'],
    },
  )
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return data.splits.every(
          (sp) => sp.amountCents === data.totalAmountCents,
        );
      }
      const splitSum = data.splits.reduce((s, sp) => s + sp.amountCents, 0);
      return splitSum === data.totalAmountCents;
    },
    { message: 'Split amounts must equal the total amount', path: ['splits'] },
  );

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const accountSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['cash', 'bank', 'card', 'savings', 'other']),
  icon: z.string().min(1),
  openingBalanceCents: z.number().int(),
});

export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string().min(1),
  limitCents: z.number().int().positive(),
  alertThresholdPct: z.number().int().min(1).max(100),
  enabled: z.boolean(),
});

export const recurringTransactionSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    totalAmountCents: z.number().int().positive(),
    currency: z.string().min(1),
    categoryId: z.string().nullable(),
    note: z.string().optional().nullable(),
    accountId: z.string().min(1),
    toAccountId: z.string().optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return data.toAccountId != null && data.toAccountId.length > 0;
      }
      return true;
    },
    { message: 'To Account is required for transfers', path: ['toAccountId'] },
  )
  .refine(
    (data) => {
      if (data.type === 'transfer') {
        return data.accountId !== data.toAccountId;
      }
      return true;
    },
    {
      message: 'From and To accounts must be different',
      path: ['toAccountId'],
    },
  )
  .refine(
    (data) => {
      if (data.type !== 'transfer') {
        return data.categoryId != null && data.categoryId.length > 0;
      }
      return true;
    },
    {
      message: 'Category is required for income/expense',
      path: ['categoryId'],
    },
  )
  .refine(
    (data) => {
      if (data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export const fdSchema = z
  .object({
    label: z.string().min(1).max(100),
    sourceAccountId: z.string().min(1),
    creditAccountId: z.string().min(1),
    interestCategoryId: z.string().min(1),
    principalCents: z.number().int().positive(),
    annualInterestRate: z.number().positive().max(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    taxRate: z.number().min(0).max(100),
    currency: z.string().min(1),
    note: z.string().optional().nullable(),
  })
  .refine((data) => data.maturityDate > data.startDate, {
    message: 'Maturity date must be after start date',
    path: ['maturityDate'],
  });
