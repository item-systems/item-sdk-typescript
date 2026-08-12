# Workflow Playbooks

This guide turns the raw API surface into end-to-end integration flows.

All literal ids, public keys, auth payloads, script hashes, and account strings in code snippets are illustrative placeholders unless explicitly noted otherwise.

Use it when you know the business task you need to complete, but not yet which SDK methods to combine.

## Before you start

Decide which integration mode you need:

- **Read-only mode**: query ITEM state without signing transactions.
- **Signed mode**: publish state-changing transactions to the ITEM contract or a bound tokenized asset contract.
- **Managed-wallet mode**: provide your own `invoker`, `listener`, and optional `parser` if your application already owns session and signing behavior.

Also decide whether each write path should use:

- **submission methods** such as `createItem()` or `claimItem()` when your app already tracks pending transactions, or
- **`*Sync` methods** such as `createItemSync()` or `claimItemSync()` when you want the SDK to wait for the application log and parse the result.

## Playbook 1: Read-only item lookup

Use this flow for dashboards, search pages, support tooling, and indexer verification.

### Typical sequence

1. Initialize the SDK against the correct RPC endpoint.
2. Resolve the item by local ITEM id, public key, or remote token reference.
3. Read related properties and linked objects.
4. Optionally resolve token ownership from the bound tokenized asset contract.

### Example

```ts
import { Item, constants } from '@item-systems/item'

const item = await Item.init({
  node: constants.NeoN3NetworkOptions.MainNet,
})

const record = await item.getItem({ localNfid: 42 })
const props = await item.getItemProperties({ localNfid: 42 })
const owner = await item.ownerOf({ localNfid: 42 })

console.log({ record, props, owner })
```

### Good fit

- explorer-style UIs
- support/admin read tools
- reconciliation against an external indexer
- preflight checks before a write flow

## Playbook 2: Signed property update

Use this when an authorized account must update ITEM-managed state such as item, user, epoch, or configuration properties.

### Typical sequence

1. Create a signer account.
2. Initialize `Item` with `account` or your own `invoker`.
3. Submit a property mutation.
4. Either store the returned `txid` or use the `*Sync` variant to wait for completion.

### Example

```ts
import { Item, constants } from '@item-systems/item'
import { wallet } from '@cityofzion/neon-js'

const account = new wallet.Account(process.env.NEO_PRIVATE_KEY!)

const item = await Item.init({
  node: constants.NeoN3NetworkOptions.TestNet,
  account,
})

const ok = await item.setItemPropertySync(
  {
    localNfid: 42,
    globalPid: '01',
    state: '01',
  },
  30_000,
)

console.log({ ok })
```

### Notes

- Authorization is enforced by the contract, not by the SDK.
- A successful transaction submission does not guarantee the state transition succeeded; use `*Sync` or inspect the application log.
- Property ids and property states are hex strings. Validate your encoding before publishing.

## Playbook 3: Create and bind an item

Use this when provisioning a new item into an epoch and then binding it to an asset/configuration/public key.

### Typical sequence

1. Ensure the target epoch and configuration already exist.
2. Create the item using the target epoch id and binding token id.
3. Bind the item to a configuration and public key.
4. Confirm the resulting item and asset state.

### Example

```ts
const localNfid = await item.createItemSync({
  localEid: 7,
  bindingTokenId: '01',
})

const localAsid = await item.bindItemSync({
  localNfid,
  localCid: 3,
  pubKey: '03abc123...',
  assetEllipticCurve: constants.NeoN3EllipticCurves.SECP256R1SHA256,
})

const boundItem = await item.getItem({ localNfid })
const asset = await item.getAsset({ localAsid })

console.log({ localNfid, localAsid, boundItem, asset })
```

### Operational advice

- Persist both the returned local ITEM id and the returned local asset id.
- Verify the bound public key format before submitting.
- If your manufacturing/provisioning flow is high volume, prefer asynchronous submission plus your own transaction tracker.

## Playbook 4: Off-chain auth preflight and on-chain auth

Use this when your application obtains an auth payload from an ITEM interface and wants to validate it before committing an on-chain action.

### Typical sequence

