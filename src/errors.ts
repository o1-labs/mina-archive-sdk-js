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
  /**
   * The response's `data` field, when the server sent one alongside the
   * errors.
   *
   * HTTP 200 carrying both is a normal GraphQL outcome: the root lists and
   * most of their fields are nullable, so a field-level resolver error
   * nullifies a sub-tree rather than the whole response, and the rows that
   * succeeded still arrive. `undefined` or `null` means the server sent no
   * usable data, which is a total failure rather than a partial one.
   */
  constructor(
    public queryName: string,
    public errors: GraphqlErrorEntry[],
    public data?: unknown,
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

  /** Whether the server returned usable data alongside the errors. */
  get hasPartialData(): boolean {
    return this.data !== undefined && this.data !== null;
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
    /**
     * Error entries from the response body, when it was GraphQL-shaped. The
     * rate limiter answers before GraphQL runs, so a 429 body carries
     * `extensions.code === 'RATE_LIMITED'` here.
     */
    public errors: GraphqlErrorEntry[] = [],
    /** From the `retry-after` header, in seconds. */
    public retryAfterSeconds?: number,
    /** From `x-ratelimit-limit`. */
    public limit?: number,
    /** From `x-ratelimit-remaining`. */
    public remaining?: number,
    /** The raw body, truncated, for statuses that are not GraphQL-shaped. */
    public body?: string,
  ) {
    super(`HTTP ${status} ${statusText} in ${queryName}`);
  }

  /**
   * Whether this status is worth retrying: 5xx, 408 and 429 yes, every other
   * 4xx no. A 4xx other than 429 is a defect in the request, so retrying it
   * only wastes the budget before reporting a fault that was obvious on the
   * first attempt.
   */
  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }

  /** Whether the server rate-limited this request. */
  get isRateLimited(): boolean {
    return this.status === 429;
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
