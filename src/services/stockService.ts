import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { STOCK_FIRST_SYNC_WINDOW_DAYS } from '../constants/stockSync';
import { getDatabase } from '../db/database';
import type {
  BrokerFundingSmsLog,
  BrokerFundingSummary,
  BrokerFundingSyncResult,
  SmsPermissionStatus,
  StockHolding,
  StockMovement,
  StockMovementInput,
  StockSmsLog,
} from '../models/types';
import { computeSmsDedupeHash } from '../utils/smsDedupeHash';
import { generateId } from '../utils/uuid';
import { parseBrokerFundingSms } from './brokerFundingParser';
import { parseCdsAlert } from './cdsSmsParser';
import {
  readCdsAlerts,
  readSmsFromSenders,
  requestSmsPermission,
} from './smsReader';

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

type BrokerFundingLogRow = {
  id: string;
  provider_sms_id: string | null;
  sender: string;
  body: string;
  body_hash: string;
  received_at: number;
  parsed_at: string;
  parse_status: 'matched' | 'unmatched' | 'ignored';
  parse_reason: string | null;
  confidence: number;
  amount_cents: number | null;
};

const DEMO_BROKER_FUNDING_SENDERS = ['DF savings', 'HNB Alerts'];
const DEMO_BROKER_FUNDING_KEYWORDS = [
  'softlogic',
  'softlogic stockbrokers',
  'softlogic stockbrokers pvt limited',
];
const DEMO_BROKER_FUNDING_MESSAGES: Array<{
  id: string;
  sender: string;
  body: string;
  daysAgo: number;
}> = [
  {
    id: 'demo-broker-funding-1',
    sender: 'DF savings',
    body:
      'Your payment of Rs.60000.00 to SOFTLOGIC STOCKBROKERS PVT LIMITED from DF savings has been made successfully. (ref 176880018106329)',
    daysAgo: 10,
  },
  {
    id: 'demo-broker-funding-2',
    sender: 'HNB Alerts',
    body:
      'Fund Transfer Debit (FTSTOCKS_SOFTLOGIC STOCKBROKERS PVT LIMITED_177872) of LKR 100,000.00 was performed on your account no 001XXXXXX655. Account Balance - Rs. 19,630.04',
    daysAgo: 6,
  },
  {
    id: 'demo-broker-funding-3',
    sender: 'DF savings',
    body:
      'Payment of Rs. 25,000.00 to Softlogic Stockbrokers was completed successfully from your DF savings account. Ref 778821',
    daysAgo: 3,
  },
];

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

function mapBrokerFundingRow(row: BrokerFundingLogRow): BrokerFundingSmsLog {
  return {
    id: row.id,
    providerSmsId: row.provider_sms_id,
    sender: row.sender,
    body: row.body,
    bodyHash: row.body_hash,
    receivedAt: row.received_at,
    parsedAt: row.parsed_at,
    parseStatus: row.parse_status,
    parseReason: row.parse_reason,
    confidence: Number(row.confidence ?? 0),
    amountCents:
      row.amount_cents === null || row.amount_cents === undefined
        ? null
        : Number(row.amount_cents),
  };
}

function sanitizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '');
}

function parseMetaJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value).trim()).filter(Boolean);
  } catch {
    return raw
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
}

async function resetBrokerFundingSyncCursor(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM stock_meta WHERE key = ?', [
    'brokerFundingLastSyncAt',
  ]);
}