1. Acquire or decode an auth payload.
2. Run `verifyAuth()` as a preflight check.
3. If valid, submit `authItem()` or `authItemSync()`.
4. Decide whether the proof should be burned.

### Example

```ts
import { types } from '@item-systems/item'

const auth = {
  message: '00112233',
  proof: 'aabbccdd',
  challenge: types.AuthChallenge.ILS_PERMISSIVE,
}

const preflight = await item.verifyAuth({
  localNfid: 42,
  auth,
})

if (!preflight.valid) {
  throw new Error('Authentication payload is not valid for this item')
}

const ok = await item.authItemSync({
  localNfid: 42,
  auth,
  burn: false,
})

console.log({ ok })
```

### Burn semantics

`burn: true` is stronger and safer against replay, but it also makes the proof single-use. Only enable it when your product flow expects one-time authentication.

## Playbook 5: Claim a tokenized asset

Use this when a valid auth payload should result in a claim on the tokenized asset contract bound to the item's epoch.

### Typical sequence

1. Resolve the item by `pubKey` or `localNfid`.
2. Check claimability with `isClaimable()` or `isClaimableWithNfid()`.
3. Submit `claimItem()` or `claimItemSync()`.
4. Verify ownership with `ownerOf()` or your own token indexer.

### Example

```ts
const claimable = await item.isClaimable({
  pubKey: '03abc123...',
})

console.log({ claimable })

const claimed = await item.claimItemSync({
  pubKey: '03abc123...',
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  },
  receiverAccount: 'NXYZ...',
})

console.log({ claimed })
```

### Notes

- Claim execution crosses from the ITEM contract into the bound tokenized asset contract.
- If your product already tracks remote token contracts directly, treat ITEM as the source of the binding relationship and your indexer as the source of user-facing pagination.

## Playbook 6: Purge an item challenge state

Use this when previous challenge material must be invalidated.

### Typical sequence

1. Obtain the correct purge message/signature pair.
2. Submit `purgeItem()` or `purgeItemSync()`.
3. Re-run validation to confirm old proof material is no longer accepted.

### Example

```ts
const ok = await item.purgeItemSync({
  localNfid: 42,
  message: '00112233',
  signature: 'aabbccdd',
})

console.log({ ok })
```

### Caution

Treat purge as a state-reset or invalidation operation. Build explicit operator confirmation into your application flow before exposing it in admin tooling.

## Playbook 7: Enumerate ownership across tokenized asset contracts

Use this for wallet views and account dashboards.

### Typical sequence

1. Call `itemsOf({ address })`.
2. Resolve the returned remote token references into ITEM records if needed.
3. Cache or index results if you need low-latency repeated access.

### Example

```ts
const tokens = await item.itemsOf({
  address: 'NXYZ...',
})

for (const token of tokens) {
  const record = await item.getItemWithTac(token)
  console.log({ token, record })
}
```

### Scaling note

`itemsOf()` is convenient, but it is not a replacement for a dedicated production indexer when you need pagination, historical views, or large account scans.

## Playbook 8: Contract administration and upgrade

Use this only in controlled operator/admin flows.

### Typical sequence

1. Prepare the compiled script, manifest, and deployment data.
2. Initialize with an account authorized to update the contract.
3. Submit `update()` or `updateSync()`.
4. Re-run smoke tests against reads and critical writes.

### Example

```ts
const txid = await item.update({
  script: nefHex,
  manifest: manifestJson,
  data: null,
})

console.log({ txid })
```

### Operational advice

- Treat upgrades as release events with rollback planning.
- Capture pre-upgrade and post-upgrade smoke-test evidence.
- Do not combine upgrade execution with unrelated application writes in the same operator session.

## Choosing between lookup keys

Use the lookup key that matches your system of record:

- `localNfid` when your app stores ITEM-native ids.
- `pubKey` when your app starts from device/card material.
- `{ scriptHash, tokenId }` when your app starts from the tokenized asset contract side.

## Recommended application architecture

For production systems, separate responsibilities:

- **frontend**: collect user intent and show status
- **backend/relayer**: own signing policy, transaction submission, retries, and audit logs
- **indexer/cache**: support search, pagination, and historical views
- **operator tooling**: isolate admin and upgrade paths from end-user flows
