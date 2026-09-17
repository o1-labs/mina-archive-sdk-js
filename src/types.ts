/**
 * TypeScript types for the Mina Archive Node GraphQL schema.
 *
 * Mirrors `schema.graphql` in this repo — and that is enforced, not asserted.
 * `src/generated/schema-types.ts` is generated from the vendored SDL by
 * `npm run codegen` (CI fails on a diff), and
 * `src/generated/conformance.ts` asserts every type below is *exactly* equal
 * to its generated counterpart. A type that drifts from the schema does not
 * compile.
 *
 * These stay hand-written because they carry what a generator cannot produce:
 * the `timestamp` encoding warning, the `ENABLE_BLOCK_TRANSACTION_DETAILS`
 * notes, the element-nullability explanations.
 *
 * When the upstream schema changes: update `schema.graphql`, run
 * `npm run codegen`, then follow the conformance errors.
 */

/** Filter for the consensus status of a block. */
export type BlockStatusFilter = 'ALL' | 'PENDING' | 'CANONICAL';

/** Sort direction for block queries. */
export type BlockSortByInput = 'BLOCKHEIGHT_ASC' | 'BLOCKHEIGHT_DESC';

export interface EventFilterOptionsInput {
  address: string;
  tokenId?: string | null;
  status?: BlockStatusFilter | null;
  /** Mina block height to filter events to, exclusive. */
  to?: number | null;
  /** Mina block height to filter events from, inclusive. */
  from?: number | null;
}

export interface ActionFilterOptionsInput {
  address: string;
  tokenId?: string | null;
  status?: BlockStatusFilter | null;
  to?: number | null;
  from?: number | null;
  fromActionState?: string | null;
  endActionState?: string | null;
}

/**
 * Filter for `verificationKeyUpdates`.
 *
 * Unlike the event and action filters, the block range is required: the server
 * bounds the span by its configured `BLOCK_RANGE_SIZE`. `from` is inclusive and
 * `to` is exclusive.
 */
export interface VerificationKeyUpdateFilterInput {
  /** The verification-key hash to search for, as a field element string. */
  verificationKeyHash: string;
  /** Mina block height to search from, inclusive. */
  from: number;
  /** Mina block height to search to, exclusive. */
  to: number;
  status?: BlockStatusFilter | null;
}

export interface BlockQueryInput {
  blockHeight_gte?: number | null;
  blockHeight_lt?: number | null;
  /** ISO-8601 timestamp. */
  dateTime_gte?: string | null;
  /** ISO-8601 timestamp. */
  dateTime_lt?: string | null;
  canonical?: boolean | null;
  inBestChain?: boolean | null;
}

export interface TransactionInfo {
  status: string;
  hash: string;
  memo: string;
  authorizationKind: string;
  sequenceNumber: number;
  /**
   * Element-nullable in the SDL (`[Int]!`), so a member may be `null` even
   * though the list itself is always present.
   */
  zkappAccountUpdateIds: (number | null)[];
}

export interface EventData {
  accountUpdateId: string;
  transactionInfo: TransactionInfo | null;
  /**
   * Element-nullable in the SDL (`[String]!`), so a member may be `null` even
   * though the list itself is always present.
   */
  data: (string | null)[];
}

export interface ActionData {
  accountUpdateId: string;
  transactionInfo: TransactionInfo | null;
  /**
   * Element-nullable in the SDL (`[String]!`), so a member may be `null` even
   * though the list itself is always present.
   */
  data: (string | null)[];
}

export interface BlockInfo {
  height: number;
  stateHash: string;
  parentHash: string;
  ledgerHash: string;
  chainStatus: string;
  /**
   * Unix epoch milliseconds as a decimal string, e.g. `"1692054601000"`.
   *
   * NOT ISO-8601 — `new Date(timestamp)` gives `Invalid Date`, which then
   * propagates as `NaN` through date arithmetic instead of throwing. Parse
   * with `Number()` first, or use {@link blockTimestampToDate}.
   *
   * Contrast {@link Block.dateTime}, which IS ISO-8601.
   */
  timestamp: string;
  globalSlotSinceHardfork: number;
  globalSlotSinceGenesis: number;
  distanceFromMaxBlockHeight: number;
}

