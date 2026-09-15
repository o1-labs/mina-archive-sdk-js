import test from 'node:test';
import assert from 'node:assert/strict';

import {
  blockTimestampToDate,
  toBlockDateTimeFilter,
} from '../src/time.js';

// The whole point of the helper: the obvious call is silently wrong (#14).
test('the naive new Date(timestamp) really is Invalid Date', () => {
  assert.ok(Number.isNaN(new Date('1692054601000').getTime()));
});

test('blockTimestampToDate parses Unix epoch milliseconds', () => {
  assert.equal(
    blockTimestampToDate('1692054601000').toISOString(),
    '2023-08-14T23:10:01.000Z',
  );
  assert.equal(
    blockTimestampToDate('0').toISOString(),
    '1970-01-01T00:00:00.000Z',
  );
});

test('blockTimestampToDate throws rather than yielding NaN', () => {
  assert.throws(() => blockTimestampToDate('2023-08-14T23:10:01Z'), RangeError);
  assert.throws(() => blockTimestampToDate('not a number'), RangeError);
  // Number('') and Number('  ') are both 0, so these would otherwise come back
  // as the epoch rather than as an error.
  assert.throws(() => blockTimestampToDate(''), RangeError);
  assert.throws(() => blockTimestampToDate('   '), RangeError);
  assert.throws(() => blockTimestampToDate('1692054601000.5'), RangeError);
  // Beyond Number.MAX_SAFE_INTEGER the value is no longer exact.
  assert.throws(() => blockTimestampToDate('99999999999999999'), RangeError);
});

// The server does `new Date(value).getTime()`; anything that lands on NaN
// silently matches nothing. Assert the emitted string survives that.
test('toBlockDateTimeFilter emits a string the server parses to a finite number', () => {
  const filter = toBlockDateTimeFilter(new Date(1691971200000));
  assert.equal(filter, '2023-08-14T00:00:00.000Z');
  assert.ok(Number.isFinite(new Date(filter).getTime()));
  assert.equal(new Date(filter).getTime(), 1691971200000);
});

test('toBlockDateTimeFilter rejects an Invalid Date', () => {
  assert.throws(() => toBlockDateTimeFilter(new Date('nope')), RangeError);
});

// The failure modes the issue documents, pinned so the docs cannot drift from
// what the server actually does.
test('documents which date strings the server silently drops', () => {
  assert.equal(new Date('2023-08-14T00:00:00Z').getTime(), 1691971200000);
  assert.equal(new Date('2023-08-14').getTime(), 1691971200000);
  assert.ok(Number.isNaN(new Date('14/08/2023').getTime()));
});
