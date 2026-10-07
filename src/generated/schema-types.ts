export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

export type ActionData = {
  accountUpdateId: Scalars['String']['output'];
  data: Array<Scalars['String']['output']>;
  transactionInfo: Maybe<TransactionInfo>;
};

/**
 * Filter actions from a specific account
 *
 * **WARNING**: The graphQL schema server will limit the block scan range to a fixed number of blocks.  The default is 10,000 blocks, but can be changed by the host.
 * It is the responsibility of the client to use a block range that is within the limit, which will guarantee that all actions are eventually returned.  It is possible to get a partial result if you do not specify both a `from` and a `to` parameter.
 */
export type ActionFilterOptionsInput = {
  address: Scalars['String']['input'];
  /** Filter for actions that happened before this action state, inclusive */
  endActionState?: InputMaybe<Scalars['String']['input']>;
  /** Mina block height to filter actions from, inclusive */
  from?: InputMaybe<Scalars['Int']['input']>;
  /** Filter for actions that happened after this action state, inclusive */
  fromActionState?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<BlockStatusFilter>;
  /** Mina block height to filter actions to, exclusive */
  to?: InputMaybe<Scalars['Int']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type ActionOutput = {
  actionData: Maybe<Array<ActionData>>;
  actionState: ActionStates;
  blockInfo: Maybe<BlockInfo>;
  transactionInfo: Maybe<TransactionInfo>;
};

export type ActionStates = {
  actionStateFive: Maybe<Scalars['String']['output']>;
  actionStateFour: Maybe<Scalars['String']['output']>;
  actionStateOne: Maybe<Scalars['String']['output']>;
  actionStateThree: Maybe<Scalars['String']['output']>;
  actionStateTwo: Maybe<Scalars['String']['output']>;
};

export type Block = {
  blockHeight: Scalars['Int']['output'];
  creator: Scalars['String']['output'];
  dateTime: Scalars['DateTime']['output'];
  parentHash: Scalars['String']['output'];
  stateHash: Scalars['String']['output'];
  transactions: BlockTransactions;
};

export type BlockInfo = {
  chainStatus: Scalars['String']['output'];
  distanceFromMaxBlockHeight: Scalars['Int']['output'];
  globalSlotSinceGenesis: Scalars['Int']['output'];
  globalSlotSinceHardfork: Scalars['Int']['output'];
  height: Scalars['Int']['output'];
  ledgerHash: Scalars['String']['output'];
  parentHash: Scalars['String']['output'];
  stateHash: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

/** Filter for blocks by date range, canonical status, and other criteria */
export type BlockQueryInput = {
  /** Filter blocks from this height, inclusive */
  blockHeight_gte?: InputMaybe<Scalars['Int']['input']>;
  /** Filter blocks to this height, exclusive */
  blockHeight_lt?: InputMaybe<Scalars['Int']['input']>;
  /** Filter for canonical (finalized) blocks only */
  canonical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter blocks from this date/time, inclusive */
  dateTime_gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter blocks to this date/time, exclusive */
  dateTime_lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for blocks in best chain only */
  inBestChain?: InputMaybe<Scalars['Boolean']['input']>;
};

export type BlockSortByInput =
  | 'BLOCKHEIGHT_ASC'
  | 'BLOCKHEIGHT_DESC';

/** Filter for the consensus status of the block */
export type BlockStatusFilter =
  /** All blocks */
  | 'ALL'
  /** Only canonical (finalized) blocks */
  | 'CANONICAL'
  /** Only pending blocks */
  | 'PENDING';

export type BlockTransactions = {
  coinbase: Scalars['String']['output'];
  feeTransfer: Array<FeeTransfer>;
  userCommands: Array<UserCommand>;
  zkappCommands: Array<ZkAppCommand>;
};

export type EventData = {
  accountUpdateId: Scalars['String']['output'];
  data: Array<Scalars['String']['output']>;
  transactionInfo: Maybe<TransactionInfo>;
};

/**
 * Filter events from a specific account
 *
 * **WARNING**: The graphQL schema server will limit the block scan range to a fixed number of blocks.  The default is 10,000 blocks, but can be changed by the host.
 * It is the responsibility of the client to use a block range that is within the limit, which will guarantee that all events are eventually returned.  It is possible to get a partial result if you do not specify both a `from` and a `to` parameter.
 */
export type EventFilterOptionsInput = {
  address: Scalars['String']['input'];
  /** Mina block height to filter events from, inclusive */
  from?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<BlockStatusFilter>;
  /** Mina block height to filter events to, exclusive */
  to?: InputMaybe<Scalars['Int']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type EventOutput = {
  blockInfo: Maybe<BlockInfo>;
  eventData: Maybe<Array<EventData>>;
};

export type FeeTransfer = {
  fee: Scalars['String']['output'];
  recipient: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type MaxBlockHeightInfo = {
  canonicalMaxBlockHeight: Scalars['Int']['output'];
  pendingMaxBlockHeight: Scalars['Int']['output'];
};

/** Metadata about the network */
export type NetworkStateOutput = {
  /** Returns the latest pending and canonical block heights that are synced by the archive node.  If the archive node is not fully synced, the pending block height will be lower than the actual network state.  Wait some time for the archive node to get back in sync. */
  maxBlockHeight: Maybe<MaxBlockHeightInfo>;
};

export type Query = {
  actions: Array<ActionOutput>;
  blocks: Array<Block>;
  events: Array<EventOutput>;
  networkState: NetworkStateOutput;
  /**
   * The `MAJOR.MINOR` version of this schema.
   *
   * Clients compare it with the schema version they were built against: an equal
   * major means the contract they code against still holds, and a higher minor
   * means this server has additive changes they may not know about yet.
   *
   * Always available, even when `ENABLED_QUERIES` restricts which data queries
   * this server exposes — a compatibility check that can itself be switched off
   * is of no use to a client.
   */
  schemaVersion: Scalars['String']['output'];
  verificationKeyUpdates: Array<VerificationKeyUpdate>;
  zkappCommands: Array<ZkappCommandOutput>;
};


export type QueryActionsArgs = {
  input: ActionFilterOptionsInput;
};


export type QueryBlocksArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  query: InputMaybe<BlockQueryInput>;
  sortBy: InputMaybe<BlockSortByInput>;
};


export type QueryEventsArgs = {
  input: EventFilterOptionsInput;
};


export type QueryVerificationKeyUpdatesArgs = {
  input: VerificationKeyUpdateFilterInput;
};


export type QueryZkappCommandsArgs = {
  input: ZkappCommandFilterOptionsInput;
};

export type TransactionInfo = {
  authorizationKind: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  memo: Scalars['String']['output'];
  sequenceNumber: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  zkappAccountUpdateIds: Array<Scalars['Int']['output']>;
};

export type UserCommand = {
  amount: Scalars['String']['output'];
  failureReason: Maybe<Scalars['String']['output']>;
  fee: Scalars['String']['output'];
  from: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  memo: Scalars['String']['output'];
  nonce: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type VerificationKeyUpdate = {
  accountUpdateId: Scalars['String']['output'];
  address: Scalars['String']['output'];
  blockInfo: BlockInfo;
  tokenId: Scalars['String']['output'];
  transactionInfo: TransactionInfo;
  verificationKeyHash: Scalars['String']['output'];
};

/**
 * Find applied account updates that set a specific verification key.
 *
 * The block range is required and limited by the server's configured maximum.
 * `from` is inclusive and `to` is exclusive.
 */
export type VerificationKeyUpdateFilterInput = {
  from: Scalars['Int']['input'];
  status?: InputMaybe<BlockStatusFilter>;
  to: Scalars['Int']['input'];
  verificationKeyHash: Scalars['String']['input'];
};

export type ZkAppCommand = {
  failureReason: Maybe<Scalars['String']['output']>;
  fee: Scalars['String']['output'];
  feePayer: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  memo: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type ZkappAccountPrecondition = {
  actionState: Maybe<ZkappFieldArray>;
  isNew: Maybe<Scalars['Boolean']['output']>;
  provedState: Maybe<Scalars['Boolean']['output']>;
  state: Maybe<ZkappFieldArray>;
};

export type ZkappAccountUpdateOutput = {
  accountPrecondition: Maybe<ZkappAccountPrecondition>;
  actions: Array<ZkappFieldArray>;
  appState: Maybe<ZkappFieldArray>;
  authorizationKind: Scalars['String']['output'];
  balanceChange: Scalars['String']['output'];
  callDepth: Scalars['Int']['output'];
  events: Array<ZkappFieldArray>;
  id: Scalars['String']['output'];
  incrementNonce: Scalars['Boolean']['output'];
  networkPrecondition: Maybe<ZkappNetworkPrecondition>;
  publicKey: Scalars['String']['output'];
  tokenId: Scalars['String']['output'];
};

/**
 * Filter successful zkApp commands by block range.
 *
 * Both `from` and `to` are required. The range is bounded by `ZKAPP_COMMAND_RANGE_SIZE`, and the server may reject dense ranges that expand to too many account updates.
 */
export type ZkappCommandFilterOptionsInput = {
  /** Optional account update public key filter. */
  accountPublicKey?: InputMaybe<Scalars['String']['input']>;
  blockStatus?: InputMaybe<BlockStatusFilter>;
  /** Mina block height to filter zkApp commands from, inclusive */
  from: Scalars['Int']['input'];
  /** Mina block height to filter zkApp commands to, exclusive */
  to: Scalars['Int']['input'];
  /** Optional account update token id filter. */
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type ZkappCommandOutput = {
  accountUpdates: Array<ZkappAccountUpdateOutput>;
  blockInfo: BlockInfo;
  fee: Scalars['String']['output'];
  feePayer: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  memo: Scalars['String']['output'];
  sequenceNumber: Scalars['Int']['output'];
};

/**
 * Raw field array from the archive database.
 *
 * An empty `fields` array means the archive row exists but contains no field values.
 * Nullable entries mean the corresponding nullable archive state slot has no field value.
 */
export type ZkappFieldArray = {
  fields: Array<Maybe<Scalars['String']['output']>>;
};

export type ZkappGlobalSlotBounds = {
  lowerBound: Maybe<Scalars['Int']['output']>;
  upperBound: Maybe<Scalars['Int']['output']>;
};

export type ZkappNetworkPrecondition = {
  globalSlotSinceGenesis: Maybe<ZkappGlobalSlotBounds>;
};
