/**
 * Typed errors emitted by `ArchiveClient`. Match on `.name` or `instanceof`
 * for fine-grained handling.
 */

/**
 * Contract error codes published by Archive-Node-API in `extensions.code`.
 *
 * These are the supported way to branch on a failure. Message text is
 * deliberately minimal — the server blocks GraphQL field suggestions — and
 * carries no stability promise, so do not match on it.
 */
export const ErrorCode = {
  /** Range exceeds `BLOCK_RANGE_SIZE`. Narrow it; retrying unchanged fails. */
  BlockRangeError: 'BLOCK_RANGE_ERROR',
  /** The action state is not in the archive. */
  ActionStateNotFound: 'ACTION_STATE_NOT_FOUND',
  /** The action state falls outside the requested block range. */
  ActionStateOutOfRange: 'ACTION_STATE_OUT_OF_RANGE',
  /** Too many requests. Back off; see `HttpError.retryAfterSeconds`. */
  RateLimited: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * One entry from a GraphQL response's `errors` array.
 *
 * Every field but `message` is optional, and `extensions` in particular must
 * stay optional: the server runs `maskedErrors` with `isDev: false`, so an
 * unexpected error arrives with a generic message and no `extensions` at all.
 *
 * Note `extensions.status` is a payload field, not the HTTP status — this API
 * answers every GraphQL-level error with HTTP 200.
 */
export interface GraphqlErrorEntry {
  message: string;
  extensions?: { code?: string; status?: number; [k: string]: unknown };
  path?: (string | number)[];
  locations?: { line: number; column: number }[];
}

export class GraphqlError extends Error {
  override name = 'GraphqlError';
  constructor(
    public queryName: string,
    public errors: GraphqlErrorEntry[],
  ) {
    super(
      `GraphQL error in ${queryName}: ${errors.map((e) => e.message).join('; ')}`,
    );
  }

  /**
   * The first `extensions.code` among the entries, or `undefined` when none
   * carries one — which means no code was sent, not that nothing went wrong.
   */
  get code(): string | undefined {
    for (const entry of this.errors) {
      if (entry.extensions?.code) return entry.extensions.code;
    }
    return undefined;
  }

  /** Every `extensions.code` among the entries, in order. */
  get codes(): string[] {
    return this.errors
      .map((e) => e.extensions?.code)
      .filter((c): c is string => typeof c === 'string');
  }

  /** Whether any entry carries the given `extensions.code`. */
  hasCode(code: string): boolean {
    return this.codes.includes(code);
  }
}

export class ConnectionError extends Error {
  override name = 'ConnectionError';
  constructor(
    public queryName: string,
    public attempts: number,
    public override cause: unknown,
  ) {
    super(
      `failed to execute ${queryName} after ${attempts} attempts: ${String(cause)}`,
    );
  }
}

export class HttpError extends Error {
  override name = 'HttpError';
  constructor(
    public queryName: string,
    public status: number,
    public statusText: string,
  ) {
    super(`HTTP ${status} ${statusText} in ${queryName}`);
  }
}

export class MissingFieldError extends Error {
  override name = 'MissingFieldError';
  constructor(
    public queryName: string,
    public field: string,
  ) {
    super(`missing field '${field}' in ${queryName} response`);
  }
}

export class InvalidCurrencyError extends Error {
  override name = 'InvalidCurrencyError';
  constructor(public input: string) {
    super(`invalid currency format: ${input}`);
  }
}

export class CurrencyUnderflowError extends Error {
  override name = 'CurrencyUnderflowError';
  constructor(
    public lhs: bigint,
    public rhs: bigint,
  ) {
    super(`currency underflow: ${lhs} - ${rhs} would be negative`);
  }
}