export interface ActionStates {
  actionStateOne: string | null;
  actionStateTwo: string | null;
  actionStateThree: string | null;
  actionStateFour: string | null;
  actionStateFive: string | null;
}

export interface EventOutput {
  blockInfo: BlockInfo | null;
  eventData: (EventData | null)[] | null;
}

export interface ActionOutput {
  blockInfo: BlockInfo | null;
  transactionInfo: TransactionInfo | null;
  actionData: (ActionData | null)[] | null;
  actionState: ActionStates;
}

/** An applied account update that set a verification key. */
export interface VerificationKeyUpdate {
  accountUpdateId: string;
  /** The account whose verification key was set. */
  address: string;
  tokenId: string;
  verificationKeyHash: string;
  blockInfo: BlockInfo;
  transactionInfo: TransactionInfo;
}

export interface MaxBlockHeightInfo {
  canonicalMaxBlockHeight: number;
  pendingMaxBlockHeight: number;
}

export interface NetworkStateOutput {
  maxBlockHeight: MaxBlockHeightInfo | null;
}

export interface UserCommand {
  hash: string;
  kind: string;
  from: string;
  to: string;
  /** Nanomina as a decimal string. */
  amount: string;
  /** Nanomina as a decimal string. */
  fee: string;
  memo: string;
  nonce: number;
  status: string;
  failureReason: string | null;
}

export interface ZkAppCommand {
  hash: string;
  feePayer: string;
  fee: string;
  memo: string;
  status: string;
  failureReason: string | null;
}

export interface FeeTransfer {
  recipient: string;
  fee: string;
  type: string;
}

/**
 * Transactions attached to a block.
 *
 * Only `coinbase` is populated by a stock server. The other three arrays
 * require the server to set `ENABLE_BLOCK_TRANSACTION_DETAILS=true`, which
 * **defaults to `false`**, and are `[]` otherwise. `Block.parentHash` is `""`
 * under the same flag.
 */
export interface BlockTransactions {
  /**
   * Coinbase amount as a nanomina decimal string. Populated regardless of
   * `ENABLE_BLOCK_TRANSACTION_DETAILS`.
   */
  coinbase: string;
  /** Empty unless the server sets `ENABLE_BLOCK_TRANSACTION_DETAILS=true`. */
  userCommands: UserCommand[];
  /** Empty unless the server sets `ENABLE_BLOCK_TRANSACTION_DETAILS=true`. */
  zkappCommands: ZkAppCommand[];
  /** Empty unless the server sets `ENABLE_BLOCK_TRANSACTION_DETAILS=true`. */
  feeTransfer: FeeTransfer[];
}

/**
 * A block.
 *
 * Transaction detail is gated behind the server's
 * `ENABLE_BLOCK_TRANSACTION_DETAILS`, which **defaults to `false`**. Against a
 * stock server `parentHash` is `""` and `transactions.userCommands`,
 * `.zkappCommands` and `.feeTransfer` are all `[]`, while
 * `transactions.coinbase` **is** populated — so the response looks healthy and
 * is easily mistaken for an empty chain or an SDK bug.
 */
export interface Block {
  blockHeight: number;
  creator: string;
  stateHash: string;
  /** `""` unless the server sets `ENABLE_BLOCK_TRANSACTION_DETAILS=true`. */
  parentHash: string;
  /**
   * ISO-8601 timestamp, e.g. `"2023-08-14T23:10:01.000Z"`. Safe to pass
   * straight to `new Date()`.
   *
   * Contrast {@link BlockInfo.timestamp}, which is Unix epoch milliseconds as
   * a decimal string. The server derives this field from the same archive
   * column that `BlockInfo.timestamp` exposes raw.
   */
  dateTime: string;
  transactions: BlockTransactions;
}
