import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../db/database';
import type { TransactionFilter } from '../models/types';
import { generateCSV } from '../utils/csv';
import { centsToDollars } from '../utils/money';

export const exportService = {
  async exportTransactionsCSV(filter?: TransactionFilter): Promise<void> {
    const db = await getDatabase();

    let query = `
      SELECT t.id, t.date, t.type, t.total_amount_cents, t.currency,
             c.name as category_name, t.note
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.dateFrom) {
      conditions.push('t.date >= ?');
      params.push(filter.dateFrom);
    }
    if (filter?.dateTo) {
      conditions.push('t.date <= ?');
      params.push(filter.dateTo);
    }
    if (filter?.type) {
      conditions.push('t.type = ?');
      params.push(filter.type);
    }
    if (filter?.accountId) {
      conditions.push('t.id IN (SELECT transaction_id FROM transaction_splits WHERE account_id = ?)');
      params.push(filter.accountId);
    }
    if (filter?.categoryId) {
      conditions.push('t.category_id = ?');
      params.push(filter.categoryId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY t.date DESC';

    const rows = await db.getAllAsync<any>(query, ...params);

    const splitRows = await db.getAllAsync<any>(
      `SELECT s.transaction_id, s.amount_cents, a.name as account_name
       FROM transaction_splits s
       LEFT JOIN accounts a ON s.account_id = a.id`
    );

    const splitMap = new Map<string, Array<{ accountName: string; amountCents: number }>>();
    for (const sr of splitRows) {
      const existing = splitMap.get(sr.transaction_id) ?? [];
      existing.push({ accountName: sr.account_name ?? '', amountCents: sr.amount_cents });
      splitMap.set(sr.transaction_id, existing);
    }

    const headers = [
      'Date', 'Type', 'Total Amount', 'Currency', 'Category',
      'Account 1', 'Amount 1', 'Account 2', 'Amount 2', 'Note',
    ];
    const csvRows = rows.map((r: any) => {
      const splits = splitMap.get(r.id) ?? [];
      return [
        r.date,
        r.type,
        centsToDollars(r.total_amount_cents).toFixed(2),
        r.currency,
        r.category_name || '',
        splits[0]?.accountName ?? '',
        splits[0] ? centsToDollars(splits[0].amountCents).toFixed(2) : '',
        splits[1]?.accountName ?? '',
        splits[1] ? centsToDollars(splits[1].amountCents).toFixed(2) : '',
        r.note || '',
      ];
    });

    const csv = generateCSV(headers, csvRows);
    const fileName = `mymoney-transactions-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    const file = new File(Paths.cache, fileName);
    file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Transactions',
    });
  },
};
