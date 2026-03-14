import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { getDatabase } from '../db/database';
import {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  RecurrenceFrequency,
} from '../models/types';
import { transactionService } from './transactionService';
import { generateId } from '../utils/uuid';

function mapRow(row: any): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    totalAmountCents: row.total_amount_cents,
    currency: row.currency,
    categoryId: row.category_id,
    note: row.note,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    nextDueDate: row.next_due_date,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function advanceDate(dateStr: string, frequency: RecurrenceFrequency): string {
  const date = new Date(dateStr + 'T00:00:00');
  switch (frequency) {
    case 'daily':
      return format(addDays(date, 1), 'yyyy-MM-dd');
    case 'weekly':
      return format(addWeeks(date, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd');
    case 'yearly':
      return format(addYears(date, 1), 'yyyy-MM-dd');
  }
}

export const recurringTransactionService = {
  async getAll(): Promise<RecurringTransaction[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM recurring_transactions ORDER BY next_due_date ASC',
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<RecurringTransaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM recurring_transactions WHERE id = ?',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async create(
    data: CreateRecurringTransactionInput,
  ): Promise<RecurringTransaction> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO recurring_transactions
       (id, type, total_amount_cents, currency, category_id, note, account_id, to_account_id,
        frequency, start_date, end_date, next_due_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        data.type,
        data.totalAmountCents,
        data.currency,
        data.categoryId ?? null,
        data.note ?? null,
        data.accountId,
        data.toAccountId ?? null,
        data.frequency,
        data.startDate,
        data.endDate ?? null,
        data.startDate,
        now,
        now,
      ],
    );
    return (await this.getById(id))!;
  },

  async update(
    id: string,
    data: Partial<CreateRecurringTransactionInput>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.totalAmountCents !== undefined) {
      fields.push('total_amount_cents = ?');
      values.push(data.totalAmountCents);
    }
    if (data.currency !== undefined) {
      fields.push('currency = ?');
      values.push(data.currency);
    }
    if (data.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(data.categoryId ?? null);
    }
    if (data.note !== undefined) {
      fields.push('note = ?');
      values.push(data.note ?? null);
    }
    if (data.accountId !== undefined) {
      fields.push('account_id = ?');
      values.push(data.accountId);
    }
    if (data.toAccountId !== undefined) {
      fields.push('to_account_id = ?');
      values.push(data.toAccountId ?? null);
    }
    if (data.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(data.frequency);
    }
    if (data.startDate !== undefined) {
      fields.push('start_date = ?');
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      fields.push('end_date = ?');
      values.push(data.endDate ?? null);
    }

    if (data.startDate !== undefined || data.frequency !== undefined) {
      const existing = await this.getById(id);
      if (existing) {
        const newStart = data.startDate ?? existing.startDate;
        const newFreq = data.frequency ?? existing.frequency;
        const today = format(new Date(), 'yyyy-MM-dd');
        let nextDue = newStart;
        while (nextDue < today) {
          nextDue = advanceDate(nextDue, newFreq);
        }
        fields.push('next_due_date = ?');
        values.push(nextDue);
      }
    }

    values.push(id);
    await db.runAsync(
      `UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
  },

  async toggleActive(id: string, active: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE recurring_transactions SET is_active = ?, updated_at = ? WHERE id = ?',
      [active ? 1 : 0, new Date().toISOString(), id],
    );
  },

  async processDueTransactions(): Promise<number> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');
    const dueRows = await db.getAllAsync<any>(
      'SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_due_date <= ?',
      [today],
    );

    let count = 0;
    for (const row of dueRows) {
      const rec = mapRow(row);

      if (rec.endDate && rec.nextDueDate > rec.endDate) {
        await this.toggleActive(rec.id, false);
        continue;
      }

      try {
        if (rec.type === 'transfer' && rec.toAccountId) {
          await transactionService.create({
            type: 'transfer',
            totalAmountCents: rec.totalAmountCents,
            currency: rec.currency,
            categoryId: null,
            note: rec.note,
            date: `${rec.nextDueDate}T12:00:00`,
            splits: [
              { accountId: rec.accountId, amountCents: rec.totalAmountCents },
              { accountId: rec.toAccountId, amountCents: rec.totalAmountCents },
            ],
          });
        } else {
          await transactionService.create({
            type: rec.type,
            totalAmountCents: rec.totalAmountCents,
            currency: rec.currency,
            categoryId: rec.categoryId,
            note: rec.note,
            date: `${rec.nextDueDate}T12:00:00`,
            splits: [
              { accountId: rec.accountId, amountCents: rec.totalAmountCents },
            ],
          });
        }

        const nextDate = advanceDate(rec.nextDueDate, rec.frequency);

        if (rec.endDate && nextDate > rec.endDate) {
          await db.runAsync(
            'UPDATE recurring_transactions SET next_due_date = ?, is_active = 0, updated_at = ? WHERE id = ?',
            [nextDate, new Date().toISOString(), rec.id],
          );
        } else {
          await db.runAsync(
            'UPDATE recurring_transactions SET next_due_date = ?, updated_at = ? WHERE id = ?',
            [nextDate, new Date().toISOString(), rec.id],
          );
        }

        count++;
      } catch (e) {
        console.error(`[Recurring] Failed to process ${rec.id}:`, e);
      }
    }

    return count;
  },
};
