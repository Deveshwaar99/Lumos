export interface RawSms {
  providerSmsId: string | null;
  sender: string;
  body: string;
  receivedAt: number;
}

/** Dedupe key for merged inbox rows (provider id preferred). */
export function smsDedupeKey(message: RawSms): string {
  const providerId = message.providerSmsId?.trim();
  if (providerId) return `provider:${providerId}`;
  return [
    message.sender.trim().toLowerCase(),
    String(message.receivedAt),
    message.body.replace(/\s+/g, ' ').trim(),
  ].join('|');
}

/** Merge SMS from multiple native reads; first occurrence wins, sorted by receivedAt. */
export function mergeSmsMessages(rows: RawSms[]): RawSms[] {
  const seen = new Map<string, RawSms>();
  for (const row of rows) {
    const key = smsDedupeKey(row);
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return [...seen.values()].sort((a, b) => a.receivedAt - b.receivedAt);
}
