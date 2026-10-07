/**
 * Query a range of blocks. Demonstrates the `Currency` helper for parsing
 * coinbase / fee amounts that the archive returns as nanomina strings.
 */

import { ArchiveClient, Currency } from '../src/index.js';

const client = new ArchiveClient(
  process.env.ARCHIVE_GRAPHQL_URI ?? 'http://localhost:8080/',
);

const blocks = await client.getBlocks({
  query: { canonical: true },
  limit: 5,
  sortBy: 'BLOCKHEIGHT_DESC',
});

console.log(`got ${blocks.length} block(s)`);
for (const block of blocks) {
  const coinbase = Currency.fromGraphql(block.transactions.coinbase);
  console.log(
    `  block ${block.blockHeight} by ${block.creator.slice(0, 12)}…  coinbase=${coinbase} MINA  (${block.transactions.userCommands.length} user commands)`,
  );
}
