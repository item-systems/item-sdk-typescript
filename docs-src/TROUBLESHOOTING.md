# Troubleshooting and Error Handling

This guide focuses on the failures integrators are most likely to hit in real deployments.

## Failure domains

Most issues fall into one of these buckets:

1. **Initialization/configuration**
2. **RPC/network availability**
3. **Authorization/signing**
4. **Input encoding and parameter shape**
5. **Async transaction timing**
6. **Cross-contract tokenized asset lookups**
7. **Smartcard / transport availability**

## Symptom: `Item.init()` succeeds, but writes fail later

### Likely causes

- the SDK was initialized without `account`
- a custom `invoker` does not support the required signing path
- the signer is present but not authorized by the contract

### What to check

- Did you pass `account` or a signing-capable `invoker`?
- Are you targeting the expected network and contract deployment?
- Does the signer have the required on-chain permissions for the operation?

### Recommended fix

Use a signed initialization path for all write operations:

```ts
const item = await Item.init({
  node: constants.NeoN3NetworkOptions.TestNet,
  account,
})
```

Then verify permissions with a low-risk write in a test environment before attempting production mutations.

## Symptom: a write method returns a txid, but the expected state never appears

### Why this happens

Submission methods return the transaction id after broadcast. They do not guarantee that the transaction executed successfully.

### What to do

- use the corresponding `*Sync` method when possible, or
- poll the application log using `Utils.transactionCompletion()` and inspect the result

```ts
const txid = await item.createConfiguration()
const log = await Utils.transactionCompletion(txid, {
  node: constants.NeoN3NetworkOptions.TestNet,
  period: 500,
  timeout: 30_000,
})

console.log(log)
```

## Symptom: `*Sync` methods time out

### Likely causes

- RPC endpoint is slow or unavailable
- timeout is too short for current network conditions
- transaction was never accepted or never reached the expected chain

### What to check

- verify the RPC endpoint manually
- increase the timeout
- confirm you are polling the same network you submitted to
- inspect whether the txid exists on-chain

### Recommended fix

Pass a larger timeout and explicitly set the same node for both submission and polling.

## Symptom: `isAuthValid()` returns `valid: false`

### Likely causes

- wrong `localNfid`
- malformed `message` or `proof`
- wrong challenge type
- stale or already-burned proof material
- public key / item binding mismatch

### What to check

- confirm the auth payload was decoded correctly
- confirm the challenge enum matches the device flow you executed
- verify whether a prior auth or purge invalidated the payload
- verify you are validating against the intended item

### Recommended fix

Log and inspect the exact payload values before submission. In production, store enough request metadata to reproduce the validation attempt without storing secrets unnecessarily.

## Symptom: `claimItem()` fails even though the item exists

### Likely causes

- the item is not currently claimable
- auth payload is invalid for the claim path
- receiver account is malformed or not accepted
- the bound tokenized asset contract is not the one you expected

### What to check

- run `isClaimable()` or `isClaimableWithNfid()` first
- inspect the item's `epoch.binding_script_hash` and `binding_token_id`
- verify the receiver account format
- verify the auth challenge/proof pair

## Symptom: `ownerOf()` or `tokenProperties*()` fails for some items

### Likely causes

- the item is linked to a tokenized asset contract that is unavailable from the current RPC node
- the item has incomplete or unexpected binding state
- the remote token contract behavior differs from your assumptions

### What to check

- inspect `getItem()` output first
- verify `epoch.binding_script_hash` and `binding_token_id`
- test the remote contract independently if needed

## Symptom: `getItemWithKey()` or `getAssetWithKey()` does not find the expected record

### Likely causes

- public key formatting mismatch
- compressed vs uncompressed key confusion
- wrong item/asset lifecycle stage

### What to check

- validate the key with `Utils.isPublicKey()`
- normalize encoding with `Utils.encodePublicKey()` if your upstream source is inconsistent
- verify the item was actually bound to that key

## Symptom: property reads look wrong or empty

### Likely causes

- wrong object id (`localUid`, `localNfid`, `localEid`, `localCid`)
- property id encoded incorrectly
- the property has never been set

### What to check

- confirm the local id exists
- confirm `globalPid` is the expected hex string
- inspect the raw object and related lifecycle state

## Symptom: `itemsOf()` is slow for large accounts

### Why this happens

`itemsOf()` is a convenience helper that discovers and scans bound tokenized asset contracts. That is useful for application logic and low-volume tooling, but it is not optimized as a high-scale account index.

### Recommended fix

Use `itemsOf()` for correctness and bootstrap logic, then move repeated wallet/account views onto your own indexed cache.

## Symptom: smartcard code works in tests but not on a target machine

### Likely causes

- optional `pcsc-mini` dependency is unavailable on the machine
- no compatible reader is attached
- desktop transport permissions or runtime support differ

### What to check

- confirm the environment supports the selected transport
- isolate transport initialization from business logic
- use the mock transport in deterministic tests

## Error-handling recommendations

## 1. Separate submission errors from execution errors

Treat these as different classes:

- **submission error**: RPC/signing/broadcast failed, no reliable tx lifecycle began
- **execution error**: transaction broadcast succeeded, but on-chain execution did not produce the expected result

## 2. Log stable identifiers

At minimum, capture:

- network / RPC endpoint
- script hash when overridden
- method name
- local ids (`localNfid`, `localCid`, etc.)
- txid for writes
- challenge type for auth flows

## 3. Avoid over-retrying writes blindly

A retry may create duplicate or conflicting attempts. Prefer idempotent application orchestration around a stored txid and explicit operator review for sensitive flows.

## 4. Prefer preflight checks

Examples:

- `isAuthValid()` before `authItem()`
- `isClaimable()` before `claimItem()`
- `getItem()` before `ownerOf()`

## 5. Build a support playbook

For production support, keep a standard checklist:

1. confirm network and RPC
2. confirm contract script hash
3. confirm signer identity and permissions
4. confirm exact input payload
5. inspect txid / application log
6. verify post-state with read methods
