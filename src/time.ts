/**
 * Helpers for the schema's two time encodings.
 *
 * `BlockInfo.timestamp` is Unix epoch milliseconds as a decimal string;
 * `Block.dateTime` is ISO-8601. They sit a few fields apart and both arrive as
 * strings, which is exactly why they get confused.
 */

/**
 * Convert a `BlockInfo.timestamp` — Unix epoch milliseconds as a decimal
 * string, e.g. `"1692054601000"` — to a `Date`.
 *
 * The obvious call, `new Date(blockInfo.timestamp)`, yields `Invalid Date`
 * because the string is not ISO-8601. That does not throw; it propagates as
 * `NaN` through any later arithmetic or formatting. This throws instead.
 *
 * @param timestamp Unix epoch milliseconds as a decimal string.
 * @throws {RangeError} if `timestamp` is not a decimal integer string.
 */
export function blockTimestampToDate(timestamp: string): Date {
  // Not `Number(timestamp)` alone: Number('') and Number('  ') are both 0, so
  // an empty field would silently become the epoch — the same class of quiet
  // wrong answer this helper exists to prevent.
  if (!/^-?\d+$/.test(timestamp)) {
    throw new RangeError(
      `BlockInfo.timestamp must be Unix epoch milliseconds as a decimal string, got ${JSON.stringify(timestamp)}`,
    );
  }
  const ms = Number(timestamp);
  if (!Number.isSafeInteger(ms)) {
    throw new RangeError(
      `BlockInfo.timestamp is out of the safe integer range: ${JSON.stringify(timestamp)}`,
    );
  }
  return new Date(ms);
}

/**
 * Format a `Date` for the `dateTime_gte` / `dateTime_lt` block filters.
 *
 * The server coerces those filters with `new Date(value).getTime()`. A value
 * it cannot parse becomes `NaN`, which reaches SQL as the literal string
 * `"NaN"` and matches nothing **without erroring** — HTTP 200, empty list, no
 * diagnostic. `"14/08/2023"` fails this way. Going through a `Date` makes that
 * unrepresentable.
 *
 * @throws {RangeError} if `date` is an `Invalid Date`.
 */
export function toBlockDateTimeFilter(date: Date): string {
  const ms = date.getTime();
  if (!Number.isFinite(ms)) {
    throw new RangeError('date must be a valid Date, got Invalid Date');
  }
  return date.toISOString();
}
