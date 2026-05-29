import * as Crypto from 'expo-crypto';

export type SmsDedupeInput = {
  body: string;
  sender: string;
  receivedAt: number;
  providerSmsId?: string | null;
};

/** Stable key so the same inbox row is not imported twice. */
export async function computeSmsDedupeHash(
  input: SmsDedupeInput,
): Promise<string> {
  if (input.providerSmsId?.trim()) {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `provider:${input.providerSmsId.trim()}`,
    );
  }

  const payload = [
    input.sender.trim().toLowerCase(),
    String(input.receivedAt),
    input.body.replace(/\s+/g, ' ').trim(),
  ].join('|');

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
}
