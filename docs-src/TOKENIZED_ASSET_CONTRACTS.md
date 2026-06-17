# Tokenized Asset Contract Workflows

Several SDK methods bridge from ITEM records to the tokenized asset contract bound to an epoch.

All literal script hashes, token ids, public keys, auth payloads, and account strings shown below are placeholders unless explicitly noted otherwise.

## Why this matters

An ITEM record stores enough information to locate the associated tokenized asset contract and token id. The SDK uses that linkage to expose convenience methods that would otherwise require multiple manual lookups.

## Lookup methods

### `getItemWithTac`
Map a remote token reference back to the ITEM record.

```ts
const record = await item.getItemWithTac({
  scriptHash: '0x1234...',
  tokenId: 'a1b2c3d4',
})
```

### `ownerOf`
Resolve the owner from the bound tokenized asset contract.

```ts
const owner = await item.ownerOf({ localNfid: 42 })
```

### `tokenProperties` / `tokenPropertiesWithNfid`
Read token-level properties from the bound tokenized asset contract.

```ts
const byKey = await item.tokenProperties({ pubKey: '03abc123...' })
const byItem = await item.tokenPropertiesWithNfid({ localNfid: 42 })
```

## Ownership enumeration

### `itemsOf`
Enumerate remote tokens owned by an address across discovered epoch binding contracts.

```ts
const tokens = await item.itemsOf({
  address: 'NXYZ...',
})
```

Implementation note: this helper currently discovers epoch contracts and scans them sequentially. It is convenient, but not a substitute for a dedicated indexer if you need low latency or large-scale pagination.

## Claimability

### `isClaimable` / `isClaimableWithNfid`
Check claimability against the bound tokenized asset contract.

```ts
const claimableByKey = await item.isClaimable({ pubKey: '03abc123...' })
const claimableByItem = await item.isClaimableWithNfid({ localNfid: 42 })
```

## Claim execution

### `claimItem` / `claimItemSync`
Submit or synchronously resolve a claim against the bound tokenized asset contract.

```ts
const txid = await item.claimItem({
  pubKey: '03abc123...',
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  },
})
```

```ts
const ok = await item.claimItemSync({
  pubKey: '03abc123...',
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  },
  receiverAccount: 'NXYZ...',
})
```

## Integration guidance

- Treat `binding_script_hash` and `binding_token_id` as the bridge between ITEM and the remote token contract.
- If your app already tracks remote contracts directly, `getItemWithTac` is the cleanest way back into ITEM records.
- Prefer `ownerOf` over manually reconstructing the token contract call unless you need custom batching.
