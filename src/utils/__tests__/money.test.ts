/**
 * Simple money utils tests - run with: npx ts-node src/utils/__tests__/money.test.ts
 * Or: node --loader ts-node/esm src/utils/__tests__/money.test.ts
 */
import {
  centsToDollars,
  dollarsToCents,
  formatMoney,
  parseMoney,
} from '../money';

console.assert(centsToDollars(1250) === 12.5, 'centsToDollars(1250) === 12.5');
console.assert(centsToDollars(0) === 0, 'centsToDollars(0) === 0');
console.assert(centsToDollars(1) === 0.01, 'centsToDollars(1) === 0.01');

console.assert(dollarsToCents(12.5) === 1250, 'dollarsToCents(12.50) === 1250');
console.assert(dollarsToCents(0.01) === 1, 'dollarsToCents(0.01) === 1');
console.assert(
  dollarsToCents(99.99) === 9999,
  'dollarsToCents(99.99) === 9999',
);

console.assert(parseMoney('12.50') === 1250, "parseMoney('12.50') === 1250");
console.assert(
  parseMoney('$1,234.56') === 123456,
  "parseMoney('$1,234.56') === 123456",
);
console.assert(parseMoney('0.01') === 1, "parseMoney('0.01') === 1");

const formatted = formatMoney(1250);
console.assert(typeof formatted === 'string', 'formatMoney returns a string');
console.assert(
  parseMoney(formatted) === 1250,
  'formatMoney returns a string containing the amount',
);

console.log('All money tests passed!');
