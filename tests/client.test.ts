import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveClient } from '../src/client.js';
import {
  ConnectionError,
  ErrorCode,
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

// The endpoint is the server's root path `/` (#9). The documentation used to
// say `/graphql`, which 404s. The client was never at fault, so pin that down:
// whatever URL the caller supplies is the URL that gets POSTed, unchanged.
test('posts the configured URL verbatim and never appends a path', async () => {
  const cases = [
    ['https://h/custom', '/custom'],
    ['https://h/', '/'],
    ['https://h', '/'],
    ['https://h/graphql', '/graphql'],
  ] as const;

  for (const [configured, expectedPath] of cases) {
    let seen: string | null = null;
    const captureFetch: typeof fetch = async (url) => {
      seen = String(url);
      return jsonResponse({ data: { networkState: { maxBlockHeight: null } } });
    };
    const client = new ArchiveClient(configured, {
      retries: 1,
      fetch: captureFetch,
    });
    await client.getNetworkState();

    assert.equal(seen, configured, `posted URL should equal ${configured}`);
    assert.equal(
      new URL(seen!).pathname,
      expectedPath,
      `${configured} should reach path ${expectedPath}`,
    );
  }
});

// The API publishes extensions.code as its discriminator (#11). The data
// already survived at runtime — this was a type-surface defect — so the test
// that matters is that TypeScript can now reach it without a cast.
test('GraphqlError exposes extensions, path and locations', async () => {
  const client = new ArchiveClient('http://x/', {
    retries: 1,
    fetch: fakeFetch([
      jsonResponse({
        errors: [
          {
            message: 'm',
            extensions: { code: 'BLOCK_RANGE_ERROR', status: 400 },
            path: ['events'],
            locations: [{ line: 2, column: 3 }],
          },
        ],
        data: null,
      }),
    ]),
  });

  await assert.rejects(
    () => client.getEvents({ address: 'B62q...' }),
    (err: unknown) => {
      assert.ok(err instanceof GraphqlError);
      // No `as any` anywhere below — that is the point of the issue.
      assert.equal(err.errors[0].extensions?.code, 'BLOCK_RANGE_ERROR');
      assert.equal(err.errors[0].extensions?.status, 400);
      assert.deepEqual(err.errors[0].path, ['events']);
      assert.deepEqual(err.errors[0].locations, [{ line: 2, column: 3 }]);
      assert.equal(err.code, ErrorCode.BlockRangeError);
      assert.deepEqual(err.codes, ['BLOCK_RANGE_ERROR']);
      assert.ok(err.hasCode(ErrorCode.BlockRangeError));
      assert.ok(!err.hasCode(ErrorCode.RateLimited));
      return true;
    },
  );
});

// The server masks unexpected errors, so those carry no extensions at all.
test('a masked error has no code and does not throw on access', async () => {
  const client = new ArchiveClient('http://x/', {
    retries: 1,
    fetch: fakeFetch([
      jsonResponse({ errors: [{ message: 'Unexpected error.' }], data: null }),
    ]),
  });

  await assert.rejects(
    () => client.getEvents({ address: 'B62q...' }),
    (err: unknown) => {
      assert.ok(err instanceof GraphqlError);
      assert.equal(err.code, undefined);
      assert.deepEqual(err.codes, []);
      assert.ok(!err.hasCode(ErrorCode.BlockRangeError));
      return true;
    },
  );
});

// The rate limiter answers before GraphQL runs, with a GraphQL-shaped body and
// three headers (#10). All of it was dropped: HttpError carried only status
// and statusText, and every 4xx was retried on a fixed delay.
test('429 surfaces the body, retry-after and the rate-limit budget', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    return new Response(
      JSON.stringify({
        errors: [
          {
            message: 'Too many requests. Please retry later.',
            extensions: { code: 'RATE_LIMITED' },
          },
        ],
      }),
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'content-type': 'application/json',
          'retry-after': '37',
          'x-ratelimit-limit': '600',
          'x-ratelimit-remaining': '0',
        },
      },
    );
  };

  // retries: 1 so the call does not sleep through retry-after.
  const client = new ArchiveClient('http://x/', { retries: 1, fetch: f });

  await assert.rejects(
    () => client.getNetworkState(),
    (thrown: unknown) => {
      // Criterion 1: the error, or its cause, is an HttpError with status 429.
      const err =
        thrown instanceof HttpError
          ? thrown
          : ((thrown as ConnectionError).cause as HttpError);
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 429);
      // Criterion 2.
      assert.equal(err.retryAfterSeconds, 37);
      // Criterion 3. `extensions` is typed on GraphqlErrorEntry since #11,
      // so this needs no cast.
      assert.equal(err.errors[0].extensions?.code, ErrorCode.RateLimited);
      // The budget headers, which the issue also lists as dropped.
      assert.equal(err.limit, 600);
      assert.equal(err.remaining, 0);
      assert.ok(err.isRateLimited);
      assert.ok(err.isRetryable);
      return true;
    },
  );
  assert.equal(calls, 1);
});

// Criterion 4: a 404 must cost exactly one request, not the whole budget.
test('a 404 is not retried and reports the status directly', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    return new Response('<!DOCTYPE html><html><body>Not Found</body></html>', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'text/html' },
    });
  };

  const client = new ArchiveClient('http://x/', {
    retries: 3,
    retryDelayMs: 0,
    fetch: f,
  });

  await assert.rejects(
    () => client.getNetworkState(),
    (thrown: unknown) => {
      assert.ok(
        thrown instanceof HttpError,
        `a non-retryable status should surface as HttpError, got ${String(thrown)}`,
      );
      assert.equal(thrown.status, 404);
      assert.ok(!thrown.isRetryable);
      // Not JSON, so the raw body is kept instead of an errors array.
      assert.match(thrown.body ?? '', /Not Found/);
      return true;
    },
  );
  assert.equal(calls, 1, 'a 404 must cost exactly one request');
});

// 5xx must still be retried — the fix must not turn every status into a
// single-shot failure.
test('5xx is still retried and can recover', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response('boom', { status: 503, statusText: 'Unavailable' });
    }
    return new Response(
      JSON.stringify({
        data: { networkState: { maxBlockHeight: null } },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const client = new ArchiveClient('http://x/', {
    retries: 3,
    retryDelayMs: 0,
    fetch: f,
  });
  await client.getNetworkState();
  assert.equal(calls, 2);
});

// A 429 is retried, and retry-after is honoured rather than the fixed delay.
test('429 is retried, honouring retry-after', async () => {
  let calls = 0;
  const f: typeof fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ errors: [{ message: 'slow' }] }), {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'content-type': 'application/json', 'retry-after': '0' },
      });
    }
    return new Response(
      JSON.stringify({ data: { networkState: { maxBlockHeight: null } } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const client = new ArchiveClient('http://x/', {
    retries: 3,
    retryDelayMs: 0,
    fetch: f,
  });
  await client.getNetworkState();
  assert.equal(calls, 2);
});