async function resetTradeSmsSyncCursor(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM stock_meta WHERE key = ?', ['lastSyncAt']);
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

  async listBrokerFundingLogs(opts?: {
    status?: BrokerFundingSmsLog['parseStatus'];
    limit?: number;
  }): Promise<BrokerFundingSmsLog[]> {
    const db = await getDatabase();
    const where = opts?.status ? 'WHERE parse_status = ?' : '';
    const limit = opts?.limit ? 'LIMIT ?' : '';
    const params: Array<string | number> = [];
    if (opts?.status) params.push(opts.status);
    if (opts?.limit) params.push(opts.limit);

    const rows = await db.getAllAsync<BrokerFundingLogRow>(
      `SELECT * FROM broker_funding_sms_log ${where} ORDER BY received_at DESC ${limit}`,
      params,
    );
    return rows.map(mapBrokerFundingRow);
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

  async getBrokerFundingSenderIds(): Promise<string[]> {
    return parseMetaJsonArray(await this.getMeta('brokerFundingSenderIds'));
  },

  async setBrokerFundingSenderIds(senderIds: string[]): Promise<void> {
    const normalized = [...new Set(senderIds.map((senderId) => senderId.trim()).filter(Boolean))];
    await this.setMeta('brokerFundingSenderIds', JSON.stringify(normalized));
    await resetBrokerFundingSyncCursor();
  },

  async getBrokerFundingKeywords(): Promise<string[]> {
    return parseMetaJsonArray(await this.getMeta('brokerFundingKeywords'));
  },

  async setBrokerFundingKeywords(keywords: string[]): Promise<void> {
    const normalized = [...new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean))];
    await this.setMeta('brokerFundingKeywords', JSON.stringify(normalized));
    await resetBrokerFundingSyncCursor();
  },

  async getBrokerFundingSummary(): Promise<BrokerFundingSummary> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      total_invested_cents: number | null;
      matched_count: number | null;
      unmatched_count: number | null;
      ignored_count: number | null;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN parse_status = 'matched' THEN amount_cents ELSE 0 END), 0) AS total_invested_cents,
        SUM(CASE WHEN parse_status = 'matched' THEN 1 ELSE 0 END) AS matched_count,
        SUM(CASE WHEN parse_status = 'unmatched' THEN 1 ELSE 0 END) AS unmatched_count,
        SUM(CASE WHEN parse_status = 'ignored' THEN 1 ELSE 0 END) AS ignored_count
      FROM broker_funding_sms_log
    `);

    return {
      totalInvestedCents: Number(row?.total_invested_cents ?? 0),
      matchedCount: Number(row?.matched_count ?? 0),
      unmatchedCount: Number(row?.unmatched_count ?? 0),
      ignoredCount: Number(row?.ignored_count ?? 0),
    };
  },

  async confirmBrokerFundingSms(id: string, amountCents?: number | null): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<BrokerFundingLogRow>(
      'SELECT * FROM broker_funding_sms_log WHERE id = ?',
      [id],
    );
    if (!existing) return;

    const nextAmount =
      amountCents ?? (existing.amount_cents === undefined ? null : existing.amount_cents);
    if (nextAmount == null || nextAmount <= 0) {
      throw new Error('Cannot confirm broker funding without a valid amount.');
    }

    await db.runAsync(
      `UPDATE broker_funding_sms_log
       SET parse_status = 'matched', amount_cents = ?, parse_reason = ?, parsed_at = ?, confidence = MAX(confidence, 80)
       WHERE id = ?`,
      [nextAmount, 'Manually confirmed', new Date().toISOString(), id],
    );
  },

  async ignoreBrokerFundingSms(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE broker_funding_sms_log
       SET parse_status = 'ignored', parse_reason = ?, parsed_at = ?
       WHERE id = ?`,
      ['Ignored by user', new Date().toISOString(), id],
    );
  },

  async reparseBrokerFundingSms(id: string): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<BrokerFundingLogRow>(
      'SELECT * FROM broker_funding_sms_log WHERE id = ?',
      [id],
    );
    if (!existing) return;

    const keywords = await this.getBrokerFundingKeywords();
    const parsed = parseBrokerFundingSms(existing.body, { keywords });
    await db.runAsync(
      `UPDATE broker_funding_sms_log
       SET parse_status = ?, parse_reason = ?, confidence = ?, amount_cents = ?, parsed_at = ?
       WHERE id = ?`,
      [
        parsed.matched ? 'matched' : 'unmatched',
        parsed.reason,
        parsed.confidence,
        parsed.amountCents,
        new Date().toISOString(),
        id,
      ],
    );
  },

  async reparseAllBrokerFundingSms(): Promise<void> {
    const logs = await this.listBrokerFundingLogs();
    for (const log of logs) {
      if (log.parseStatus === 'ignored') continue;
      await this.reparseBrokerFundingSms(log.id);
    }
  },

  async clearTradeSmsLogs(): Promise<void> {
    await withTransaction(async () => {
      const db = await getDatabase();
      await db.execAsync('DELETE FROM stock_movements');
      await db.execAsync('DELETE FROM stock_sms_log');
    });
    await resetTradeSmsSyncCursor();
  },

  async clearTradeSmsAndResync(): Promise<{
    status: 'ok' | 'permission_denied' | 'unsupported';
    permissionStatus: SmsPermissionStatus;
    newSms: number;
    newMovements: number;
    failed: number;
    unsupportedReason?: 'expo_go';
  }> {
    await this.clearTradeSmsLogs();
    return this.ingestSms();
  },

  async clearBrokerFundingSmsLogs(): Promise<void> {
    await withTransaction(async () => {
      const db = await getDatabase();
      await db.execAsync('DELETE FROM broker_funding_sms_log');
    });
    await resetBrokerFundingSyncCursor();
  },

  async clearBrokerFundingSmsAndResync(): Promise<BrokerFundingSyncResult> {
    await this.clearBrokerFundingSmsLogs();
    return this.syncBrokerFundingSms();
  },

  async syncBrokerFundingSms(): Promise<BrokerFundingSyncResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'unsupported',
        permissionStatus: 'unsupported',
        scanned: 0,
        matched: 0,
        unmatched: 0,
      };
    }

    if (Constants.executionEnvironment === 'storeClient') {
      return {
        status: 'unsupported',
        permissionStatus: 'unsupported',
        scanned: 0,
        matched: 0,
        unmatched: 0,
        unsupportedReason: 'expo_go',
      };
    }

    const permissionStatus = await requestSmsPermission();
    if (permissionStatus !== 'granted') {
      return {
        status: 'permission_denied',
        permissionStatus,
        scanned: 0,
        matched: 0,
        unmatched: 0,
      };
    }

    const senderIds = await this.getBrokerFundingSenderIds();
    if (senderIds.length === 0) {
      return {
        status: 'no_senders',
        permissionStatus,
        scanned: 0,
        matched: 0,
        unmatched: 0,
      };
    }

    const keywords = await this.getBrokerFundingKeywords();
    const lastSyncAtRaw = await this.getMeta('brokerFundingLastSyncAt');
    const firstSyncWindowDays = Number(
      (await this.getMeta('firstSyncWindowDays')) ??
        String(STOCK_FIRST_SYNC_WINDOW_DAYS),
    );
    const now = Date.now();
    const minDateMs = lastSyncAtRaw
      ? Number(lastSyncAtRaw)
      : now - Math.max(firstSyncWindowDays, 1) * 24 * 60 * 60 * 1000;

    const smsRows = await readSmsFromSenders({
      senderIds,
      minDateMs: Number.isFinite(minDateMs) ? minDateMs : 0,
    });

    let scanned = 0;
    let matched = 0;
    let unmatched = 0;

    await withTransaction(async () => {
      const db = await getDatabase();
      for (const sms of smsRows) {
        const bodyHash = await computeSmsDedupeHash({
          body: sms.body,
          sender: sms.sender,
          receivedAt: sms.receivedAt,
          providerSmsId: sms.providerSmsId,
        });

        const existing = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM broker_funding_sms_log WHERE body_hash = ?',
          [bodyHash],
        );
        if (existing) continue;

        scanned += 1;
        const parsedAt = new Date().toISOString();
        const parsed = parseBrokerFundingSms(sms.body, { keywords });

        await db.runAsync(
          `INSERT INTO broker_funding_sms_log (
             id, provider_sms_id, sender, body, body_hash, received_at, parsed_at, parse_status, parse_reason, confidence, amount_cents
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId(),
            sms.providerSmsId,
            sms.sender,
            sms.body,
            bodyHash,
            sms.receivedAt,
            parsedAt,
            parsed.matched ? 'matched' : 'unmatched',
            parsed.reason,
            parsed.confidence,
            parsed.amountCents,
          ],
        );

        if (parsed.matched) {
          matched += 1;
        } else {
          unmatched += 1;
        }
      }
    });

    await this.setMeta('brokerFundingLastSyncAt', String(now));
    return {
      status: 'ok',
      permissionStatus,
      scanned,
      matched,
      unmatched,
    };
  },

  async importDemoBrokerFundingSms(): Promise<{
    inserted: number;
    matched: number;
    unmatched: number;
  }> {
    const nowMs = Date.now();
    const existingKeywords = await this.getBrokerFundingKeywords();
    const existingSenders = await this.getBrokerFundingSenderIds();
    if (existingKeywords.length === 0) {
      await this.setBrokerFundingKeywords(DEMO_BROKER_FUNDING_KEYWORDS);
    }
    if (existingSenders.length === 0) {
      await this.setBrokerFundingSenderIds(DEMO_BROKER_FUNDING_SENDERS);
    }

    const keywords =
      existingKeywords.length > 0
        ? existingKeywords
        : DEMO_BROKER_FUNDING_KEYWORDS;
    let inserted = 0;
    let matched = 0;
    let unmatched = 0;

    await withTransaction(async () => {
      const db = await getDatabase();
      for (const sample of DEMO_BROKER_FUNDING_MESSAGES) {
        const receivedAt = nowMs - sample.daysAgo * 24 * 60 * 60 * 1000;
        const providerSmsId = `demo:${sample.id}`;
        const bodyHash = await computeSmsDedupeHash({
          body: sample.body,
          sender: sample.sender,
          receivedAt,
          providerSmsId,
        });

        const existing = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM broker_funding_sms_log WHERE body_hash = ?',
          [bodyHash],
        );
        if (existing) continue;

        const parsedAt = new Date().toISOString();
        const parsed = parseBrokerFundingSms(sample.body, { keywords });
        await db.runAsync(
          `INSERT INTO broker_funding_sms_log (
             id, provider_sms_id, sender, body, body_hash, received_at, parsed_at, parse_status, parse_reason, confidence, amount_cents
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sample.id,
            providerSmsId,
            sample.sender,
            sample.body,
            bodyHash,
            receivedAt,
            parsedAt,
            parsed.matched ? 'matched' : 'unmatched',
            `${parsed.reason} | demo sample`,
            parsed.confidence,
            parsed.amountCents,
          ],
        );
        inserted += 1;
        if (parsed.matched) {
          matched += 1;
        } else {
          unmatched += 1;
        }
      }
    });

    return { inserted, matched, unmatched };
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
        const bodyHash = await computeSmsDedupeHash({
          body: sms.body,
          sender: sms.sender,
          receivedAt: sms.receivedAt,
          providerSmsId: sms.providerSmsId,
        });

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

