# @o1-labs/mina-archive-sdk

[![CI](https://github.com/o1-labs/mina-archive-sdk-js/actions/workflows/ci.yml/badge.svg)](https://github.com/o1-labs/mina-archive-sdk-js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40o1-labs%2Fmina-archive-sdk?logo=npm)](https://www.npmjs.com/package/@o1-labs/mina-archive-sdk)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

TypeScript / JavaScript SDK for [Mina Protocol's Archive Node](https://github.com/o1-labs/Archive-Node-API) GraphQL endpoint.

Companion to the daemon-targeting SDKs [`MinaProtocol/mina-sdk-rust`](https://github.com/MinaProtocol/mina-sdk-rust) / [`mina-sdk-go`](https://github.com/MinaProtocol/mina-sdk-go) / [`mina-sdk-python`](https://github.com/MinaProtocol/mina-sdk-python). This SDK targets the separate **archive** endpoint defined by [`o1-labs/Archive-Node-API`](https://github.com/o1-labs/Archive-Node-API) (events, actions, blocks, network state).

## Install

```sh
npm install @o1-labs/mina-archive-sdk
```

Requires Node ≥ 20.18.

The package ships as **ES modules**. `import` is the native form:

```js
import { ArchiveClient } from '@o1-labs/mina-archive-sdk';
```

CommonJS consumers can `require()` it on Node ≥ 20.19 or ≥ 22.12, which support
requiring an ES module. On older Node, use a dynamic `import()` instead.

## Quick start

```ts
import { ArchiveClient } from '@o1-labs/mina-archive-sdk';

const client = new ArchiveClient('https://archive.example/');

const events = await client.getEvents({
  address: 'B62q...',
  status: 'CANONICAL',
  from: 100,
  to: 200,
});

for (const group of events) {
  console.log(`block ${group.blockInfo?.height}: ${group.eventData?.length ?? 0} events`);
}
```

> **The endpoint is the root path.** Archive-Node-API serves GraphQL at `/`, not
> `/graphql`. Pass the base URL as-is — the SDK never appends a path, so a URL
> ending in `/graphql` reaches a route the server does not serve and returns 404.

## API

Each method on `ArchiveClient` maps 1:1 to a GraphQL query in the [Archive-Node-API schema](./schema.graphql):

| Method | Returns | Description |
| --- | --- | --- |
| `getEvents(input)` | `EventOutput[]` | Events emitted by a zkApp account, optionally filtered by block range and consensus status. |
| `getActions(input)` | `ActionOutput[]` | Actions dispatched from a zkApp account. |
| `getNetworkState()` | `NetworkStateOutput` | Archive's max canonical and pending block heights. |
| `getBlocks({ query?, limit?, sortBy? })` | `Block[]` | Blocks filtered by height/date range and chain status. Transaction detail needs `ENABLE_BLOCK_TRANSACTION_DETAILS` on the server — see below. |
| `getVerificationKeyUpdates(input)` | `VerificationKeyUpdate[]` | Applied account updates that set a given verification key, within a required block range. |
| `query(gql)` | builder | Run arbitrary GraphQL through the same retry path. |
| `executeQuery(gql, vars, name)` | `unknown` | Low-level escape hatch returning the raw `data` field. |

### List nullability

Every list the SDK returns has non-null elements. Schema 2.0 declares
`events`, `actions` and `blocks` as `[T!]!`, `EventData.data` and
`ActionData.data` as `[String!]!`, and
`TransactionInfo.zkappAccountUpdateIds` as `[Int!]!`, so these positions are
typed `T[]` and need no per-element guard.

`EventOutput.eventData` and `ActionOutput.actionData` are the two exceptions
at the outer level: the SDL types them `[EventData!]` and `[ActionData!]`, so
the list itself can be `null` (typed `T[] | null`), but when present its
elements are not.

### Block transaction detail

`getBlocks` returns transaction detail only when the server sets
`ENABLE_BLOCK_TRANSACTION_DETAILS=true`. It **defaults to `false`**, and on a stock
server every block comes back with `parentHash` as `""` and `userCommands`,
`zkappCommands` and `feeTransfer` all empty. `coinbase` **is** populated either way,
which is what makes the response look healthy rather than obviously truncated.

### Configuration

```ts
const controller = new AbortController();

const client = new ArchiveClient('https://archive.example/', {
  retries: 5,              // default: 3
  retryDelayMs: 10_000,    // default: 5_000
  timeoutMs: 60_000,       // default: 30_000
  maxRetryAfterMs: 60_000, // default: 60_000
  signal: controller.signal,
  headers: { 'x-api-key': process.env.API_KEY },
});
```

**`timeoutMs` does not bound a `retry-after` wait.** It bounds one HTTP
request. Honouring a 429's `retry-after` means sleeping between attempts, which
no request timeout covers — `retry-after: 86400` would park the call for a day.
`maxRetryAfterMs` (default 60s) is the ceiling: above it the call rejects at
once with the `HttpError`, which carries `retryAfterSeconds` so you can decide
whether to wait, queue or fail.

**`signal` cancels the wait, not just the request.** Passing an `AbortSignal`
aborts an in-flight `fetch` *and* interrupts the sleep between attempts, and
the abort reason reaches the caller unwrapped. Without it, aborting a
rate-limited call had no effect until the whole `retry-after` had elapsed.

**This SDK targets Node, not the browser.** (`engines` requires Node ≥ 20.18.0.)
Browser use needs the server to set `CORS_ORIGIN` — Archive-Node-API disables
CORS by default — and even then the `headers` option above will break the
preflight: the API allows only `content-type` as a request header and only
`GET`/`POST`, so **any** custom header (auth, tracing, api-key) is rejected. The
SDK does send them. Put the credential-bearing call behind your own server.

### Dates and times

The schema carries **two different time encodings**, a few fields apart, and both
arrive as strings:

| Field | Encoding | Example |
| --- | --- | --- |
| `BlockInfo.timestamp` | Unix epoch **milliseconds**, decimal string | `"1692054601000"` |
| `Block.dateTime` | ISO-8601 | `"2023-08-14T23:10:01.000Z"` |

`BlockInfo.timestamp` is a raw pass-through of the archive DB column, so the obvious
call is quietly wrong:

```js
new Date('1692054601000')          // Invalid Date  -> NaN through any later maths
new Date(Number('1692054601000'))  // 2023-08-14T23:10:01.000Z
```

On input, `dateTime_gte` / `dateTime_lt` must be ISO-8601. The server coerces them
with `new Date(value).getTime()`, and a value it cannot parse becomes `NaN`, which
reaches SQL as the string `"NaN"` and **matches nothing without erroring** — HTTP 200,
empty list, no diagnostic anywhere.

Two helpers make both cases safe, and throw instead of returning `NaN`:

```ts
import { blockTimestampToDate, toBlockDateTimeFilter } from '@o1-labs/mina-archive-sdk';

blockTimestampToDate('1692054601000');            // Date 2023-08-14T23:10:01.000Z
toBlockDateTimeFilter(new Date(1691971200000));   // "2023-08-14T00:00:00.000Z"
```

### Currency helper

The `Currency` type wraps nanomina amounts in a `bigint` for overflow-safe parsing of coinbase / fees / user-command amounts:

```ts
import { Currency } from '@o1-labs/mina-archive-sdk';

const coinbase = Currency.fromGraphql(block.transactions.coinbase);
console.log(`coinbase: ${coinbase} MINA`);  // "720.000000000 MINA"

const fee = Currency.fromMina('0.01');
const total = coinbase.add(fee);
```

### Error handling

```ts
import {
  ArchiveClient,
  ConnectionError,
  GraphqlError,
  HttpError,
  MissingFieldError,
} from '@o1-labs/mina-archive-sdk';

try {
  await client.getEvents({ address: 'B62q...' });
} catch (err) {
  if (err instanceof GraphqlError) {
    // Server-side validation, malformed query, etc. Not retried.
  } else if (err instanceof HttpError) {
    // A non-retryable status, thrown on the first attempt: every 4xx except
    // 429. `err.status` says which.
  } else if (err instanceof ConnectionError) {
    // Exhausted retries against a retryable failure — network, 5xx, 408 or a
    // 429 that kept coming back. Inspect `.cause`, which is the last
    // `HttpError` when the failure was an HTTP one.
  } else if (err instanceof MissingFieldError) {
    // Server returned an unexpected shape — likely a schema mismatch.
  }
}
```

#### Retries and rate limiting

Only **5xx, 408 and 429** are retried. Every other 4xx is a defect in the request, so it
is thrown as an `HttpError` on the first attempt instead of burning the retry budget —
a misconfigured URL now reports a 404 immediately rather than after three attempts.

HTTP 429 is the one status where retrying the identical request is correct: every
GraphQL-level error from this API arrives as HTTP 200 with a populated `errors` array,
so 429 is the only non-200 it emits under normal operation. The client honours the
server's own `retry-after` rather than its fixed `retryDelayMs`, waiting
`max(retryAfterSeconds, retryDelayMs)`.

`HttpError` carries the parsed body and the rate-limit headers:

```ts
if (err instanceof HttpError && err.isRateLimited) {
  err.retryAfterSeconds; // 37
  err.limit;             // 600
  err.remaining;         // 0
  err.errors;            // [{ message: '...', extensions: { code: 'RATE_LIMITED' } }]
}
```

Absent or malformed headers leave those fields `undefined`, so a missing header stays
distinguishable from a real `0`.

#### Contract error codes

Branch on `extensions.code`, never on message text — the server blocks GraphQL field
suggestions, so messages are deliberately minimal and carry no stability promise.

| `ErrorCode` | Value | Meaning |
| --- | --- | --- |
| `ErrorCode.BlockRangeError` | `BLOCK_RANGE_ERROR` | Range exceeds `BLOCK_RANGE_SIZE`. Narrow it; never retry unchanged. |
| `ErrorCode.ActionStateNotFound` | `ACTION_STATE_NOT_FOUND` | The action state is not in the archive. |
| `ErrorCode.ActionStateOutOfRange` | `ACTION_STATE_OUT_OF_RANGE` | The action state is outside the requested range. |
| `ErrorCode.RateLimited` | `RATE_LIMITED` | Too many requests. Back off. |

```ts
import { ErrorCode, GraphqlError } from '@o1-labs/mina-archive-sdk';

try {
  await client.getEvents({ address: 'B62q...' });
} catch (err) {
  if (err instanceof GraphqlError && err.hasCode(ErrorCode.BlockRangeError)) {
    // Halve the range and try again.
  }
}
```

All of these arrive as **HTTP 200** with a populated `errors` array;
`extensions.status` is a payload field, not the HTTP status. An `undefined` `code`
means no code was sent — the server masks unexpected errors, and those carry no
`extensions` at all — not that nothing went wrong.

#### Partial results

A response can legally carry **both** `data` and `errors`. The root lists and most of
their fields are nullable, so a field-level resolver error nullifies a sub-tree rather
than the whole response, and the rows that succeeded still arrive.

`getEvents` and friends still throw in that case — a partial result is not a success —
but the payload is attached to `GraphqlError.data` instead of being discarded. When the
server returns nine good event groups and one field-level error, this is the difference
between recovering the nine and losing them:

```ts
try {
  await client.getEvents({ address: 'B62q...' });
} catch (err) {
  if (err instanceof GraphqlError && err.hasPartialData) {
    const { events } = err.data as { events: EventOutput[] };
    // events holds the rows the server did return.
  }
}
```

`data` is `undefined` or `null` when the server sent none, which is a total failure
rather than a partial one — `hasPartialData` tells the two apart.

## Examples

```sh
ARCHIVE_GRAPHQL_URI=https://archive.example/ \
  npm run build && \
  node build/examples/network-state.js
```

See `examples/`:

- `events.ts` — query events for an address
- `actions.ts` — query actions for an address
- `blocks.ts` — get the latest canonical blocks with currency parsing
- `network-state.ts` — check archive sync state

## Version compatibility

The SDK exports the schema version it speaks:

```ts
import { SCHEMA_VERSION } from '@o1-labs/mina-archive-sdk';
// '2.0' — the Archive-Node-API schema major.minor
```

The Archive-Node-API server, its schema and this SDK share one major version.
**The SDK major equals the server major; same major = compatible.** A server
with a higher minor than `SCHEMA_VERSION` only adds features, which this SDK may
not wrap yet; everything the SDK does wrap keeps working. A different major is
not compatible.

Within that major, the package version is semver about the SDK's own surface:

| Part | Meaning |
| --- | --- |
| **Major** | Follows the server and schema major. |
| **Minor** | Additive: a new query, a new option, a new helper. |
| **Patch** | Fixes, docs, dependencies. |

### Migrating from 1.x to 2.0

2.0 speaks schema 2.0 and needs an Archive-Node-API 2.x server.

The list types are the same as in 1.x: `getEvents`, `getActions` and
`getBlocks` return `T[]`, and `EventData.data`, `ActionData.data` and
`TransactionInfo.zkappAccountUpdateIds` have non-null members. The 1.0 schema
declared these elements nullable while 1.x typed them non-null; schema 2.0 now
guarantees non-null elements, so the 1.x types are correct and code written
against them needs no null guards.

`getNetworkState` and `getVerificationKeyUpdates` are unchanged.

## Development

```sh
npm install
npm run build
npm run test:unit
```

Integration tests run against a live Archive-Node-API instance backed by the upstream `tests/integration/fixtures/archive_db.sql` fixture. CI does this in `.github/workflows/integration.yml`. To run locally, point `ARCHIVE_GRAPHQL_URI` at any Archive-Node-API server:

```sh
ARCHIVE_GRAPHQL_URI=http://localhost:8080/ npm run test:integration
```

## Schema sync

`schema.graphql` is vendored from `o1-labs/Archive-Node-API@main`. Two separate
guards keep this SDK honest about it, because they catch different failures:

**1. The vendored SDL matches upstream.** The `Schema Drift` workflow diffs the
two files weekly and on **every** PR. On drift, update `schema.graphql` and the
types in the same PR.

**2. The types match the vendored SDL.** `src/generated/schema-types.ts` is
generated from `schema.graphql` by `npm run codegen`; CI runs
`npm run codegen:check` on every PR and fails on any diff. Then
`src/generated/conformance.ts` asserts that every hand-written type in
`src/types.ts`, and every client method's return type, is *exactly* equal to
its generated counterpart. A type that drifts from the schema does not compile.

The second guard exists because the first one cannot see type drift at all: the
two schema files can be byte-identical while `src/types.ts` drifts from them.

Updating the schema:

```sh
# 1. refresh schema.graphql from upstream
npm run codegen        # 2. regenerate src/generated/schema-types.ts
npm run build          # 3. follow the conformance errors into src/types.ts
```

## License

Apache-2.0 — see [`LICENSE`](./LICENSE).
