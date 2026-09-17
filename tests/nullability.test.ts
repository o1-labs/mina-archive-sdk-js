/**
 * The six SDL-nullable positions that the declared types used to drop.
 *
 * Two halves, and both matter. The type-level block below is the real
 * regression guard: it only compiles because the declared types admit `null`,
 * so reverting any one of the six widenings fails `npm run build`. The runtime
 * tests then prove the nulls survive the client intact rather than being
 * elided.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveClient } from '../src/client.js';
import type {
  ActionOutput,
  ActionData,
  Block,
  EventOutput,
  EventData,
  TransactionInfo,
  VerificationKeyUpdate,
} from '../src/types.js';

// -- Type-level assertions --
//
// Every assignment here is a legal server response under `schema.graphql`.
// Each corresponds to one row of the table in issue #8.

const _events: (EventOutput | null)[] = [null]; // schema.graphql:239 [EventOutput]!
const _actions: (ActionOutput | null)[] = [null]; // schema.graphql:240 [ActionOutput]!
const _blocks: (Block | null)[] = [null]; // schema.graphql:245 [Block]!
const _eventData: EventData['data'] = ['0x1', null]; // schema.graphql:85 [String]!
const _actionData: ActionData['data'] = [null]; // schema.graphql:91 [String]!
const _updateIds: TransactionInfo['zkappAccountUpdateIds'] = [42, null]; // :117 [Int]!

// The SDL types this one `[VerificationKeyUpdate!]!` — elements included — so
// it stays non-nullable. A `null` here must NOT compile.
const _vkUpdates: VerificationKeyUpdate[] = [];
// @ts-expect-error `[VerificationKeyUpdate!]!` has non-nullable elements
const _vkUpdatesWithNull: VerificationKeyUpdate[] = [null];

void [
  _events,
  _actions,
  _blocks,
  _eventData,
  _actionData,
  _updateIds,
  _vkUpdates,
  _vkUpdatesWithNull,
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

test('events: null elements and null members survive intact', async () => {
  const client = clientFor({
    data: {
      events: [
        null,
        {
          blockInfo: null,
          eventData: [
            null,
            {
              accountUpdateId: '1',
              transactionInfo: { zkappAccountUpdateIds: [42, null] },
              data: ['0x1', null, ''],
            },
          ],
        },
      ],
    },
  });

  const events = await client.getEvents({ address: 'B62q...' });

  assert.equal(events.length, 2, 'a null element is kept, not dropped');
  assert.equal(events[0], null);

  const group = events[1];
  assert.ok(group);
  assert.equal(group.eventData?.[0], null);

  const data = group.eventData?.[1];
  assert.ok(data);
  assert.deepEqual(data.data, ['0x1', null, '']);
  assert.equal(data.data[1], null, 'a null element stays null');
  assert.equal(data.data[2], '', 'an empty string stays distinguishable from null');
  assert.deepEqual(data.transactionInfo?.zkappAccountUpdateIds, [42, null]);
});

test('actions: null elements and null data members survive intact', async () => {
  const client = clientFor({
    data: {
      actions: [
        null,
        {
          blockInfo: null,
          transactionInfo: null,
          actionData: [{ accountUpdateId: '1', transactionInfo: null, data: [null] }],
          actionState: {
            actionStateOne: null,
            actionStateTwo: null,
            actionStateThree: null,
            actionStateFour: null,
            actionStateFive: null,
          },
        },
      ],
    },
  });

  const actions = await client.getActions({ address: 'B62q...' });

  assert.equal(actions.length, 2);
  assert.equal(actions[0], null);
  assert.equal(actions[1]?.actionData?.[0]?.data[0], null);
});

test('blocks: a null element is never a zero-value block', async () => {
  const realBlock = { blockHeight: 42, creator: 'B62q', stateHash: 'sh' };
  const client = clientFor({ data: { blocks: [null, realBlock] } });

  const blocks = await client.getBlocks({ limit: 2 });

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0], null, 'a null block stays null, not height 0');
  assert.equal(blocks[1]?.blockHeight, 42);
});
