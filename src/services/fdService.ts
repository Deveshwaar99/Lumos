import { getDatabase } from '../db/database';
import { FixedDeposit, CreateFDInput } from '../models/types';
import { accountService } from './accountService';
import { transactionService } from './transactionService';
import { generateId } from '../utils/uuid';
import {
  calculateFDInterest,
  calculateNetInterest,
  calculateTDS,
} from '../utils/fdCalculator';
import { format } from 'date-fns';

function mapRow(row: any): FixedDeposit {
  return {
    id: row.id,
    fdAccountId: row.fd_account_id,
    sourceAccountId: row.source_account_id,
    creditAccountId: row.credit_account_id,
    interestCategoryId: row.interest_category_id,
    principalCents: row.principal_cents,
    annualInterestRate: row.annual_interest_rate,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    taxRate: row.tax_rate,
    currency: row.currency,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const fdService = {
  async getAll(): Promise<FixedDeposit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM fixed_deposits ORDER BY maturity_date ASC',
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<FixedDeposit | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM fixed_deposits WHERE id = ?',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async getActive(): Promise<FixedDeposit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM fixed_deposits WHERE status = 'active' ORDER BY maturity_date ASC",
    );
    return rows.map(mapRow);
  },

  async getFdAccountIds(): Promise<Set<string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ fd_account_id: string }>(
      'SELECT fd_account_id FROM fixed_deposits',
    );
    return new Set(rows.map((r) => r.fd_account_id));
  },

  async create(data: CreateFDInput): Promise<FixedDeposit> {
    const fdAccount = await accountService.create({
      name: `FD — ${data.label}`,
      type: 'savings',
      icon: 'lock',
      openingBalanceCents: 0,
    });

    const id = generateId();
    const now = new Date().toISOString();

    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO fixed_deposits (id, fd_account_id, source_account_id, credit_account_id, interest_category_id, principal_cents, annual_interest_rate, start_date, maturity_date, tax_rate, currency, note, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        fdAccount.id,
        data.sourceAccountId,
        data.creditAccountId,
        data.interestCategoryId,
        data.principalCents,
        data.annualInterestRate,
        data.startDate,
        data.maturityDate,
        data.taxRate,
        data.currency,
        data.note ?? null,
        'active',
        now,
        now,
      ],
    );

    await transactionService.transfer(
      data.sourceAccountId,
      fdAccount.id,
      data.principalCents,
      data.currency,
      `FD opened — ${data.label}`,
      data.startDate,
      id,
    );

    return {
      id,
      fdAccountId: fdAccount.id,
      sourceAccountId: data.sourceAccountId,
      creditAccountId: data.creditAccountId,
      interestCategoryId: data.interestCategoryId,
      principalCents: data.principalCents,
      annualInterestRate: data.annualInterestRate,
      startDate: data.startDate,
      maturityDate: data.maturityDate,
      taxRate: data.taxRate,
      currency: data.currency,
      note: data.note ?? null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
  },

  async update(
    id: string,
    data: Partial<Omit<CreateFDInput, 'sourceAccountId'>>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (data.creditAccountId !== undefined) {
      fields.push('credit_account_id = ?');
      values.push(data.creditAccountId);
    }
    if (data.interestCategoryId !== undefined) {
      fields.push('interest_category_id = ?');
      values.push(data.interestCategoryId);
    }
    if (data.annualInterestRate !== undefined) {
      fields.push('annual_interest_rate = ?');
      values.push(data.annualInterestRate);
    }
    if (data.maturityDate !== undefined) {
      fields.push('maturity_date = ?');
      values.push(data.maturityDate);
    }
    if (data.taxRate !== undefined) {
      fields.push('tax_rate = ?');
      values.push(data.taxRate);
    }
    if (data.note !== undefined) {
      fields.push('note = ?');
      values.push(data.note);
    }
    if (data.label !== undefined) {
      fields.push('note = ?');
      values.push(data.note);
    }

    if (fields.length <= 1) return;
    values.push(id);
    await db.runAsync(
      `UPDATE fixed_deposits SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async matureFD(id: string): Promise<boolean> {
    const fd = await this.getById(id);
    if (!fd || fd.status !== 'active') return false;

    const existing = await transactionService.getByFdId(id);
    const hasMaturityIncome = existing.some(
      (t) => t.type === 'income' && t.note?.includes('interest'),
    );
    if (hasMaturityIncome) return false;

    const grossInterest = calculateFDInterest(
      fd.principalCents,
      fd.annualInterestRate,
      fd.startDate,
      fd.maturityDate,
    );
    const netInterest = calculateNetInterest(grossInterest, fd.taxRate);
    const tds = calculateTDS(grossInterest, fd.taxRate);

    await transactionService.transfer(
      fd.fdAccountId,
      fd.creditAccountId,
      fd.principalCents,
      fd.currency,
      'FD matured — principal return',
      fd.maturityDate,
      id,
    );

    if (netInterest > 0) {
      const grossFormatted = (grossInterest / 100).toFixed(2);
      const tdsFormatted = (tds / 100).toFixed(2);
      await transactionService.createWithFdId(
        {
          type: 'income',
          totalAmountCents: netInterest,
          currency: fd.currency,
          categoryId: fd.interestCategoryId,
          note: `FD interest — gross: ${grossFormatted}, TDS: ${tdsFormatted}`,
          date: fd.maturityDate,
          splits: [{ accountId: fd.creditAccountId, amountCents: netInterest }],
        },
        id,
      );
    }

    const db = await getDatabase();
    await db.runAsync(
      "UPDATE fixed_deposits SET status = 'matured', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );

    return true;
  },

  async closeFD(id: string): Promise<boolean> {
    const fd = await this.getById(id);
    if (!fd || fd.status !== 'active') return false;

    const today = format(new Date(), 'yyyy-MM-dd');

    await transactionService.transfer(
      fd.fdAccountId,
      fd.creditAccountId,
      fd.principalCents,
      fd.currency,
      'FD closed early — principal return',
      today,
      id,
    );

    const db = await getDatabase();
    await db.runAsync(
      "UPDATE fixed_deposits SET status = 'closed', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );

    return true;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    const fd = await this.getById(id);

    const txns = await transactionService.getByFdId(id);
    for (const txn of txns) {
      await transactionService.delete(txn.id);
    }

    await db.runAsync('DELETE FROM fixed_deposits WHERE id = ?', [id]);

    if (fd) {
      await db.runAsync('DELETE FROM accounts WHERE id = ?', [fd.fdAccountId]);
    }
  },

  async processMaturedDeposits(): Promise<number> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM fixed_deposits WHERE status = 'active' AND maturity_date <= ?",
      [today],
    );
    const activeFDs = rows.map(mapRow);

    let maturedCount = 0;
    for (const fd of activeFDs) {
      const success = await this.matureFD(fd.id);
      if (success) maturedCount++;
    }
    return maturedCount;
  },
};
