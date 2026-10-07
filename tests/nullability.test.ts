/**
 * List nullability as schema 2.0 declares it.
 *
 * Schema 2.0 makes the elements of eight list positions non-null
 * (`[T]` → `[T!]`). The type-level block below is the regression guard: each
 * `@ts-expect-error` line fails `npm run build` if its element type admits
 * `null` again. The two lists that stay nullable as a whole
 * (`EventOutput.eventData`, `ActionOutput.actionData`) must still accept
 * `null`. The runtime tests prove the client passes these values through
 * unchanged.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveClient } from '../src/client.js';
import type {
  ActionData,
  ActionOutput,
  Block,
  EventData,
  EventOutput,
  TransactionInfo,
  VerificationKeyUpdate,
} from '../src/types.js';

// -- Type-level assertions --

type Events = Awaited<ReturnType<ArchiveClient['getEvents']>>;
type Actions = Awaited<ReturnType<ArchiveClient['getActions']>>;
type Blocks = Awaited<ReturnType<ArchiveClient['getBlocks']>>;
type VkUpdates = Awaited<ReturnType<ArchiveClient['getVerificationKeyUpdates']>>;

// Non-null elements: a `null` element must NOT compile.
// @ts-expect-error `events: [EventOutput!]!`
const _events: Events = [null];
// @ts-expect-error `actions: [ActionOutput!]!`
const _actions: Actions = [null];
// @ts-expect-error `blocks: [Block!]!`
const _blocks: Blocks = [null];
// @ts-expect-error `EventData.data: [String!]!`
const _eventData: EventData['data'] = ['0x1', null];
// @ts-expect-error `ActionData.data: [String!]!`
const _actionData: ActionData['data'] = [null];
// @ts-expect-error `TransactionInfo.zkappAccountUpdateIds: [Int!]!`
const _updateIds: TransactionInfo['zkappAccountUpdateIds'] = [42, null];
// @ts-expect-error `EventOutput.eventData: [EventData!]`
const _eventGroup: EventOutput['eventData'] = [null];
// @ts-expect-error `ActionOutput.actionData: [ActionData!]`
const _actionGroup: ActionOutput['actionData'] = [null];
// @ts-expect-error `verificationKeyUpdates: [VerificationKeyUpdate!]!`
const _vkUpdates: VkUpdates = [null];

// The outer list of these two stays nullable.
const _eventGroupNull: EventOutput['eventData'] = null;
const _actionGroupNull: ActionOutput['actionData'] = null;

// The element types are exactly the non-null types.
const _blocksOk: Blocks = [] as Block[];
const _vkUpdatesOk: VkUpdates = [] as VerificationKeyUpdate[];

void [
  _events,
  _actions,
  _blocks,
  _eventData,
  _actionData,
  _updateIds,
  _eventGroup,
  _actionGroup,
  _vkUpdates,
  _eventGroupNull,
  _actionGroupNull,
  _blocksOk,
  _vkUpdatesOk,
];

// -- Runtime --

function jsonFetch(body: unknown): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
}

function clientFor(body: unknown): ArchiveClient {
  return new ArchiveClient('http://x/', { retries: 1, fetch: jsonFetch(body) });
}

test('events: lists and a null eventData survive intact', async () => {
  const client = clientFor({
    data: {
      events: [
        { blockInfo: null, eventData: null },
        {
          blockInfo: null,
          eventData: [
            {
              accountUpdateId: '1',
              transactionInfo: { zkappAccountUpdateIds: [42, 43] },
              data: ['0x1', ''],
            },
          ],
        },
      ],
    },
  });

  const events = await client.getEvents({ address: 'B62q...' });

  assert.equal(events.length, 2);
  assert.equal(events[0].eventData, null, 'a null eventData stays null');

  const data = events[1].eventData?.[0];
  assert.ok(data);
  assert.deepEqual(data.data, ['0x1', '']);
  assert.equal(data.data[1], '', 'an empty string stays an empty string');
  assert.deepEqual(data.transactionInfo?.zkappAccountUpdateIds, [42, 43]);
});

test('actions: lists and a null actionData survive intact', async () => {
  const actionState = {
    actionStateOne: null,
    actionStateTwo: null,
    actionStateThree: null,
    actionStateFour: null,
    actionStateFive: null,
  };
  const client = clientFor({
    data: {
      actions: [
        { blockInfo: null, transactionInfo: null, actionData: null, actionState },
        {
          blockInfo: null,
          transactionInfo: null,
          actionData: [{ accountUpdateId: '1', transactionInfo: null, data: ['0x2'] }],
          actionState,
        },
      ],
    },
  });

  const actions = await client.getActions({ address: 'B62q...' });

  assert.equal(actions.length, 2);
  assert.equal(actions[0].actionData, null, 'a null actionData stays null');
  assert.equal(actions[1].actionData?.[0].data[0], '0x2');
});

test('blocks: elements are returned as sent', async () => {
  const realBlock = { blockHeight: 42, creator: 'B62q', stateHash: 'sh' };
  const client = clientFor({ data: { blocks: [realBlock] } });

  const blocks = await client.getBlocks({ limit: 1 });

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockHeight, 42);
});
