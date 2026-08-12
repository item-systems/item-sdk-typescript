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
- `proof: string` — hex authorization proof payload
- `challenge?: AuthChallenge` — optional; defaults to `ILS_PERMISSIVE` when omitted
- `structure?: string` — optional marker for off‑chain payload provenance/format (not sent on‑chain)

## Challenge values

The package exports the same challenge values in two places:
- `types.AuthChallenge`
- `constants.Challenges`

Available values:
- `ILS_PERMISSIVE`
- `ILS_RESTRICTIVE`
- `HTLS_PERMISSIVE`
- `HTLS_RESTRICTIVE`

## Read-only verification: `verifyAuth`

Use `verifyAuth` when you want to test whether a payload would pass without publishing a transaction. The SDK calls the
contract's `authItem` operation through `testInvoke`, always forces `burn: false`, and normalizes the contract boolean to
`{ valid: boolean }`.

```ts
const result = await item.verifyAuth({
  localNfid: 42,
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    structure: 'item-auth-v1', // optional application metadata; not sent on-chain
    // challenge omitted -> defaults to ILS_PERMISSIVE
  },
})

console.log(result.valid)
```

This is useful for:
- preflight checks in an application flow
- debugging challenge/proof formatting
- reducing unnecessary writes

`isAuthValid` remains available as a deprecated compatibility alias and returns the same structured result:

```ts
const result = await item.isAuthValid({ localNfid: 42, auth })
```

## On-chain authentication: `authItem` / `authItemSync`

Use `authItem` to submit the transaction and receive a txid:

```ts
const txid = await item.authItem({
  localNfid: 42,
  auth: {
    message: '00112233',
    proof: 'aabbccdd',
    // challenge omitted -> defaults to ILS_PERMISSIVE
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
    // challenge omitted -> defaults to ILS_PERMISSIVE
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
    // challenge omitted -> defaults to ILS_PERMISSIVE
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
  proof: 'aabbccdd',
})
```

## Challenge-byte ABI behavior

- `message` and `proof` are hex-encoded byte payloads.
- The ITEM contract reverses **message** bytes before converting them to an integer for ILS/HTLS policy checks. Preserve the message bytes exactly as captured by the device/NDEF payload; do not pre-reverse them in application code.
- Challenge selectors are one-byte ABI values: `01` (`ILS_PERMISSIVE`), `02` (`ILS_RESTRICTIVE`), `03` (`HTLS_PERMISSIVE`), and `04` (`HTLS_RESTRICTIVE`).
- The SDK retains its historical challenge-selector reversal immediately before encoding. Because every currently supported selector is exactly one byte, the serialized value is unchanged. This compatibility transform is distinct from the contract's message-byte interpretation.
- `purgeItem` accepts canonical `proof`. The legacy `signature` input remains a deprecated compatibility alias for the current major version; do not supply both with different values.
- Public keys should match the format expected by the called method.
- Contract authorization still applies; a valid payload does not bypass permissions.
- `burn` changes authentication semantics and should be chosen intentionally.
- If you need a non-default challenge mode, set `auth.challenge` explicitly.

## Related helpers

- `Utils.decodeNDEF(...)`
- `Utils.processDERSignature(...)`
- `Utils.isPublicKey(...)`
- `Utils.encodePublicKey(...)`
