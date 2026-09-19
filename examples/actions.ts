/**
 * Query archived actions for a zkApp account.
 */

import { ArchiveClient } from '../src/index.js';

const client = new ArchiveClient(
  process.env.ARCHIVE_GRAPHQL_URI ?? 'http://localhost:8080/',
);

const actions = await client.getActions({
  address: process.env.MINA_ADDRESS ?? 'B62qiaEMrWiYdK7LcJ2ScdMyG8LzUxi7yaw17XvBD34on7UKfhAkRML',
  status: 'CANONICAL',
});

console.log(`got ${actions.length} action group(s)`);
// `actions` is `[ActionOutput]!` in the SDL: the list is always present, but any
// element may be null, so guard each one.
for (const group of actions.slice(0, 5)) {
  if (!group) {
    console.log('  (null action group)');
    continue;
  }
  const height = group.blockInfo?.height ?? '?';
  const count = group.actionData?.length ?? 0;
  console.log(`  block ${height}: ${count} action(s)`);
}
