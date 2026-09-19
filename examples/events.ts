/**
 * Query archived events for a zkApp account.
 *
 * Run:
 *   npm run build && node build/examples/events.js
 *
 * Set ARCHIVE_GRAPHQL_URI to point at your archive endpoint
 * (default: http://localhost:8080/).
 */

import { ArchiveClient } from '../src/index.js';

const client = new ArchiveClient(
  process.env.ARCHIVE_GRAPHQL_URI ?? 'http://localhost:8080/',
);

const events = await client.getEvents({
  address: process.env.MINA_ADDRESS ?? 'B62qiaEMrWiYdK7LcJ2ScdMyG8LzUxi7yaw17XvBD34on7UKfhAkRML',
  status: 'CANONICAL',
});

console.log(`got ${events.length} event group(s)`);
// `events` is `[EventOutput]!` in the SDL: the list is always present, but any
// element may be null, so guard each one.
for (const group of events.slice(0, 5)) {
  if (!group) {
    console.log('  (null event group)');
    continue;
  }
  const height = group.blockInfo?.height ?? '?';
  const count = group.eventData?.length ?? 0;
  console.log(`  block ${height}: ${count} event(s)`);
}
