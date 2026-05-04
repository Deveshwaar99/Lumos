import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../db/database';
import type {
  SmsPermissionStatus,
  StockHolding,
  StockMovement,
  StockMovementInput,
  StockSmsLog,
} from '../models/types';
import { STOCK_FIRST_SYNC_WINDOW_DAYS } from '../constants/stockSync';
import { generateId } from '../utils/uuid';
import { parseCdsAlert } from './cdsSmsParser';
import { readCdsAlerts, requestSmsPermission } from './smsReader';

type StockLogRow = {
  id: string;
  provider_sms_id: string | null;
  sender: string;
  body: string;
  body_hash: string;
  received_at: number;
  parsed_at: string;
  parse_status: 'success' | 'failed' | 'ignored';
  parse_error: string | null;
  movement_count: number;
};

type StockMovementRow = {
  id: string;
  sms_id: string | null;
  stock_code: string;
  quantity: number;
  direction: 'buy' | 'sell';
  trade_date: string;
  source: 'sms' | 'manual';
  note: string | null;
  created_at: string;
  updated_at: string;
};

function mapSmsRow(row: StockLogRow): StockSmsLog {
  return {
    id: row.id,
    providerSmsId: row.provider_sms_id,
    sender: row.sender,
    body: row.body,
    bodyHash: row.body_hash,
    receivedAt: row.received_at,
    parsedAt: row.parsed_at,
    parseStatus: row.parse_status,
    parseError: row.parse_error,
    movementCount: row.movement_count,
  };
}

function mapMovementRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    smsId: row.sms_id,
    stockCode: row.stock_code,
    quantity: row.quantity,
    direction: row.direction,
    tradeDate: row.trade_date,
    source: row.source,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDatabase();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const result = await fn();
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}

