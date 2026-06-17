# Authentication

This SDK exposes both off-chain validation and on-chain authentication workflows.

All literal ids, public keys, accounts, messages, and proofs shown below are placeholders unless explicitly noted otherwise.

## Core types

```ts
import { types } from '@item-systems/item'
```

Relevant types:
- `types.AuthPayload`
- `types.AuthItem`
- `types.IsAuthValid`
- `types.ClaimItem`
- `types.AuthChallenge`

`AuthPayload` contains:
- `message: string` — hex challenge payload
- `proof: string` — hex proof/signature payload
- `challenge: AuthChallenge`

## Challenge values

The package exports the same challenge values in two places:
- `types.AuthChallenge`
- `constants.Challenges`

Available values:
- `ILS_PERMISSIVE`
- `ILS_RESTRICTIVE`
- `HTLS_PERMISSIVE`
- `HTLS_RESTRICTIVE`

## Off-chain validation: `isAuthValid`

Use `isAuthValid` when you want to test whether a payload would pass without publishing a transaction.

```ts
const result = await item.isAuthValid({
  localNfid: 42,
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.ILS_PERMISSIVE,
  },
})

console.log(result.valid)
```

This is useful for:
- preflight checks in an application flow
- debugging challenge/proof formatting
- reducing unnecessary writes

## On-chain authentication: `authItem` / `authItemSync`

Use `authItem` to submit the transaction and receive a txid:

```ts
const txid = await item.authItem({
  localNfid: 42,
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.HTLS_RESTRICTIVE,
  },
  burn: false,
})
```

Use `authItemSync` when you want the parsed boolean result:

```ts
const ok = await item.authItemSync({
  localNfid: 42,
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    challenge: types.AuthChallenge.HTLS_RESTRICTIVE,
  },
  burn: false,
})
```

## Claim flow

`claimItem` and `claimItemSync` operate against the tokenized asset contract associated with the item's epoch.

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

## Purge flow

`purgeItem` invalidates prior proofs for the item.

```ts
const ok = await item.purgeItemSync({
  localNfid: 42,
  message: '00112233',
  signature: 'aabbccdd',
})
```

## Formatting notes

- Message and proof fields are hex strings.
- Public keys should match the format expected by the called method.
- Contract authorization still applies; a valid payload does not bypass permissions.
- `burn` changes authentication semantics and should be chosen intentionally.

## Related helpers

- `Utils.decodeNDEF(...)`
- `Utils.processDERSignature(...)`
- `Utils.isPublicKey(...)`
- `Utils.encodePublicKey(...)`
