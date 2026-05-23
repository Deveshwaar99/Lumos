/**
 * Run with:
 * npx ts-node --compiler-options '{"module":"commonjs"}' src/utils/__tests__/smsDedupeHash.test.ts
 */
import { computeSmsDedupeHash } from '../smsDedupeHash';

const body =
  'Your transfer of Rs.3000.00 to your trading account was successful.';

(async () => {
  const dayOne = await computeSmsDedupeHash({
    body,
    sender: 'GENIE',
    receivedAt: new Date('2025-12-01T18:00:00').getTime(),
  });
  const dayTwo = await computeSmsDedupeHash({
    body,
    sender: 'GENIE',
    receivedAt: new Date('2025-12-02T18:00:00').getTime(),
  });
  console.assert(dayOne !== dayTwo, 'same body on different days should differ');

  const byProviderA = await computeSmsDedupeHash({
    body,
    sender: 'GENIE',
    receivedAt: 1,
    providerSmsId: '1001',
  });
  const byProviderB = await computeSmsDedupeHash({
    body,
    sender: 'GENIE',
    receivedAt: 1,
    providerSmsId: '1002',
  });
  console.assert(
    byProviderA !== byProviderB,
    'same body with different provider ids should differ',
  );

  console.log('smsDedupeHash tests passed');
})();
