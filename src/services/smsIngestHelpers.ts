import type { SQLiteDatabase } from 'expo-sqlite';
import { SMS_INGEST_CHUNK_SIZE } from '../constants/stockSync';
import { computeSmsDedupeHash } from '../utils/smsDedupeHash';
import type { RawSms } from './smsMerge';

export type { RawSms } from './smsMerge';
export { mergeSmsMessages, smsDedupeKey } from './smsMerge';

export type PreparedSms = RawSms & { bodyHash: string };

export type SmsLogTable = 'stock_sms_log' | 'broker_funding_sms_log';

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function prepareSmsBatch(rows: RawSms[]): Promise<PreparedSms[]> {
  return Promise.all(
    rows.map(async (sms) => ({
      ...sms,
      bodyHash: await computeSmsDedupeHash({
        body: sms.body,
        sender: sms.sender,
        receivedAt: sms.receivedAt,
        providerSmsId: sms.providerSmsId,
      }),
    })),
  );
}

export async function findExistingBodyHashes(
  db: SQLiteDatabase,
  table: SmsLogTable,
  hashes: string[],
): Promise<Set<string>> {
  if (hashes.length === 0) return new Set();

  const placeholders = hashes.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ body_hash: string }>(
    `SELECT body_hash FROM ${table} WHERE body_hash IN (${placeholders})`,
    hashes,
  );
  return new Set(rows.map((row) => row.body_hash));
}

export function ingestChunks<T>(items: T[]): T[][] {
  return chunkArray(items, SMS_INGEST_CHUNK_SIZE);
}

export async function runInParallelBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => fn(item)));
  }
}
