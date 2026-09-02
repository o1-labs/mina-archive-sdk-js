/**
 * Hand-written GraphQL query strings.
 *
 * Each constant maps 1:1 to a query method on `ArchiveClient`. Field selections
 * cover the full schema surface — callers that want narrower selections can
 * use `client.query()` to send a custom query through the same retry path.
 */

export const EVENTS_QUERY = `
  query GetEvents($input: EventFilterOptionsInput!) {
    events(input: $input) {
      blockInfo {
        height
        stateHash
        parentHash
        ledgerHash
        chainStatus
        timestamp
        globalSlotSinceHardfork
        globalSlotSinceGenesis
        distanceFromMaxBlockHeight
      }
      eventData {
        accountUpdateId
        transactionInfo {
          status
          hash
          memo
          authorizationKind
          sequenceNumber
          zkappAccountUpdateIds
        }
        data
      }
    }
  }
`;

export const ACTIONS_QUERY = `
  query GetActions($input: ActionFilterOptionsInput!) {
    actions(input: $input) {
      blockInfo {
        height
        stateHash
        parentHash
        ledgerHash
        chainStatus
        timestamp
        globalSlotSinceHardfork
        globalSlotSinceGenesis
        distanceFromMaxBlockHeight
      }
      transactionInfo {
        status
        hash
        memo
        authorizationKind
        sequenceNumber
        zkappAccountUpdateIds
      }
      actionData {
        accountUpdateId
        transactionInfo {
          status
          hash
          memo
          authorizationKind
          sequenceNumber
          zkappAccountUpdateIds
        }
        data
      }
      actionState {
        actionStateOne
        actionStateTwo
        actionStateThree
        actionStateFour
        actionStateFive
      }
    }
  }
`;

export const NETWORK_STATE_QUERY = `
  query NetworkState {
    networkState {
      maxBlockHeight {
        canonicalMaxBlockHeight
        pendingMaxBlockHeight
      }
    }
  }
`;

export const BLOCKS_QUERY = `
  query GetBlocks($query: BlockQueryInput, $limit: Int, $sortBy: BlockSortByInput) {
    blocks(query: $query, limit: $limit, sortBy: $sortBy) {
      blockHeight
      creator
      stateHash
      parentHash
      dateTime
      transactions {
        coinbase
        userCommands {
          hash
          kind
          from
          to
          amount
          fee
          memo
          nonce
          status
          failureReason
        }
        zkappCommands {
          hash
          feePayer
          fee
          memo
          status
          failureReason
        }
        feeTransfer {
          recipient
          fee
          type
        }
      }
    }
  }
`;

export const VERIFICATION_KEY_UPDATES_QUERY = `
  query GetVerificationKeyUpdates($input: VerificationKeyUpdateFilterInput!) {
    verificationKeyUpdates(input: $input) {
      accountUpdateId
      address
      tokenId
      verificationKeyHash
      blockInfo {
        height
        stateHash
        parentHash
        ledgerHash
        chainStatus
        timestamp
        globalSlotSinceHardfork
        globalSlotSinceGenesis
        distanceFromMaxBlockHeight
      }
      transactionInfo {
        status
        hash
        memo
        authorizationKind
        sequenceNumber
        zkappAccountUpdateIds
      }
    }
  }
`;
