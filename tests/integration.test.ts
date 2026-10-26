/**
 * End-to-end integration test against a live `Archive-Node-API` server backed
 * by the static `archive_db.sql` fixture.
 *
 * Setup is owned by `.github/workflows/integration.yml` (Postgres service,
 * fixture load, server start). When ARCHIVE_GRAPHQL_URI is unset, the test
 * is skipped — keeps `npm run test:unit` runnable on a developer laptop
 * without infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ArchiveClient } from '../src/index.js';

const URI = process.env.ARCHIVE_GRAPHQL_URI;

const FIXTURE_ADDRESS =
  'B62qiaEMrWiYdK7LcJ2ScdMyG8LzUxi7yaw17XvBD34on7UKfhAkRML';

/** The single verification key in the upstream sample archive dump. */
const FIXTURE_VERIFICATION_KEY_HASH =
  '330109536550383627416201330124291596191867681867265169258470531313815097966';

/**
 * Fee payer, source and receiver of all 61 `user_commands` rows in the
 * upstream fixture (`public_keys.id = 66`), all in blocks below height 25.
 */
const FIXTURE_USER_COMMAND_ADDRESS =
  'B62qrCV2xfWipHVW7KvdKSqXVqbTJLs4oNGhuDp8Ag34vy57mN4pcEi';

if (!URI) {
  test('skip: ARCHIVE_GRAPHQL_URI not set', () => {
    assert.ok(true);
  });
} else {
  const client = new ArchiveClient(URI, { retries: 2, retryDelayMs: 1000 });

  test('networkState returns max block heights', async () => {
    // The upstream resolver used to crash when either the canonical or the
    // pending row was missing, and this test tolerated the resulting GraphQL
    // error. It now returns `{ maxBlockHeight: null }` for an empty archive
    // (network-service.ts), so the workaround is gone: a GraphQL error here
    // is a real failure. `null` remains a legal answer — the SDL types
    // maxBlockHeight nullable — so assert null-or-sane, not merely present.
    const state = await client.getNetworkState();

    if (state.maxBlockHeight === null) {
      return; // legal: the archive has indexed nothing
    }
    assert.ok(
      state.maxBlockHeight.canonicalMaxBlockHeight >= 0,
      'canonicalMaxBlockHeight non-negative',
    );
    assert.ok(
      state.maxBlockHeight.pendingMaxBlockHeight >= 0,
      'pendingMaxBlockHeight non-negative',
    );
    assert.ok(
      state.maxBlockHeight.pendingMaxBlockHeight >=
        state.maxBlockHeight.canonicalMaxBlockHeight,
      'canonical <= pending by definition',
    );
  });

  test('events query against fixture address returns array (zero rows is fine)', async () => {
    const events = await client.getEvents({
      address: FIXTURE_ADDRESS,
      status: 'CANONICAL',
    });
    assert.ok(Array.isArray(events));
  });

  test('actions query against fixture address returns array', async () => {
    const actions = await client.getActions({
      address: FIXTURE_ADDRESS,
      status: 'CANONICAL',
    });
    assert.ok(Array.isArray(actions));
  });

  test('blocks query returns the latest few canonical blocks', async () => {
    const blocks = await client.getBlocks({
      query: { canonical: true },
      limit: 3,
      sortBy: 'BLOCKHEIGHT_DESC',
    });
    assert.ok(Array.isArray(blocks));
    if (blocks.length > 1) {
      assert.ok(
        blocks[0].blockHeight >= blocks[1].blockHeight,
        'sortBy DESC honored',
      );
    }
  });

  test('verificationKeyUpdates query returns array (zero rows is fine)', async () => {
    const updates = await client.getVerificationKeyUpdates({
      verificationKeyHash: FIXTURE_VERIFICATION_KEY_HASH,
      from: 1,
      to: 1000,
    });
    assert.ok(Array.isArray(updates));
    for (const update of updates) {
      assert.equal(update.verificationKeyHash, FIXTURE_VERIFICATION_KEY_HASH);
    }
  });

  test('userCommands query returns the fixture account\'s commands', async () => {
    // Needs ENABLE_USER_COMMANDS_QUERY=true on the server, which
    // integration.yml sets; a stock server rejects the field.
    const commands = await client.getUserCommands({
      address: FIXTURE_USER_COMMAND_ADDRESS,
      from: 1,
      to: 1000,
    });
    assert.ok(commands.length > 0, 'the fixture holds 61 user commands');
    for (const command of commands) {
      assert.ok(command.blockInfo.height > 0);
      assert.ok(
        [command.feePayer, command.from, command.to].includes(
          FIXTURE_USER_COMMAND_ADDRESS,
        ),
        'the account is fee payer, source or receiver',
      );
    }
  });
}
