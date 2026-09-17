/**
 * Compile-time proof that the hand-written types match the vendored SDL.
 *
 * `schema-types.ts` next to this file is generated from `schema.graphql` by
 * `npm run codegen`; CI regenerates it and fails on a diff, so it always says
 * what the SDL says. This file then asserts that every hand-written type in
 * `../types.ts` is *exactly* equal to its generated counterpart, and that each
 * client method returns exactly what the corresponding root field is declared
 * to be.
 *
 * That closes the gap the old drift check left open. A plain `diff` of the two
 * schema files reported "in sync" while the declared types had drifted from
 * that very file in six places — the guard was green precisely when the thing
 * it protected was broken. These assertions cannot be: they fail to compile.
 *
 * `src/types.ts` stays hand-written rather than being replaced by the
 * generated file because it carries what a generator cannot produce — the
 * `timestamp` encoding warning, the `ENABLE_BLOCK_TRANSACTION_DETAILS` notes,
 * the element-nullability explanations. This file makes keeping both safe.
 *
 * Nothing here emits runtime code; the whole file erases at build time.
 */

import type * as Gen from './schema-types.js';
import type * as Hand from '../types.js';
import type { ArchiveClient } from '../client.js';

/**
 * Exact type equality, not mere assignability.
 *
 * Assignability alone would let `string[]` pass against
 * `(string | null)[]` in one direction, which is the whole bug this guards.
 */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

/** Fails to compile unless `T` is exactly `true`. */
type Expect<T extends true> = T;

/** What `ArchiveClient.<method>` resolves to. */
type Returns<M extends keyof ArchiveClient> = Awaited<
  ReturnType<ArchiveClient[M] extends (...args: never[]) => unknown ? ArchiveClient[M] : never>
>;

// -- Output types --

export type _ActionData = Expect<Equals<Hand.ActionData, Gen.ActionData>>;
export type _ActionOutput = Expect<Equals<Hand.ActionOutput, Gen.ActionOutput>>;
export type _ActionStates = Expect<Equals<Hand.ActionStates, Gen.ActionStates>>;
export type _Block = Expect<Equals<Hand.Block, Gen.Block>>;
export type _BlockInfo = Expect<Equals<Hand.BlockInfo, Gen.BlockInfo>>;
export type _BlockTransactions = Expect<Equals<Hand.BlockTransactions, Gen.BlockTransactions>>;
export type _EventData = Expect<Equals<Hand.EventData, Gen.EventData>>;
export type _EventOutput = Expect<Equals<Hand.EventOutput, Gen.EventOutput>>;
export type _FeeTransfer = Expect<Equals<Hand.FeeTransfer, Gen.FeeTransfer>>;
export type _MaxBlockHeightInfo = Expect<Equals<Hand.MaxBlockHeightInfo, Gen.MaxBlockHeightInfo>>;
export type _NetworkStateOutput = Expect<Equals<Hand.NetworkStateOutput, Gen.NetworkStateOutput>>;
export type _TransactionInfo = Expect<Equals<Hand.TransactionInfo, Gen.TransactionInfo>>;
export type _UserCommand = Expect<Equals<Hand.UserCommand, Gen.UserCommand>>;
export type _VerificationKeyUpdate = Expect<
  Equals<Hand.VerificationKeyUpdate, Gen.VerificationKeyUpdate>
>;
export type _ZkAppCommand = Expect<Equals<Hand.ZkAppCommand, Gen.ZkAppCommand>>;

// -- Input types --

export type _ActionFilterOptionsInput = Expect<
  Equals<Hand.ActionFilterOptionsInput, Gen.ActionFilterOptionsInput>
>;
export type _BlockQueryInput = Expect<Equals<Hand.BlockQueryInput, Gen.BlockQueryInput>>;
export type _EventFilterOptionsInput = Expect<
  Equals<Hand.EventFilterOptionsInput, Gen.EventFilterOptionsInput>
>;
export type _VerificationKeyUpdateFilterInput = Expect<
  Equals<Hand.VerificationKeyUpdateFilterInput, Gen.VerificationKeyUpdateFilterInput>
>;

// -- Enums --

export type _BlockSortByInput = Expect<Equals<Hand.BlockSortByInput, Gen.BlockSortByInput>>;
export type _BlockStatusFilter = Expect<Equals<Hand.BlockStatusFilter, Gen.BlockStatusFilter>>;

// -- Query root --
//
// The six nullability fixes live here as much as in the types above: revert
// any of them and one of these stops compiling.

export type _getEvents = Expect<Equals<Returns<'getEvents'>, Gen.Query['events']>>;
export type _getActions = Expect<Equals<Returns<'getActions'>, Gen.Query['actions']>>;
export type _getBlocks = Expect<Equals<Returns<'getBlocks'>, Gen.Query['blocks']>>;
export type _getNetworkState = Expect<
  Equals<Returns<'getNetworkState'>, Gen.Query['networkState']>
>;
export type _getVerificationKeyUpdates = Expect<
  Equals<Returns<'getVerificationKeyUpdates'>, Gen.Query['verificationKeyUpdates']>
>;
