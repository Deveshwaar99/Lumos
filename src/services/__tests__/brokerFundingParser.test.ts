/**
 * Run with:
 * npx ts-node src/services/__tests__/brokerFundingParser.test.ts
 */
import { parseBrokerFundingSms } from '../brokerFundingParser';

const BROKER_KEYWORDS = ['SOFTLOGIC STOCKBROKERS'];

const airtelPayment =
  'Your payment of Rs.133.00 to Airtel from DF savings has been made successfully. (ref 176580372448650)';
const softlogicPayment =
  'Your payment of Rs.60000.00 to SOFTLOGIC STOCKBROKERS PVT LIMITED from DF savings has been made successfully. (ref 176880018106329)';
const softlogicPaymentNoSpaceAfterRs =
  'Your payment of Rs.130000.00 to SOFTLOGIC STOCKBROKERS PVT LIMITED from DF savings has been made successfully. (ref 177700350391894';
const fundTransferDebitLkr =
  'Fund Transfer Debit (FTSTOCKS_SOFTLOGIC STOCKBROKERS PVT LIMITED_177872) of LKR 100,000.00 was performed on your account no 001XXXXXX655. Account Balance - Rs. 19,630.04';
const tradingAccountTransfer =
  'Your transfer of Rs.3000.00 to your trading account was successful.';
const otpMessage =
  'Your OTP for transaction is 123456. Do not share with anyone.';

const airtelParsed = parseBrokerFundingSms(airtelPayment, {
  keywords: BROKER_KEYWORDS,
});
console.assert(!airtelParsed.matched, 'Airtel bill pay should not match broker funding');

const softlogicParsed = parseBrokerFundingSms(softlogicPayment, {
  keywords: BROKER_KEYWORDS,
});
console.assert(softlogicParsed.matched, 'SOFTLOGIC payment should match');
console.assert(
  softlogicParsed.amountCents === 6_000_000,
  'SOFTLOGIC amount should parse to 6000000 cents',
);

const softlogicPaymentCompactRs = parseBrokerFundingSms(
  softlogicPaymentNoSpaceAfterRs,
  { keywords: BROKER_KEYWORDS },
);
console.assert(
  softlogicPaymentCompactRs.matched,
  'SOFTLOGIC payment (Rs.130000.00) should match',
);
console.assert(
  softlogicPaymentCompactRs.amountCents === 13_000_000,
  'SOFTLOGIC payment (Rs.130000.00) amount should be 13000000 cents',
);

const fundTransferParsed = parseBrokerFundingSms(fundTransferDebitLkr, {
  keywords: BROKER_KEYWORDS,
});
console.assert(
  fundTransferParsed.matched,
  'Fund transfer debit (LKR 100,000.00) should match',
);
console.assert(
  fundTransferParsed.amountCents === 10_000_000,
  'Fund transfer debit amount should be 10000000 cents',
);

const tradingParsed = parseBrokerFundingSms(tradingAccountTransfer, {
  keywords: BROKER_KEYWORDS,
});
console.assert(tradingParsed.matched, 'Trading account transfer should match');
console.assert(
  tradingParsed.amountCents === 300_000,
  'Trading account amount should parse to 300000 cents',
);

const otpParsed = parseBrokerFundingSms(otpMessage, { keywords: BROKER_KEYWORDS });
console.assert(!otpParsed.matched, 'OTP message should not match');

console.log('brokerFundingParser tests passed');
