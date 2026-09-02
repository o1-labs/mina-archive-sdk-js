/**
 * `@o1-labs/mina-archive-sdk` — TypeScript SDK for the Mina Archive Node
 * GraphQL endpoint.
 *
 * @example
 * ```ts
 * import { ArchiveClient } from '@o1-labs/mina-archive-sdk';
 *
 * const client = new ArchiveClient('https://archive.example/graphql');
 * const events = await client.getEvents({
 *   address: 'B62q...',
 *   status: 'CANONICAL',
 *   from: 100,
 *   to: 200,
 * });
 * ```
 */

export { ArchiveClient } from './client.js';
export type { ClientConfig } from './client.js';

export { Currency } from './currency.js';

export {
  ConnectionError,
  CurrencyUnderflowError,
  GraphqlError,
  HttpError,
  InvalidCurrencyError,
  MissingFieldError,
} from './errors.js';
export type { GraphqlErrorEntry } from './errors.js';

export {
  ACTIONS_QUERY,
  BLOCKS_QUERY,
  EVENTS_QUERY,
  NETWORK_STATE_QUERY,
  VERIFICATION_KEY_UPDATES_QUERY,
} from './queries.js';

export type {
  ActionData,
  ActionFilterOptionsInput,
  ActionOutput,
  ActionStates,
  Block,
  BlockInfo,
  BlockQueryInput,
  BlockSortByInput,
  BlockStatusFilter,
  BlockTransactions,
  EventData,
  EventFilterOptionsInput,
  EventOutput,
  FeeTransfer,
  MaxBlockHeightInfo,
  NetworkStateOutput,
  TransactionInfo,
  UserCommand,
  VerificationKeyUpdate,
  VerificationKeyUpdateFilterInput,
  ZkAppCommand,
} from './types.js';
