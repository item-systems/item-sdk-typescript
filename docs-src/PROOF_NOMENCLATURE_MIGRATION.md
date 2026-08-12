# Proof nomenclature migration

## Canonical API

Use `proof` for ITEM authorization material. The deployed ITEM contract uses `proof` for both `authItem` and `purgeItem`.

```ts
await item.purgeItemSync({
  localNfid: 42,
  message: '00112233',
  proof: 'aabbccdd',
})
```

The SDK serializes `proof` to the unchanged third `purgeItem` contract argument. This is a naming alignment only; it does not change contract ABI order, byte encoding, or smartcard APDU bytes.

## Compatibility window

`signature` remains accepted as a deprecated `PurgeItem` input for the current major release:

```ts
await item.purgeItemSync({
  localNfid: 42,
  message: '00112233',
  signature: 'aabbccdd', // deprecated: migrate to proof
})
```

If both fields are supplied, they must have the same value. The SDK rejects conflicting values and rejects a payload that has neither field before creating an invocation.

## Smartcard action

The card action remains `SignCommand`: it cryptographically signs a supplied digest. Its output is exposed by the canonical `SignResponse.getProof()` accessor. `getSignature()` remains a deprecated compatibility alias returning the same raw DER bytes.

Use `signature` when referring specifically to DER/ECDSA encoding or cryptographic verification APIs such as `Utils.processDERSignature(...)` and `NdefDecodeType.validSignature`. Use `proof` when referring to ITEM authorization material submitted to auth, purge, or claim workflows.
