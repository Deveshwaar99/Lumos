/**
 * Run with:
 * npx ts-node --compiler-options '{"module":"commonjs"}' src/services/__tests__/smsReader.test.ts
 */
import { mergeSmsMessages, smsDedupeKey, type RawSms } from '../smsMerge';

const base: RawSms = {
  providerSmsId: null,
  sender: 'DF savings',
  body: 'Payment to broker',
  receivedAt: 1000,
};

(function run() {
  const a: RawSms = { ...base, providerSmsId: '1', receivedAt: 2000 };
  const dup: RawSms = { ...base, providerSmsId: '1', receivedAt: 3000 };
  const b: RawSms = { ...base, providerSmsId: '2', receivedAt: 1000 };

  const merged = mergeSmsMessages([b, a, dup]);
  console.assert(merged.length === 2, 'merge by provider id');
  console.assert(merged[0].providerSmsId === '2', 'sorted by receivedAt');
  console.assert(merged[1].providerSmsId === '1', 'sorted by receivedAt');
  console.assert(
    merged[1].receivedAt === 2000,
    'first provider occurrence kept',
  );

  const noProviderA: RawSms = {
    ...base,
    providerSmsId: null,
    receivedAt: 500,
    body: 'same body',
  };
  const noProviderB: RawSms = {
    ...base,
    providerSmsId: null,
    receivedAt: 500,
    body: 'same body',
  };
  const mergedFallback = mergeSmsMessages([noProviderA, noProviderB]);
  console.assert(
    mergedFallback.length === 1,
    'fallback key dedupes identical rows',
  );
  console.assert(
    smsDedupeKey(noProviderA) === smsDedupeKey(noProviderB),
    'fallback keys match',
  );

  console.log('smsReader.test.ts: all assertions passed');
})();
