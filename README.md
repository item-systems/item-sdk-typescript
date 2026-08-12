<p align="center">
  <img
    src="https://assets-global.website-files.com/65082d98418d032204fbd975/6511aa0e627929e14dbcf5c4_itemSystems%20logo.svg"
    width="200px;"
    alt="ITEM Systems logo"
  />
</p>

<h1 align="center">ITEM SDK</h1>

<p align="center">
  TypeScript SDK for interacting with ITEM smart contracts, tokenized asset contracts, and ITEM authentication workflows on Neo N3.
</p>

## Documentation

- Developer portal: [docs.item.systems](https://docs.item.systems)
- SDK docs: [docs.item.systems/sdk/ts](https://docs.item.systems/sdk/ts/)
- Local API docs: run `npm run docs`
- Docs index: [docs-src/DOCS_INDEX.md](docs-src/DOCS_INDEX.md)

### Recommended guides

- [Workflow playbooks](docs-src/WORKFLOW_PLAYBOOKS.md)
- [Architecture, data model, and lifecycle](docs-src/ARCHITECTURE_AND_DATA_MODEL.md)
- [Authentication](docs-src/AUTHENTICATION.md)
- [Proof nomenclature migration](docs-src/PROOF_NOMENCLATURE_MIGRATION.md)
- [Tokenized asset contract workflows](docs-src/TOKENIZED_ASSET_CONTRACTS.md)
- [Troubleshooting and error handling](docs-src/TROUBLESHOOTING.md)
- [Security and production integration guidance](docs-src/SECURITY_AND_PRODUCTION_GUIDANCE.md)
- [Environments, compatibility, and setup](docs-src/ENVIRONMENTS_AND_COMPATIBILITY.md)
- [API overview](docs-src/API_OVERVIEW.md)
- [Utils](docs-src/UTILS.md)
- [Examples](examples/README.md)

## Install

```bash
npm install @item-systems/item
```

## What this package provides

The SDK centers on the `Item` class, which wraps the ITEM contract and related tokenized asset contract workflows.

It supports:
- contract initialization against Neo N3
- read and write operations for users, items, epochs, configurations, and assets
- item binding and locking workflows
- ITEM authentication and validation flows
- tokenized asset contract helpers such as `ownerOf`, `claimItem`, `itemsOf`, and token property lookups
- utility helpers for transaction polling, NDEF decoding, key handling, and deployment support
- smartcard helpers and transports for card-oriented integrations

## Quickstart

### Read-only client

#### Test strategy

The repository now separates tests by execution intent:

- `npm test` / `npm run test:unit`: deterministic default suite used for local validation and CI.
- `npm run test:integration`: environment-backed ITEM workflow tests under `tests/integration/**`. These require configured `.env` values and may interact with live services or mutate state.
- `npm run test:manual`: manual or hardware-backed tests under `tests/manual/**`. Some specs require explicit opt-in flags such as `RUN_SMARTCARD_MANUAL=1`.
- `npm run test:all`: runs all tiers in sequence.

Contributors should keep new fast, deterministic coverage in the default unit suite and place live, stateful, or hardware-dependent tests in the explicit integration/manual tiers.

`Item` cannot be constructed with `new Item()`. Use `await Item.init(...)`.

```ts
import { Item, constants } from '@item-systems/item'

const item = await Item.init({
  node: constants.NeoN3NetworkOptions.MainNet,
})

const totalItems = await item.totalItems()
console.log({ totalItems })

const nfi = await item.getItem({ localNfid: 1 })
console.log(nfi)
```

### Signed client

Write operations require a signer account that is authorized for the target contract action.

```ts
import { Item, constants } from '@item-systems/item'
import { wallet } from '@cityofzion/neon-js'

const account = new wallet.Account(process.env.NEO_PRIVATE_KEY!)

const item = await Item.init({
  node: constants.NeoN3NetworkOptions.TestNet,
  account,
})

const txid = await item.setItemProperty({
  localNfid: 1,
  globalPid: '01',
  state: '01',
})

console.log({ txid })
```

## Initialization

### `Item.init(options?)`

`Item.init` accepts `ConstructorOptions`:

- `node?: string` — RPC endpoint. Defaults to ITEM mainnet RPC.
- `scriptHash?: string` — ITEM contract script hash. Defaults to the package's canonical deployment.
- `invoker?: Neo3Invoker` — custom invoker if you already manage invocation/signing externally.
- `listener?: Neo3EventListener` — custom event listener for transaction completion.
- `parser?: Neo3Parser` — custom parser. Defaults to `NeonParser`.
- `account?: wallet.Account` — signer used by the default invoker for state-changing methods.

If you do not pass `invoker` or `listener`, the SDK creates Neon-based defaults.

### Network constants

```ts
import { constants } from '@item-systems/item'

constants.NeoN3NetworkOptions.LocalNet
constants.NeoN3NetworkOptions.TestNet
constants.NeoN3NetworkOptions.MainNet
```

### Custom invoker/listener setup

Use this when your app already owns wallet/session state.

```ts
import { Item } from '@item-systems/item'
import { NeonEventListener, NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'

const invoker = await NeonInvoker.init({
  rpcAddress: 'https://testnet1.neo.coz.io:443',
  account,
})

const listener = new NeonEventListener('https://testnet1.neo.coz.io:443')

const item = await Item.init({
  scriptHash: '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d',
  node: 'https://testnet1.neo.coz.io:443',
  invoker,
  listener,
  parser: NeonParser,
})
```

## Async transaction model

The SDK uses two patterns for state-changing methods:

1. **Async submission methods** such as `createItem`, `bindItem`, `authItem`, `claimItem`
   - submit a transaction
   - return a transaction id (`txid`)

2. **`*Sync` methods** such as `createItemSync`, `bindItemSync`, `authItemSync`
   - submit the transaction
   - wait for the application log
   - parse and return the contract result

Examples:

```ts
const txid = await item.createConfiguration()
const log = await Utils.transactionCompletion(txid, {
  node: constants.NeoN3NetworkOptions.TestNet,
  timeout: 30_000,
})

const localCid = await item.createConfigurationSync()
```

Use the async form when your app already has its own transaction tracking pipeline. Use the `*Sync` form when you want the SDK to wait and parse the result for you.

## API overview

### Users

Read:
- `getUser`
- `getUserWithAddress`
- `getUserProperties`
- `totalUsers`

Write:
- `createUser`
- `setUserProperty`
- `setUserPropertySync`

### Items

Read:
- `totalItems`
- `getItem`
- `getItemWithKey`
- `getItemWithTac`
- `getItemProperties`

Write / lifecycle:
- `createItem`
- `createItemSync`
- `setItemProperty`
- `setItemPropertySync`
- `bindItem`
- `bindItemSync`
- `lockItem`
- `lockItemSync`
- `purgeItem`
- `purgeItemSync`

Authentication:
- `authItem`
- `authItemSync`
- `verifyAuth` (canonical read-only preflight)
- `isAuthValid` (deprecated compatibility alias)

### Epochs

Read:
- `getEpoch`
- `getEpochItems`
- `getEpochProperties`
- `totalEpochs`

Write:
- `setEpochProperty`
- `setEpochPropertySync`

### Configurations

Read:
- `getConfiguration`
- `getConfigurationProperties`
- `getConfigurationAssets`
- `totalConfigurations`

Write:
- `createConfiguration`
- `createConfigurationSync`
- `setConfigurationProperty`
- `setConfigurationPropertySync`

### Assets

Read:
- `getAsset`
- `getAssetWithKey`
- `getAssetBurnLog`
- `totalAssets`

### Tokenized asset contract helpers

These methods bridge from ITEM records to the bound tokenized asset contract:

- `tokenProperties`
- `tokenPropertiesWithNfid`
- `itemsOf`
- `isClaimable`
- `isClaimableWithNfid`
- `claimItem`
- `claimItemSync`
- `ownerOf`

### Admin

- `update`
- `updateSync`

## Common workflows

### Fetch an item by local ITEM id

```ts
const itemRecord = await item.getItem({ localNfid: 42 })
console.log(itemRecord.binding_token_id)
console.log(itemRecord.epoch.binding_script_hash)
```

### Fetch an item by public key

> Note: placeholder values below are illustrative only. Replace them with real public keys, auth payloads, script hashes, and accounts from your environment.

```ts
const itemRecord = await item.getItemWithKey({
  pubKey: '03abc123...',
})
```

### Validate auth before submitting an on-chain action

```ts
import { types } from '@item-systems/item'

const auth = {
  message: '00112233',
  proof: 'aabbccdd',
  challenge: types.AuthChallenge.ILS_PERMISSIVE,
}

const validation = await item.verifyAuth({
  localNfid: 42,
  auth,
})

console.log(validation.valid)
```

### Claim a tokenized asset

```ts
const ok = await item.claimItemSync({
  pubKey: '03abc123...',
  auth,
  receiverAccount: 'NXYZ...',
})

console.log(ok)
```

## Examples

See [examples/README.md](examples/README.md) for small runnable reference snippets.

## Production guidance

If you are building a real integration, read these before shipping:

- [Workflow playbooks](docs-src/WORKFLOW_PLAYBOOKS.md)
- [Troubleshooting and error handling](docs-src/TROUBLESHOOTING.md)
- [Security and production integration guidance](docs-src/SECURITY_AND_PRODUCTION_GUIDANCE.md)
- [Environments, compatibility, and setup](docs-src/ENVIRONMENTS_AND_COMPATIBILITY.md)

## Development

```bash
npm run tsc
npm test
npm run docs
```
