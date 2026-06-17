# Utils

The package exports a `Utils` helper class for common integration tasks.

## `Utils.transactionCompletion(txid, opts?)`

Poll for a transaction application log.

```ts
const log = await Utils.transactionCompletion(txid, {
  node: constants.NeoN3NetworkOptions.TestNet,
  period: 500,
  timeout: 30_000,
})
```

Notes:
- default polling node is local RPC (`http://127.0.0.1:50012`)
- override `node` in non-local environments

## `Utils.deployContract(node, networkMagic, nefRaw, manifestRaw, signer)`

Deploy a Neo contract using Neon helpers.

```ts
const txid = await Utils.deployContract(node, networkMagic, nefBuffer, manifestJson, account)
```

## `Utils.decodeNDEF(data)`

Decode ITEM NDEF payloads and validate the embedded signature when possible.

```ts
const decoded = Utils.decodeNDEF(payload)
console.log(decoded.validSignature)
console.log(decoded.pubKey)
```

Returns `NdefDecodeType`:
- `validSignature`
- `uriPubKey`
- `pubKeyUnencoded`
- `pubKey`
- `message`
- `proof`

## `Utils.encodePublicKey(pubKey)`

Convert a hex public key into the URI-safe encoding used by ITEM payloads.

## `Utils.processDERSignature(sigBytes)`

Normalize a DER-encoded signature into the concatenated form expected by other helpers.

## `Utils.isPublicKey(key, encoded?)`

Validate whether a string is a public key and optionally constrain whether it must be encoded or unencoded.

## `Utils.numToHexComplement(x)`

Convert an integer to the hex-formatted two's-complement representation used in some on-chain lookups.

```ts
const tokenId = Utils.numToHexComplement(42)
```

## Lower-level invocation helpers

The class also exposes internal-useful helpers:
- `testInvokerRaw`
- `testInvoker`
- `handlePropertyIterator`
- `handleIterator`
- `sleep`

These are useful for advanced integrations, but most application code should start with the higher-level `Item` methods.
