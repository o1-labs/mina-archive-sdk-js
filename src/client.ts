/**
 * `ArchiveClient` — typed wrapper around a Mina Archive Node GraphQL endpoint.
 *
 * Translates the mina-sdk-rust `MinaClient` design to TypeScript: configurable
 * retry/timeout, typed query methods, low-level `query()` builder for arbitrary
 * GraphQL through the same retry path.
 */

import {
  ConnectionError,
  GraphqlError,
  GraphqlErrorEntry,
  HttpError,
  MissingFieldError,
} from './errors.js';
import {
  ACTIONS_QUERY,
  BLOCKS_QUERY,
  EVENTS_QUERY,
  NETWORK_STATE_QUERY,
  VERIFICATION_KEY_UPDATES_QUERY,
} from './queries.js';
import type {
  ActionFilterOptionsInput,
  ActionOutput,
  Block,
  BlockQueryInput,
  BlockSortByInput,
  EventFilterOptionsInput,
  EventOutput,
  NetworkStateOutput,
  VerificationKeyUpdate,
  VerificationKeyUpdateFilterInput,
} from './types.js';

export interface ClientConfig {
  /** Archive Node GraphQL endpoint URL. */
  graphqlUri: string;
  /** Number of attempts (including the initial try). Must be >= 1. */
  retries: number;
  /** Milliseconds to wait between retries. */
  retryDelayMs: number;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
  /** Optional headers to attach to every request (e.g. auth). */
  headers?: Record<string, string>;
  /** Optional fetch override — defaults to the global fetch. Useful for tests. */
  fetch?: typeof fetch;
}

const DEFAULT_CONFIG: Omit<ClientConfig, 'graphqlUri'> = {
  retries: 3,
  retryDelayMs: 5_000,
  timeoutMs: 30_000,
};

export interface QueryBuilderOptions {
  variables?: Record<string, unknown>;
  /** Tag used in error messages and debug logs only. */
  name?: string;
}

export class ArchiveClient {
  readonly #config: ClientConfig;
  readonly #fetch: typeof fetch;

  constructor(graphqlUri: string, overrides: Partial<ClientConfig> = {}) {
    const cfg: ClientConfig = {
      ...DEFAULT_CONFIG,
      graphqlUri,
      ...overrides,
    };
    if (cfg.retries < 1) {
      throw new Error('retries must be at least 1');
    }
    if (cfg.timeoutMs <= 0) {
      throw new Error('timeoutMs must be greater than zero');
    }
    this.#config = cfg;
    this.#fetch = cfg.fetch ?? fetch;
  }

  /** GraphQL endpoint URI. */
  get graphqlUri(): string {
    return this.#config.graphqlUri;
  }

  /**
   * Execute an arbitrary GraphQL query through the client's retry path and
   * return the response's `data` field. Prefer the typed methods below for
   * known queries.
   */
  async executeQuery<T = unknown>(
    query: string,
    variables: Record<string, unknown> | undefined,
    queryName: string,
  ): Promise<T> {
    const payload: Record<string, unknown> = { query };
    if (variables !== undefined) {
      payload.variables = variables;
    }

    let lastError: unknown = undefined;

    for (let attempt = 1; attempt <= this.#config.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.#config.timeoutMs,
      );

      try {
        const resp = await this.#fetch(this.#config.graphqlUri, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...this.#config.headers,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!resp.ok) {
          lastError = new HttpError(queryName, resp.status, resp.statusText);
          if (attempt < this.#config.retries) {
            await sleep(this.#config.retryDelayMs);
          }
          continue;
        }

        const body = (await resp.json()) as {
          data?: T;
          errors?: GraphqlErrorEntry[];
        };

        if (body.errors && body.errors.length > 0) {
          throw new GraphqlError(queryName, body.errors);
        }

        // GraphQL spec: response always has `data` on success, possibly null.
        return (body.data ?? ({} as T)) as T;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof GraphqlError) {
          // Don't retry on GraphQL-level errors — they're deterministic.
          throw err;
        }
        lastError = err;
        if (attempt < this.#config.retries) {
          await sleep(this.#config.retryDelayMs);
        }
      }
    }

    throw new ConnectionError(queryName, this.#config.retries, lastError);
  }

  /** Builder for arbitrary GraphQL queries with named variables. */
  query(query: string): {
    variables(vars: Record<string, unknown>): /* this */ ReturnType<
      ArchiveClient['query']
    >;
    name(name: string): ReturnType<ArchiveClient['query']>;
    send<T = unknown>(): Promise<T>;
  } {
    let variables: Record<string, unknown> | undefined;
    let name = 'custom';
    const builder = {
      variables: (vars: Record<string, unknown>) => {
        variables = vars;
        return builder;
      },
      name: (n: string) => {
        name = n;
        return builder;
      },
      send: <T = unknown>() => this.executeQuery<T>(query, variables, name),
    };
    return builder;
  }

  // -- Typed queries --

  /** Query archived events for an address (zkApp account). */
  async getEvents(input: EventFilterOptionsInput): Promise<EventOutput[]> {
    const data = await this.executeQuery<{ events?: EventOutput[] | null }>(
      EVENTS_QUERY,
      { input },
      'getEvents',
    );
    if (!data.events) {
      throw new MissingFieldError('getEvents', 'events');
    }
    return data.events;
  }

  /** Query archived actions for an address (zkApp account). */
  async getActions(input: ActionFilterOptionsInput): Promise<ActionOutput[]> {
    const data = await this.executeQuery<{ actions?: ActionOutput[] | null }>(
      ACTIONS_QUERY,
      { input },
      'getActions',
    );
    if (!data.actions) {
      throw new MissingFieldError('getActions', 'actions');
    }
    return data.actions;
  }

  /** Get the archive node's current sync state (max canonical / pending block). */
  async getNetworkState(): Promise<NetworkStateOutput> {
    const data = await this.executeQuery<{
      networkState?: NetworkStateOutput | null;
    }>(NETWORK_STATE_QUERY, undefined, 'getNetworkState');
    if (!data.networkState) {
      throw new MissingFieldError('getNetworkState', 'networkState');
    }
    return data.networkState;
  }

  /** Query blocks by height range, date range, or canonical/best-chain status. */
  async getBlocks(opts: {
    query?: BlockQueryInput;
    limit?: number;
    sortBy?: BlockSortByInput;
  } = {}): Promise<Block[]> {
    const data = await this.executeQuery<{ blocks?: Block[] | null }>(
      BLOCKS_QUERY,
      {
        query: opts.query ?? null,
        limit: opts.limit ?? null,
        sortBy: opts.sortBy ?? null,
      },
      'getBlocks',
    );
    if (!data.blocks) {
      throw new MissingFieldError('getBlocks', 'blocks');
    }
    return data.blocks;
  }

  /**
   * Find applied account updates that set a given verification key.
   *
   * The block range is required and the server caps its width, so walk a wide
   * history in pages rather than in one call.
   */
  async getVerificationKeyUpdates(
    input: VerificationKeyUpdateFilterInput,
  ): Promise<VerificationKeyUpdate[]> {
    const data = await this.executeQuery<{
      verificationKeyUpdates?: VerificationKeyUpdate[] | null;
    }>(VERIFICATION_KEY_UPDATES_QUERY, { input }, 'getVerificationKeyUpdates');
    if (!data.verificationKeyUpdates) {
      throw new MissingFieldError(
        'getVerificationKeyUpdates',
        'verificationKeyUpdates',
      );
    }
    return data.verificationKeyUpdates;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
