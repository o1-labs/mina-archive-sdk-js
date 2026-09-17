/**
 * Currency value stored as nanomina (1 MINA = 10^9 nanomina) using bigint
 * for overflow safety. Mirrors mina-sdk-rust's `Currency` type.
 */

import { CurrencyUnderflowError, InvalidCurrencyError } from './errors.js';

const NANOMINA_PER_MINA = 1_000_000_000n;

export class Currency {
  readonly #nanomina: bigint;

  private constructor(nanomina: bigint) {
    this.#nanomina = nanomina;
  }

  static fromNanomina(nanomina: bigint | number): Currency {
    // BigInt() throws a raw RangeError on a non-integer number, which would
    // escape an API that documents typed errors.
    if (typeof nanomina === 'number' && !Number.isInteger(nanomina)) {
      throw new InvalidCurrencyError(`not an integer: ${nanomina}`);
    }
    const n = typeof nanomina === 'number' ? BigInt(nanomina) : nanomina;
    if (n < 0n) {
      throw new InvalidCurrencyError(n.toString());
    }
    return new Currency(n);
  }

  /**
   * Parse a decimal MINA string ("1.5", "100", "0.000000001") into nanomina.
   * Up to 9 decimal places. Negative values are rejected.
   */
  static fromMina(s: string): Currency {
    return new Currency(parseDecimal(s));
  }

  /** Parse a nanomina value as it appears in GraphQL responses (string of digits). */
  static fromGraphql(s: string): Currency {
    if (!/^\d+$/.test(s)) {
      throw new InvalidCurrencyError(s);
    }
    return new Currency(BigInt(s));
  }

  nanomina(): bigint {
    return this.#nanomina;
  }

  /** Value as a MINA decimal string with 9 fractional digits. */
  mina(): string {
    const whole = this.#nanomina / NANOMINA_PER_MINA;
    const frac = this.#nanomina % NANOMINA_PER_MINA;
    return `${whole}.${frac.toString().padStart(9, '0')}`;
  }

  /** Nanomina as a decimal string for GraphQL submission. */
  toNanominaStr(): string {
    return this.#nanomina.toString();
  }

  toString(): string {
    return this.mina();
  }

  equals(other: Currency): boolean {
    return this.#nanomina === other.#nanomina;
  }

  add(other: Currency): Currency {
    return new Currency(this.#nanomina + other.#nanomina);
  }

  /** Throws CurrencyUnderflowError if result would be negative. */
  sub(other: Currency): Currency {
    if (this.#nanomina < other.#nanomina) {
      throw new CurrencyUnderflowError(this.#nanomina, other.#nanomina);
    }
    return new Currency(this.#nanomina - other.#nanomina);
  }

  mul(scalar: bigint | number): Currency {
    // As in fromNanomina: a fractional scalar must not leak a RangeError.
    if (typeof scalar === 'number' && !Number.isInteger(scalar)) {
      throw new InvalidCurrencyError(`not an integer scalar: ${scalar}`);
    }
    const s = typeof scalar === 'number' ? BigInt(scalar) : scalar;
    if (s < 0n) {
      throw new InvalidCurrencyError(`negative scalar: ${s}`);
    }
    return new Currency(this.#nanomina * s);
  }

  compare(other: Currency): -1 | 0 | 1 {
    if (this.#nanomina < other.#nanomina) return -1;
    if (this.#nanomina > other.#nanomina) return 1;
    return 0;
  }
}

function parseDecimal(s: string): bigint {
  const trimmed = s.trim();
  if (trimmed.length === 0) {
    throw new InvalidCurrencyError(s);
  }
  if (trimmed.startsWith('-')) {
    throw new InvalidCurrencyError(s);
  }

  const dot = trimmed.indexOf('.');
  const wholeStr = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const fracStr = dot === -1 ? '' : trimmed.slice(dot + 1);

  // A bare "." has both halves empty, and each half is separately allowed to
  // be empty ("5." and ".5" are fine), so without this it parsed as zero.
  if (wholeStr === '' && fracStr === '') {
    throw new InvalidCurrencyError(s);
  }

  if (fracStr.length > 9) {
    throw new InvalidCurrencyError(`too many decimal places (max 9): ${s}`);
  }

  const whole = wholeStr === '' ? 0n : safeBigInt(wholeStr, s);
  const fracPadded = fracStr.padEnd(9, '0');
  const frac = fracStr === '' ? 0n : safeBigInt(fracPadded, s);

  return whole * NANOMINA_PER_MINA + frac;
}

function safeBigInt(s: string, original: string): bigint {
  if (!/^\d+$/.test(s)) {
    throw new InvalidCurrencyError(original);
  }
  return BigInt(s);
}
