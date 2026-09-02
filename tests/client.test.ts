import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveClient } from '../src/client.js';
import {
  ConnectionError,
  GraphqlError,
  HttpError,
  MissingFieldError,
} from '../src/errors.js';

/** Build a fake `fetch` that returns a queue of responses (or errors). */
function fakeFetch(
  responses: (Response | Error | (() => Response | Error))[],
): typeof fetch {
  let i = 0;
  const fn: typeof fetch = async () => {
    const r = responses[i++];
    const result = typeof r === 'function' ? r() : r;
    if (result instanceof Error) throw result;
    return result;
  };
  return fn;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

test('getEvents: happy path returns parsed events', async () => {
  const sample = [
    {
      blockInfo: {
        height: 100,
        stateHash: 'sh',
        parentHash: 'ph',
        ledgerHash: 'lh',
        chainStatus: 'canonical',
        timestamp: '0',
        globalSlotSinceHardfork: 0,
        globalSlotSinceGenesis: 0,
        distanceFromMaxBlockHeight: 1,
      },
      eventData: [{ accountUpdateId: '1', transactionInfo: null, data: ['0x1'] }],
    },
  ];
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: fakeFetch([jsonResponse({ data: { events: sample } })]),
  });
  const result = await client.getEvents({ address: 'B62q...' });
  assert.deepEqual(result, sample);
});

test('getActions: happy path', async () => {
  const sample = [
    {
      blockInfo: null,
      transactionInfo: null,
      actionData: [],
      actionState: {
        actionStateOne: 'a',
        actionStateTwo: null,
        actionStateThree: null,
        actionStateFour: null,
        actionStateFive: null,
      },
    },
  ];
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: fakeFetch([jsonResponse({ data: { actions: sample } })]),
  });
  const result = await client.getActions({ address: 'B62q...' });
  assert.deepEqual(result, sample);
});

test('getNetworkState: happy path', async () => {
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: fakeFetch([
      jsonResponse({
        data: {
          networkState: {
            maxBlockHeight: {
              canonicalMaxBlockHeight: 1000,
              pendingMaxBlockHeight: 1010,
            },
          },
        },
      }),
    ]),
  });
  const result = await client.getNetworkState();
  assert.equal(result.maxBlockHeight?.canonicalMaxBlockHeight, 1000);
});

test('getBlocks: passes optional filters as null when omitted', async () => {
  let sentBody: string | null = null;
  const captureFetch: typeof fetch = async (_url, init) => {
    sentBody = init?.body as string;
    return jsonResponse({ data: { blocks: [] } });
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: captureFetch,
  });
  await client.getBlocks();
  assert.ok(sentBody);
  const parsed = JSON.parse(sentBody);
  assert.equal(parsed.variables.query, null);
  assert.equal(parsed.variables.limit, null);
  assert.equal(parsed.variables.sortBy, null);
});

test('getVerificationKeyUpdates: happy path', async () => {
  const sample = [
    {
      accountUpdateId: '42',
      address: 'B62qtest',
      tokenId: 'wSHV2S4qX9jFsLjQo8r1BsMLH2ZRKsZx6EJd1sbozGPieEC4Jf',
      verificationKeyHash:
        '2732298346754781834759238475982374598237459823745982374598237459',
      blockInfo: {
        height: 100,
        stateHash: 'sh',
        parentHash: 'ph',
        ledgerHash: 'lh',
        chainStatus: 'canonical',
        timestamp: '0',
        globalSlotSinceHardfork: 0,
        globalSlotSinceGenesis: 0,
        distanceFromMaxBlockHeight: 1,
      },
      transactionInfo: {
        status: 'applied',
        hash: 'txhash',
        memo: '',
        authorizationKind: 'Proof',
        sequenceNumber: 0,
        zkappAccountUpdateIds: [42],
      },
    },
  ];
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: fakeFetch([jsonResponse({ data: { verificationKeyUpdates: sample } })]),
  });
  const result = await client.getVerificationKeyUpdates({
    verificationKeyHash: '2732298346754781834759238475982374598237459823745982374598237459',
    from: 1,
    to: 1000,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].address, 'B62qtest');
  assert.equal(result[0].blockInfo.height, 100);
});