export const stockService = {
  async getMeta(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM stock_meta WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  },

  async setMeta(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO stock_meta (key, value) VALUES (?, ?)',
      [key, value],
    );
  },

  async listSmsLogs(opts?: {
    status?: StockSmsLog['parseStatus'];
    limit?: number;
  }): Promise<StockSmsLog[]> {
    const db = await getDatabase();
    const where = opts?.status ? 'WHERE parse_status = ?' : '';
    const limit = opts?.limit ? 'LIMIT ?' : '';
    const params: Array<string | number> = [];
    if (opts?.status) params.push(opts.status);
    if (opts?.limit) params.push(opts.limit);

    const rows = await db.getAllAsync<StockLogRow>(
      `SELECT * FROM stock_sms_log ${where} ORDER BY received_at DESC ${limit}`,
      params,
    );
    return rows.map(mapSmsRow);
  },

  async listMovements(filter?: {
    stockCode?: string;
    source?: StockMovement['source'];
  }): Promise<StockMovement[]> {
    const db = await getDatabase();
    const where: string[] = [];
    const args: Array<string | number> = [];

    if (filter?.stockCode) {
      where.push('stock_code = ?');
      args.push(sanitizeCode(filter.stockCode));
    }
    if (filter?.source) {
      where.push('source = ?');
      args.push(filter.source);
    }

    const rows = await db.getAllAsync<StockMovementRow>(
      `SELECT * FROM stock_movements ${
        where.length ? `WHERE ${where.join(' AND ')}` : ''
      } ORDER BY trade_date DESC, created_at DESC`,
      args,
    );
    return rows.map(mapMovementRow);
  },

  async getMovementsByCode(stockCode: string): Promise<StockMovement[]> {
    return this.listMovements({ stockCode });
  },

  async getMovementById(id: string): Promise<StockMovement | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<StockMovementRow>(
      'SELECT * FROM stock_movements WHERE id = ?',
      [id],
    );
    return row ? mapMovementRow(row) : null;
  },

  async addMovement(input: StockMovementInput): Promise<StockMovement> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const stockCode = sanitizeCode(input.stockCode);
    await db.runAsync(
      `INSERT INTO stock_movements (
         id, sms_id, stock_code, quantity, direction, trade_date, source, note, created_at, updated_at
       ) VALUES (?, NULL, ?, ?, ?, ?, 'manual', ?, ?, ?)`,
      [
        id,
        stockCode,
        input.quantity,
        input.direction,
        input.tradeDate,
        input.note ?? null,
        now,
        now,
      ],
    );

    return {
      id,
      smsId: null,
      stockCode,
      quantity: input.quantity,
      direction: input.direction,
      tradeDate: input.tradeDate,
      source: 'manual',
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateMovement(
    id: string,
    patch: Partial<StockMovementInput>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const values: Array<string | number | null> = [new Date().toISOString()];

    if (patch.stockCode !== undefined) {
      fields.push('stock_code = ?');
      values.push(sanitizeCode(patch.stockCode));
    }
    if (patch.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(patch.quantity);
    }
    if (patch.direction !== undefined) {
      fields.push('direction = ?');
      values.push(patch.direction);
    }
    if (patch.tradeDate !== undefined) {
      fields.push('trade_date = ?');
      values.push(patch.tradeDate);
    }
    if (patch.note !== undefined) {
      fields.push('note = ?');
      values.push(patch.note ?? null);
    }

    values.push(id);
    await db.runAsync(
      `UPDATE stock_movements SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  },

  async deleteMovement(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM stock_movements WHERE id = ?', [id]);
  },

  async computeHoldings(includeClosed = false): Promise<StockHolding[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      stock_code: string;
      total_buy: number;
      total_sell: number;
      movement_count: number;
      last_trade_date: string;
    }>(`
      SELECT
        stock_code,
        SUM(CASE WHEN direction = 'buy' THEN quantity ELSE 0 END) AS total_buy,
        SUM(CASE WHEN direction = 'sell' THEN quantity ELSE 0 END) AS total_sell,
        COUNT(*) AS movement_count,
        MAX(trade_date) AS last_trade_date
      FROM stock_movements
      GROUP BY stock_code
      ORDER BY stock_code ASC
    `);

    return rows
      .map((row) => {
        const totalBuy = Number(row.total_buy ?? 0);
        const totalSell = Number(row.total_sell ?? 0);
        return {
          stockCode: row.stock_code,
          netQuantity: totalBuy - totalSell,
          totalBuy,
          totalSell,
          movementCount: Number(row.movement_count ?? 0),
          lastTradeDate: row.last_trade_date,
        };
      })
      .filter((row) => includeClosed || row.netQuantity !== 0);
  },

  async ignoreSms(smsId: string): Promise<void> {
    await withTransaction(async () => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM stock_movements WHERE sms_id = ?', [smsId]);
      await db.runAsync(
        `UPDATE stock_sms_log
         SET parse_status = 'ignored', parse_error = NULL, movement_count = 0, parsed_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), smsId],
      );
    });
  },

  async reparseSms(smsId: string): Promise<void> {
    await withTransaction(async () => {
      const db = await getDatabase();
      const sms = await db.getFirstAsync<StockLogRow>(
        'SELECT * FROM stock_sms_log WHERE id = ?',
        [smsId],
      );
      if (!sms) return;

      await db.runAsync('DELETE FROM stock_movements WHERE sms_id = ?', [smsId]);
      const now = new Date().toISOString();
      const parsed = parseCdsAlert(sms.body);
      if (!parsed || parsed.movements.length === 0) {
        await db.runAsync(
          `UPDATE stock_sms_log
           SET parse_status = 'failed', parse_error = ?, movement_count = 0, parsed_at = ?
           WHERE id = ?`,
          ['Could not parse CDS-Alerts format', now, smsId],
        );
        return;
      }

      for (const movement of parsed.movements) {
        await db.runAsync(
          `INSERT INTO stock_movements (
             id, sms_id, stock_code, quantity, direction, trade_date, source, note, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, 'sms', NULL, ?, ?)`,
          [
            generateId(),
            smsId,
            movement.stockCode,
            movement.quantity,
            movement.direction,
            parsed.tradeDate,
            now,
            now,
          ],
        );
      }

      await db.runAsync(
        `UPDATE stock_sms_log
         SET parse_status = 'success', parse_error = NULL, movement_count = ?, parsed_at = ?
         WHERE id = ?`,
        [parsed.movements.length, now, smsId],
      );
    });
  },

  async reparseAll(): Promise<void> {
    const logs = await this.listSmsLogs();
    for (const log of logs) {
      await this.reparseSms(log.id);
    }
  },

  async ingestSms(): Promise<{
    status: 'ok' | 'permission_denied' | 'unsupported';
    permissionStatus: SmsPermissionStatus;
    newSms: number;
    newMovements: number;
    failed: number;
    unsupportedReason?: 'expo_go';
  }> {
    if (Platform.OS !== 'android') {
      return {
        status: 'unsupported',
        permissionStatus: 'unsupported',
        newSms: 0,
        newMovements: 0,
        failed: 0,
      };
    }

    // Expo Go has no custom native modules; calling SMS list can block JS forever (timeouts never run).
    if (Constants.executionEnvironment === 'storeClient') {
      return {
        status: 'unsupported',
        permissionStatus: 'unsupported',
        newSms: 0,
        newMovements: 0,
        failed: 0,
        unsupportedReason: 'expo_go',
      };
    }

    const permissionStatus = await requestSmsPermission();
    if (permissionStatus !== 'granted') {
      return {
        status: 'permission_denied',
        permissionStatus,
        newSms: 0,
        newMovements: 0,
        failed: 0,
      };
    }

    const senderId = (await this.getMeta('senderId')) ?? 'CDS-Alerts';
    const lastSyncAtRaw = await this.getMeta('lastSyncAt');
    const firstSyncWindowDays = Number(
      (await this.getMeta('firstSyncWindowDays')) ??
        String(STOCK_FIRST_SYNC_WINDOW_DAYS),
    );
    const now = Date.now();
    const minDateMs = lastSyncAtRaw
      ? Number(lastSyncAtRaw)
      : now - Math.max(firstSyncWindowDays, 1) * 24 * 60 * 60 * 1000;

    const smsRows = await readCdsAlerts({
      senderId,
      minDateMs: Number.isFinite(minDateMs) ? minDateMs : 0,
    });

    let newSms = 0;
    let newMovements = 0;
    let failed = 0;

    await withTransaction(async () => {
      const db = await getDatabase();
      for (const sms of smsRows) {
        const bodyHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          sms.body,
        );

        const existing = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM stock_sms_log WHERE body_hash = ?',
          [bodyHash],
        );
        if (existing) continue;

        const smsId = generateId();
        const parsedAt = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO stock_sms_log (
             id, provider_sms_id, sender, body, body_hash, received_at, parsed_at, parse_status, parse_error, movement_count
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'success', NULL, 0)`,
          [
            smsId,
            sms.providerSmsId,
            sms.sender,
            sms.body,
            bodyHash,
            sms.receivedAt,
            parsedAt,
          ],
        );
        newSms += 1;

        const parsed = parseCdsAlert(sms.body);
        if (!parsed || parsed.movements.length === 0) {
          failed += 1;
          await db.runAsync(
            `UPDATE stock_sms_log
             SET parse_status = 'failed', parse_error = ?, movement_count = 0, parsed_at = ?
             WHERE id = ?`,
            ['Could not parse CDS-Alerts format', parsedAt, smsId],
          );
          continue;
        }

        for (const movement of parsed.movements) {
          await db.runAsync(
            `INSERT INTO stock_movements (
               id, sms_id, stock_code, quantity, direction, trade_date, source, note, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, 'sms', NULL, ?, ?)`,
            [
              generateId(),
              smsId,
              movement.stockCode,
              movement.quantity,
              movement.direction,
              parsed.tradeDate,
              parsedAt,
              parsedAt,
            ],
          );
        }

        newMovements += parsed.movements.length;
        await db.runAsync(
          `UPDATE stock_sms_log
           SET movement_count = ?, parse_status = 'success', parse_error = NULL, parsed_at = ?
           WHERE id = ?`,
          [parsed.movements.length, parsedAt, smsId],
        );
      }
    });

    await this.setMeta('lastSyncAt', String(now));
    return {
      status: 'ok',
      permissionStatus,
      newSms,
      newMovements,
      failed,
    };
  },
};

