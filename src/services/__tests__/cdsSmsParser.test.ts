/**
 * Run with:
 * npx ts-node src/services/__tests__/cdsSmsParser.test.ts
 */
import { parseCdsAlert } from '../cdsSmsParser';

const sample1 =
  'ARR XXXXXXX27 LI 0 24-APR-26 PURCHASES JKH 3000 NTB 235 SALES 0';
const sample2 =
  'ARR XXXXXXX27 LI 0 27-APR-26 PURCHASES NTB 20 ALUM 2250 SALES 0';
const sample3 =
  'ARR XXXXXXX27 LI 0 29-APR-26 PURCHASES JKH 210 ALUM 60 SALES 0';
const sample4 =
  'ARR XXXXXXX27 LI 0 30-APR-26 PURCHASES COCR 4 JKH 25 VONE 6 SALES 0';

const parsed1 = parseCdsAlert(sample1);
console.assert(parsed1 !== null, 'sample1 should parse');
console.assert(
  parsed1?.tradeDate === '2026-04-24',
  'sample1 date should parse',
);
console.assert(parsed1?.movements.length === 2, 'sample1 should have two buys');
console.assert(
  parsed1?.movements[0].stockCode === 'JKH' &&
    parsed1.movements[0].quantity === 3000,
  'sample1 first movement JKH 3000 buy',
);

const parsed2 = parseCdsAlert(sample2);
console.assert(parsed2 !== null, 'sample2 should parse');
console.assert(parsed2?.movements.length === 2, 'sample2 should have two buys');
console.assert(
  parsed2?.movements[1].stockCode === 'ALUM' &&
    parsed2.movements[1].quantity === 2250,
  'sample2 second movement ALUM 2250 buy',
);

const parsed3 = parseCdsAlert(sample3);
console.assert(parsed3 !== null, 'sample3 should parse');
console.assert(parsed3?.movements.length === 2, 'sample3 should have two buys');

const parsed4 = parseCdsAlert(sample4);
console.assert(parsed4 !== null, 'sample4 should parse');
console.assert(
  parsed4?.movements.length === 3,
  'sample4 should have three buys',
);

const noPurchases =
  'ARR XXXXXXX27 LI 0 01-MAY-26 PURCHASES 0 SALES JKH 20 NTB 5';
const parsedNoPurchases = parseCdsAlert(noPurchases);
console.assert(parsedNoPurchases !== null, 'sales-only message should parse');
console.assert(
  parsedNoPurchases?.movements.length === 2 &&
    parsedNoPurchases.movements.every((m) => m.direction === 'sell'),
  'sales-only message should contain sell movements',
);

const multipleBuySell =
  'ARR XXXXXXX27 LI 0 02-MAY-26 PURCHASES AAA 10 BBB 20 SALES CCC 5 DDD 1';
const parsedMultiple = parseCdsAlert(multipleBuySell);
console.assert(parsedMultiple !== null, 'mixed buy/sell message should parse');
console.assert(
  parsedMultiple?.movements.length === 4,
  'mixed message should have 4 rows',
);
console.assert(
  parsedMultiple?.movements.filter((m) => m.direction === 'buy').length === 2,
  'mixed message should have two buys',
);
console.assert(
  parsedMultiple?.movements.filter((m) => m.direction === 'sell').length === 2,
  'mixed message should have two sells',
);

const invalid = parseCdsAlert('this is not a CDS alert');
console.assert(invalid === null, 'invalid message should return null');

console.log('All CDS SMS parser tests passed.');