test('getVerificationKeyUpdates: sends the filter as the input variable', async () => {
  let sentBody: string | null = null;
  const captureFetch: typeof fetch = async (_url, init) => {
    sentBody = init?.body as string;
    return jsonResponse({ data: { verificationKeyUpdates: [] } });
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: captureFetch,
  });
  await client.getVerificationKeyUpdates({
    verificationKeyHash: 'vk',
    from: 10,
    to: 20,
    status: 'CANONICAL',
  });
  assert.ok(sentBody);
  const parsed = JSON.parse(sentBody);
  assert.deepEqual(parsed.variables.input, {
    verificationKeyHash: 'vk',
    from: 10,
    to: 20,
    status: 'CANONICAL',
  });
  assert.match(parsed.query, /verificationKeyUpdates\(input: \$input\)/);
});

test('GraphQL error: throws GraphqlError, does not retry', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    return jsonResponse({ errors: [{ message: 'bad input' }] });
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 3,
    retryDelayMs: 0,
    fetch: f,
  });
  await assert.rejects(
    () => client.getEvents({ address: '' }),
    (err: unknown) => {
      assert.ok(err instanceof GraphqlError);
      assert.match((err as GraphqlError).message, /bad input/);
      return true;
    },
  );
  assert.equal(calls, 1, 'GraphQL errors must not trigger retries');
});

test('Missing data field: throws MissingFieldError', async () => {
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: fakeFetch([jsonResponse({ data: {} })]),
  });
  await assert.rejects(
    () => client.getEvents({ address: 'B62q' }),
    MissingFieldError,
  );
});

test('Transient HTTP 500: retries then succeeds', async () => {
  const client = new ArchiveClient('http://x/graphql', {
    retries: 3,
    retryDelayMs: 0,
    fetch: fakeFetch([
      new Response('boom', { status: 500, statusText: 'Server Error' }),
      jsonResponse({
        data: {
          networkState: {
            maxBlockHeight: { canonicalMaxBlockHeight: 1, pendingMaxBlockHeight: 2 },
          },
        },
      }),
    ]),
  });
  const result = await client.getNetworkState();
  assert.equal(result.maxBlockHeight?.canonicalMaxBlockHeight, 1);
});

test('Persistent HTTP failure: throws ConnectionError after retries', async () => {
  const client = new ArchiveClient('http://x/graphql', {
    retries: 2,
    retryDelayMs: 0,
    fetch: fakeFetch([
      new Response('fail', { status: 502, statusText: 'Bad Gateway' }),
      new Response('fail', { status: 502, statusText: 'Bad Gateway' }),
    ]),
  });
  await assert.rejects(
    () => client.getNetworkState(),
    (err: unknown) => {
      assert.ok(err instanceof ConnectionError);
      assert.equal((err as ConnectionError).attempts, 2);
      assert.ok((err as ConnectionError).cause instanceof HttpError);
      return true;
    },
  );
});

test('Network error: retries then throws ConnectionError', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    throw new TypeError('network kaboom');
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 3,
    retryDelayMs: 0,
    fetch: f,
  });
  await assert.rejects(() => client.getNetworkState(), ConnectionError);
  assert.equal(calls, 3);
});

test('custom query: builder threads variables and name', async () => {
  let body: string | null = null;
  const f: typeof fetch = async (_url, init) => {
    body = init?.body as string;
    return jsonResponse({ data: { foo: 42 } });
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    fetch: f,
  });
  const result = await client
    .query('query Foo($x: Int) { foo(x: $x) }')
    .variables({ x: 7 })
    .name('foo')
    .send<{ foo: number }>();
  assert.equal(result.foo, 42);
  const sent = JSON.parse(body!);
  assert.equal(sent.variables.x, 7);
});

test('custom headers are forwarded', async () => {
  let captured: Headers | undefined;
  const f: typeof fetch = async (_url, init) => {
    captured = new Headers(init?.headers);
    return jsonResponse({
      data: {
        networkState: {
          maxBlockHeight: { canonicalMaxBlockHeight: 1, pendingMaxBlockHeight: 1 },
        },
      },
    });
  };
  const client = new ArchiveClient('http://x/graphql', {
    retries: 1,
    headers: { 'x-api-key': 'secret' },
    fetch: f,
  });
  await client.getNetworkState();
  assert.ok(captured);
  assert.equal(captured.get('x-api-key'), 'secret');
  assert.equal(captured.get('content-type'), 'application/json');
});

test('rejects retries < 1 in constructor', () => {
  assert.throws(
    () => new ArchiveClient('http://x', { retries: 0 }),
    /retries must be at least 1/,
  );
});

test('rejects timeoutMs <= 0', () => {
  assert.throws(
    () => new ArchiveClient('http://x', { timeoutMs: 0 }),
    /timeoutMs/,
  );
});
