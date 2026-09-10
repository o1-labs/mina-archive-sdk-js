# @o1-labs/mina-archive-sdk

TypeScript / JavaScript SDK for [Mina Protocol's Archive Node](https://github.com/o1-labs/Archive-Node-API) GraphQL endpoint.

Companion to the daemon-targeting SDKs [`MinaProtocol/mina-sdk-rust`](https://github.com/MinaProtocol/mina-sdk-rust) / [`mina-sdk-go`](https://github.com/MinaProtocol/mina-sdk-go) / [`mina-sdk-python`](https://github.com/MinaProtocol/mina-sdk-python). This SDK targets the separate **archive** endpoint defined by [`o1-labs/Archive-Node-API`](https://github.com/o1-labs/Archive-Node-API) (events, actions, blocks, network state).

## Install

```sh
npm install @o1-labs/mina-archive-sdk
```

Requires Node ≥ 20.18.

## Quick start

```ts
import { ArchiveClient } from '@o1-labs/mina-archive-sdk';

const client = new ArchiveClient('https://archive.example/graphql');

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

## API

Each method on `ArchiveClient` maps 1:1 to a GraphQL query in the [Archive-Node-API schema](./schema.graphql):

| Method | Returns | Description |
| --- | --- | --- |
| `getEvents(input)` | `EventOutput[]` | Events emitted by a zkApp account, optionally filtered by block range and consensus status. |
| `getActions(input)` | `ActionOutput[]` | Actions dispatched from a zkApp account. |
| `getNetworkState()` | `NetworkStateOutput` | Archive's max canonical and pending block heights. |
| `getBlocks({ query?, limit?, sortBy? })` | `Block[]` | Blocks filtered by height/date range and chain status, with full transaction detail. |
| `getVerificationKeyUpdates(input)` | `VerificationKeyUpdate[]` | Applied account updates that set a given verification key, within a required block range. |
| `query(gql)` | builder | Run arbitrary GraphQL through the same retry path. |
| `executeQuery(gql, vars, name)` | `unknown` | Low-level escape hatch returning the raw `data` field. |

### Configuration

```ts
const client = new ArchiveClient('https://archive.example/graphql', {
  retries: 5,            // default: 3
  retryDelayMs: 10_000,  // default: 5_000
  timeoutMs: 60_000,     // default: 30_000
  headers: { 'x-api-key': process.env.API_KEY },
});
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
  } else if (err instanceof ConnectionError) {
    // Exhausted retries (network / 5xx). Inspect `.cause`.
  } else if (err instanceof MissingFieldError) {
    // Server returned an unexpected shape — likely a schema mismatch.
  }
}
```

## Examples

```sh
ARCHIVE_GRAPHQL_URI=https://archive.example/graphql \
  npm run build && \
  node build/examples/network-state.js
```

See `examples/`:

- `events.ts` — query events for an address
- `actions.ts` — query actions for an address
- `blocks.ts` — get the latest canonical blocks with currency parsing
- `network-state.ts` — check archive sync state

## Version compatibility

This SDK versions in lockstep with the [Archive-Node-API](https://github.com/o1-labs/Archive-Node-API) schema it speaks.

| Part | Meaning |
| --- | --- |
| **Major** | The schema major version. A breaking schema change moves both. |
| **Minor** | The schema minor version. A new query or argument moves both. |
| **Patch** | SDK-only changes — fixes, docs, dependencies. Independent of the server. |

So an SDK on `1.0.x` speaks the `1.0.x` schema, and matching the first two numbers is the whole compatibility check. The schema is additive within a major version, so an older SDK keeps working against a newer server; it simply cannot reach what was added after it.

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

`schema.graphql` is vendored from `o1-labs/Archive-Node-API@main`. The `Schema Drift` CI workflow compares them weekly and on PR; on drift, update both `schema.graphql` and `src/types.ts` in the same PR.

## License

Apache-2.0 — see [`LICENSE`](./LICENSE).
