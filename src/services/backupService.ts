import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';
import type { BackupData } from '../models/types';

const BACKUP_VERSION = 4;

export const backupService = {
  async createBackup(): Promise<string> {
    const db = await getDatabase();
    const categories = await db.getAllAsync('SELECT * FROM categories');
    const accounts = await db.getAllAsync('SELECT * FROM accounts');
    const transactions = await db.getAllAsync('SELECT * FROM transactions');
    const transactionSplits = await db.getAllAsync(
      'SELECT * FROM transaction_splits',
    );
    const budgets = await db.getAllAsync('SELECT * FROM budgets');
    let fixedDeposits: any[] = [];
    try {
      fixedDeposits = await db.getAllAsync('SELECT * FROM fixed_deposits');
    } catch {
      // table may not exist on older schemas
    }
    const settingsRows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT * FROM settings',
    );
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => {
      settings[r.key] = r.value;
    });

    const backup: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      categories: categories as any,
      accounts: accounts as any,
      transactions: transactions as any,
      transactionSplits: transactionSplits as any,
      budgets: budgets as any,
      fixedDeposits: fixedDeposits as any,
      settings,
    };

    const fileName = `lumos-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const file = new File(Paths.cache, fileName);
    file.write(JSON.stringify(backup, null, 2));

    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('lastBackupAt', ?)",
      new Date().toISOString(),
    );

    return file.uri;
  },

  async shareBackup(filePath: string): Promise<void> {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Save Lumos Backup',
    });
  },

  async pickAndRestore(): Promise<{
    success: boolean;
    message: string;
    data?: BackupData;
  }> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, message: 'Cancelled' };
    }

    const pickedFile = new File(result.assets[0].uri);
    const content = await pickedFile.text();
    let backup: BackupData;

    try {
      backup = JSON.parse(content);
    } catch {
      return { success: false, message: 'Invalid backup file format.' };
    }

    if (!backup.version || backup.version > BACKUP_VERSION) {
      return { success: false, message: 'Incompatible backup version.' };
    }

    return {
      success: true,
      message: `Backup from ${backup.exportedAt}. Ready to restore.`,
      data: backup,
    };
  },

  async restoreFromData(backup: BackupData): Promise<void> {
    const db = await getDatabase();

    try {
      await db.execAsync('DELETE FROM fixed_deposits');
    } catch {
      /* may not exist */
    }
    await db.execAsync('DELETE FROM transaction_splits');
    await db.execAsync('DELETE FROM transactions');
    await db.execAsync('DELETE FROM budgets');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM accounts');
    await db.execAsync('DELETE FROM settings');

    for (const cat of backup.categories) {
      const c = cat as any;
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
        c.id,
        c.name,
        c.type,
        c.icon,
        c.color,
      );
    }

    for (const acc of backup.accounts) {
      const a = acc as any;
      await db.runAsync(
        'INSERT INTO accounts (id, name, type, icon, opening_balance_cents, currency) VALUES (?, ?, ?, ?, ?, ?)',
        a.id,
        a.name,
        a.type,
        a.icon,
        a.opening_balance_cents ?? a.openingBalanceCents ?? 0,
        a.currency ?? 'USD',
      );
    }

    for (const txn of backup.transactions) {
      const t = txn as any;
      await db.runAsync(
        `INSERT INTO transactions (id, type, total_amount_cents, currency, category_id, account_id, note, date, linked_transaction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.type,
        t.total_amount_cents ??
          t.totalAmountCents ??
          t.amount_cents ??
          t.amountCents,
        t.currency,
        t.category_id ?? t.categoryId,
        t.account_id ?? t.accountId ?? '',
        t.note,
        t.date,
        t.linked_transaction_id ?? t.linkedTransactionId ?? null,
        t.created_at ?? t.createdAt,
        t.updated_at ?? t.updatedAt,
      );
    }

    const splits = backup.transactionSplits ?? [];
    for (const sp of splits) {
      const s = sp as any;
      await db.runAsync(
        'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
        s.id,
        s.transaction_id ?? s.transactionId,
        s.account_id ?? s.accountId,
        s.amount_cents ?? s.amountCents,
      );
    }

    if (splits.length === 0 && backup.version < 2) {
      const txnRows = await db.getAllAsync<any>(
        'SELECT id, account_id, total_amount_cents FROM transactions',
      );
      for (const row of txnRows) {
        await db.runAsync(
          'INSERT INTO transaction_splits (id, transaction_id, account_id, amount_cents) VALUES (?, ?, ?, ?)',
          row.id + '_s0',
          row.id,
          row.account_id,
          row.total_amount_cents,
        );
      }
    }

    for (const bud of backup.budgets) {
      const b = bud as any;
      await db.runAsync(
        'INSERT INTO budgets (id, month, category_id, limit_cents, alert_threshold_pct, enabled) VALUES (?, ?, ?, ?, ?, ?)',
        b.id,
        b.month,
        b.category_id ?? b.categoryId,
        b.limit_cents ?? b.limitCents,
        b.alert_threshold_pct ?? b.alertThresholdPct ?? 80,
        b.enabled !== undefined ? (b.enabled ? 1 : 0) : 1,
      );
    }

    const fds = backup.fixedDeposits ?? [];
    for (const fd of fds) {
      const f = fd as any;
      try {
        await db.runAsync(
          `INSERT INTO fixed_deposits (id, fd_account_id, source_account_id, credit_account_id, interest_category_id, principal_cents, annual_interest_rate, start_date, maturity_date, tax_rate, currency, note, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          f.id,
          f.fd_account_id ?? f.fdAccountId,
          f.source_account_id ?? f.sourceAccountId,
          f.credit_account_id ?? f.creditAccountId,
          f.interest_category_id ?? f.interestCategoryId ?? null,
          f.principal_cents ?? f.principalCents,
          f.annual_interest_rate ?? f.annualInterestRate,
          f.start_date ?? f.startDate,
          f.maturity_date ?? f.maturityDate,
          f.tax_rate ?? f.taxRate ?? 0,
          f.currency ?? 'USD',
          f.note ?? null,
          f.status ?? 'active',
          f.created_at ?? f.createdAt,
          f.updated_at ?? f.updatedAt,
        );
      } catch {
        // skip if table doesn't exist
      }
    }

    for (const [key, value] of Object.entries(backup.settings)) {
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        key,
        value,
      );
    }
  },
};
