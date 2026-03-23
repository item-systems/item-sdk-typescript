# Architecture, Data Model, and Lifecycle

This guide explains how the SDK maps ITEM concepts into application-facing types and workflows.

## Mental model

The SDK is centered on the `Item` class.

`Item` is a high-level facade over:

- the ITEM smart contract on Neo N3
- the tokenized asset contracts bound to ITEM epochs
- helper utilities for polling, key handling, and NDEF/auth processing
- optional smartcard transports and secure-channel helpers

## Layering

At a high level, the package is organized into these layers:

1. **Public facade**
   - `Item`
   - exported `types`
   - exported `constants`
   - exported `Utils`

2. **Contract API wrappers**
   - Neo N3 application/admin/item/user/epoch/configuration/asset modules

3. **Helpers**
   - transaction polling
   - iterator handling
   - key and NDEF utilities
   - deployment helpers

4. **Smartcard support**
   - APDU helpers
   - reader abstraction
   - secure-channel implementation
   - desktop and mock transports

## Core domain objects

## User

Represents an ITEM user record.

```ts
interface UserType {
  id: number
  address: WalletAccount
}
```

Use cases:

- map an on-chain address to an ITEM-local user id
- attach and read user properties

## Epoch

Represents a grouping/configuration boundary for items and their tokenized asset contract binding.

```ts
interface EpochType {
  id: number
  vendor: number
  binding_script_hash: string
}
```

Why it matters:

- an epoch identifies the bound tokenized asset contract
- item claim and ownership helpers depend on this binding relationship

## Item

Represents the ITEM-native record for a non-fungible item.

```ts
interface ItemType {
  id: number
  epoch: EpochType
  seed: string
  state: string
  binding_token_id: string
  assets: number[]
}
```

Why it matters:

- `id` is the ITEM-native identifier (`localNfid`)
- `epoch.binding_script_hash` plus `binding_token_id` bridge into the remote tokenized asset contract
- `assets` links to associated asset records

## Asset

Represents the ITEM-side asset binding and auth material.

```ts
interface AssetType {
  id: number
  configuration: number
  item: number
  public_key: string
  active: boolean
  elliptic_curve: number
  purge_heights: {
    ils: number
    htls: number
  }
}
```

Why it matters:

- the public key is often the application's starting point for lookup and auth flows
- purge heights affect replay/invalidation semantics
- `configuration` links the asset back to provisioning/manufacturing state

## Configuration

Represents configuration state used during binding/provisioning.

```ts
interface ConfigurationType {
  id: number
  manufacturer: number
}
```

## Property maps

Many reads return a `PropertyMap`:

```ts
type PropertyMap = Record<string, string>
```

Interpretation:

- keys are property ids encoded as hex strings
- values are property states encoded as hex strings
- decoding into business meaning is application-specific unless your organization has a shared property catalog

## Relationship map

The most important relationships are:

- **user** ↔ address
- **epoch** ↔ tokenized asset contract (`binding_script_hash`)
- **item** ↔ epoch + token id (`binding_token_id`)
- **item** ↔ assets
- **asset** ↔ public key + configuration

## Lifecycle map

A typical item lifecycle looks like this:

1. supporting records exist, including epoch/configuration
2. item is created in an epoch
3. item is bound to a configuration and public key, producing an asset relationship
4. item can be queried by local id, key, or remote token reference
5. auth and claim workflows operate against the bound asset/item state
6. item may be locked or purged depending on operational needs

## Read path vs write path

## Read path

Read methods:

- execute contract reads
- parse results into SDK types
- return immediately without chain mutation

Examples:

- `getItem()`
- `getEpoch()`
- `getAsset()`
- `ownerOf()`

## Write path

Write methods:

- build and submit an invocation
- depend on a signing-capable invoker/account
- either return a txid or wait for the application log in `*Sync` form

Examples:

- `createItem()` / `createItemSync()`
- `bindItem()` / `bindItemSync()`
- `authItem()` / `authItemSync()`
- `claimItem()` / `claimItemSync()`

## Cross-contract boundary

The most important architectural boundary in the SDK is the one between:

- the ITEM contract, and
- the tokenized asset contract bound to an epoch

Methods such as these cross that boundary:

- `getItemWithTac()`
- `tokenProperties()`
- `tokenPropertiesWithNfid()`
- `itemsOf()`
- `isClaimable()`
- `isClaimableWithNfid()`
- `claimItem()`
- `ownerOf()`

This is why production systems often need both:

- ITEM-aware application logic, and
- a token/indexing layer for search, pagination, and historical views

## Authentication model

Auth flows revolve around `AuthPayload`:

```ts
interface AuthPayload {
  message: string
  proof: string
  challenge: AuthChallenge
}
```

Important implications:

- `message` and `proof` are hex strings
- challenge type changes validation semantics
- `burn` in auth/claim flows affects replay behavior and should be treated as a business decision, not just a technical flag

## Initialization architecture

`Item.init()` can operate in three common modes:

### 1. SDK-managed defaults

Pass only `node`, or nothing at all, for simple read paths.

### 2. Account-backed default invoker

Pass `account` when you want the SDK to create the default Neon-based invoker for signed writes.

### 3. Fully custom integration

Pass your own `invoker`, `listener`, and optional `parser` when your application already owns wallet/session lifecycle.

## Smartcard architecture

The smartcard portion of the package is intentionally separable from the core contract facade.

Use it when your integration needs:

- APDU construction/parsing
- reader abstraction
- secure-channel workflows
- desktop or mock transports

Keep this separate from your chain orchestration layer so you can test device logic and chain logic independently.

## Production architecture recommendation

For serious integrations, split responsibilities across components:

- **device/session layer**: card or interface communication
- **backend relayer**: signing and transaction submission
- **indexer/cache**: search, pagination, reconciliation
- **operator/admin tooling**: upgrades, purge, sensitive property changes

That separation keeps your UI thin and reduces the blast radius of signer access.
