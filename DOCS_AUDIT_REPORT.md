# Documentation Audit Report — item-sdk-typescript

Date: 2026-03-23
Repository: `projects/item-sdk-typescript`
Scope: top-level package documentation, discoverability of public API, examples, and generated-doc readiness.

## Executive Summary

The repository is usable by an already-informed maintainer, but its documentation is currently too thin for a new integrator. The top-level README only shows package install and a single `getItem` example, while the actual SDK exposes a broad surface area across initialization, user/item/epoch/configuration/asset workflows, authentication, tokenized-asset interactions, and smartcard helpers.

The biggest documentation risks are:

1. **Quickstart is incomplete and slightly misleading** — it shows `new Item()` even though the class constructor is private and the supported entrypoint is `await Item.init(...)`.
2. **Public API coverage is far below actual surface area** — the main class exposes ~50 methods, but the README documents almost none of them.
3. **Operational prerequisites are undocumented** — network selection, signer/account expectations, contract script hash defaults, and sync-vs-async transaction semantics are not explained in the README.
4. **No generated API docs configuration is checked in** — `npm run docs` exists, but there is no `typedoc.json` or equivalent repo-level configuration, which makes doc generation less predictable and less curated.
5. **Tests contain valuable usage examples that are not promoted into docs** — especially around authentication, tokenized asset contract lookups, configuration flows, and helper utilities.

Overall assessment: **documentation needs a structured pass before broad external consumption**.

## What I Reviewed

- `README.md`
- `package.json`
- `src/index.ts`
- `src/Item.ts`
- `src/types/interface.ts`
- `src/helpers/utils.ts`
- `tests/operations.spec.ts`
- `tests/manufacturing.spec.ts`

## Findings

### 1) Quickstart is incorrect for current API shape

README example:

```ts
const item = new Item()
const nfi = await item.getItem({
  localNfid: 1,
})
```

Actual API:

- `Item` constructor is private.
- Supported initialization path is `await Item.init(configOptions?)`.

Impact:

- A new user copying the README example will fail immediately.
- This is the highest-priority documentation defect because it breaks first-run adoption.

Recommendation:

- Replace quickstart with a working example using `await Item.init(...)`.
- Include at least one read-only example and one signed/write example.

### 2) README does not explain initialization model

The SDK depends on a Neo N3 invoker/listener/parser setup and supports configuration through `ConstructorOptions`:

- `node`
- `scriptHash`
- `invoker`
- `listener`
- `parser`
- `account`

Current README does not explain:

- default network/node behavior
- default contract script hash
- when `account` is required
- when custom invoker/listener/parser should be supplied
- how to target testnet vs mainnet

Impact:

- Integrators cannot confidently initialize the SDK for their environment.
- Write methods may fail unexpectedly if no signer/account is configured.

Recommendation:

Add an "Initialization" section covering:

- default values
- read-only vs signed usage
- custom contract deployments via `scriptHash`
- environment-specific examples

### 3) Async vs sync transaction semantics are undocumented

The SDK consistently provides two patterns for many write operations:

- async submit methods returning a transaction id, e.g. `createItem`, `bindItem`, `authItem`
- sync convenience methods waiting for application logs, e.g. `createItemSync`, `bindItemSync`, `authItemSync`

This pattern is central to the SDK design but absent from the README.

Impact:

- Users will not understand when they are receiving a txid vs a parsed contract result.
- Users may reimplement polling logic unnecessarily.

Recommendation:

Document the contract interaction model explicitly:

- `foo()` => submits transaction, returns txid
- `fooSync()` => waits for confirmation and returns parsed result
- `Utils.transactionCompletion()` for manual polling workflows

### 4) Public API is much larger than docs suggest

`Item` currently exposes the following methods:

- Admin: `update`, `updateSync`
- Users: `createUser`, `getUser`, `getUserWithAddress`, `setUserProperty`, `setUserPropertySync`, `getUserProperties`, `totalUsers`
- Items: `totalItems`, `createItem`, `createItemSync`, `getItem`, `getItemWithKey`, `getItemWithTac`, `getItemProperties`, `setItemProperty`, `setItemPropertySync`, `bindItem`, `bindItemSync`, `lockItem`, `lockItemSync`, `authItem`, `authItemSync`, `isAuthValid`, `purgeItem`, `purgeItemSync`
- Epochs: `setEpochProperty`, `setEpochPropertySync`, `getEpoch`, `getEpochItems`, `getEpochProperties`, `totalEpochs`
- Configurations: `createConfiguration`, `createConfigurationSync`, `getConfiguration`, `setConfigurationProperty`, `setConfigurationPropertySync`, `getConfigurationProperties`, `getConfigurationAssets`, `totalConfigurations`
- Assets: `getAsset`, `getAssetWithKey`, `getAssetBurnLog`, `totalAssets`
- Tokenized asset helpers: `tokenProperties`, `tokenPropertiesWithNfid`, `itemsOf`, `isClaimable`, `isClaimableWithNfid`, `claimItem`, `claimItemSync`, `ownerOf`

README currently documents essentially none of these categories beyond a single item lookup.

Impact:

- The package appears much smaller and less capable than it is.
- Users must read source or tests to discover supported workflows.

Recommendation:

Add a "Capabilities" or "API Overview" section grouping methods by domain.

### 5) Helper utilities are undocumented in top-level docs

`Utils` includes important integrator helpers such as:

- `transactionCompletion`
- `deployContract`
- `decodeNDEF`
- `encodePublicKey`
- `processDERSignature`
- `isPublicKey`
- `numToHexComplement`

These are particularly important because tests rely on them for realistic workflows.

Impact:

- Users may miss critical helper functions for NDEF/auth and token-id formatting.

Recommendation:

Add a dedicated "Utilities" section with short examples for:

- decoding an NDEF payload
- converting token ids with `numToHexComplement`
- waiting on tx completion

### 6) Authentication flows are under-documented despite being a core differentiator

The type system contains meaningful auth concepts:

- `AuthChallenge`
- `AuthPayload`
- `AuthItem`
- `IsAuthValid`
- `ClaimItem`
- `NdefDecodeType`

Tests demonstrate realistic auth flows using `Utils.decodeNDEF(...)`, `getItemWithKey(...)`, and `isAuthValid(...)`.

README does not explain:

- challenge types
- expected message/proof formats
- difference between `isAuthValid` and `authItem`
- burn semantics
- relation to claim flows

Impact:

- One of the most distinctive parts of the SDK is effectively hidden.

Recommendation:

Add an "Authentication" section with a minimal end-to-end example:

1. decode NDEF payload
2. resolve item by pubkey
3. validate auth off-chain/test-invoke
4. optionally submit auth on-chain

### 7) Tokenized asset contract integration is not surfaced well

The SDK includes methods that bridge ITEM and IS1/tokenized asset contracts:

- `getItemWithTac`
- `tokenProperties`
- `tokenPropertiesWithNfid`
- `itemsOf`
- `isClaimable`
- `isClaimableWithNfid`
- `claimItem`
- `ownerOf`

This is a major integration story, but the README does not describe it.

Impact:

- Application developers may not realize the SDK supports both ITEM-native and TAC-oriented lookup patterns.

Recommendation:

Add a section like "Working with bound tokenized assets" and show:

- lookup by NFID
- lookup by `(scriptHash, tokenId)`
- owner lookup
- claim flow overview

### 8) Type documentation exists in code but is not curated for users

`src/types/interface.ts` contains useful inline docs and examples, but:

- there is no checked-in generated docs configuration
- there is no docs index linking users to the most important types
- some types are still generic aliases (`HexString`, `PropertyMap`) without narrative guidance

Impact:

- Good raw material exists, but it is not packaged into an accessible developer experience.

Recommendation:

- Add TypeDoc configuration.
- Ensure docs entrypoints prioritize `Item`, `Utils`, and key auth/types pages.
- Add a short "Important Types" table in the README.

### 9) `npm run docs` exists without visible repo-level TypeDoc configuration

`package.json` defines:

```json
"docs": "typedoc"
```

But the repo currently has no visible `typedoc.json`.

Impact:

- Generated docs may depend on defaults that are noisy or unstable.
- There is no curated landing page, category ordering, exclusion list, or output configuration.

Recommendation:

Create `typedoc.json` with at least:

- entry points
- output dir
- exclude test files
- project name/version handling
- categorization/grouping strategy
- README inclusion behavior

### 10) README does not state environment/test expectations

Tests indicate environment-driven usage via `.env/<environment>.env`, signer keys, node URLs, and contract deployment/update flows.

README does not explain:

- what environment variables are expected for advanced workflows
- which examples are read-only vs state-changing
- whether examples target production contracts by default

Impact:

- Users may accidentally point write flows at the wrong network or assume examples are safe to run unchanged.

Recommendation:

Add an "Environment & Safety" section clarifying:

- read-only methods are safe for public RPC usage
- write methods require signer/account and correct contract target
- deployment/update flows are administrative

### 11) Some method naming/return-shape nuances should be called out explicitly

A few examples from the source:

- `isAuthValid()` returns `AuthValidationResult`, not a bare boolean.
- object-returning getters normalize some fields (for example script hash / seed / key formatting).
- `itemsOf()` is implemented by scanning epochs/contracts and may be expensive.

Impact:

- Users may make incorrect assumptions about return types or performance.

Recommendation:

Document notable behavior notes for methods with non-obvious semantics, especially:

- `isAuthValid`
- `getItem`, `getItemWithKey`, `getItemWithTac`
- `itemsOf`
- `claimItem`

## Priority Recommendations

### P0 — Fix immediately

1. Correct README quickstart to use `await Item.init(...)`.
2. Add installation + initialization examples that actually run.
3. Document async vs sync method behavior.

### P1 — High value

4. Add API overview grouped by domain.
5. Add authentication workflow example.
6. Add tokenized asset integration overview.
7. Add utilities section for `Utils`.

### P2 — Polish / maintainability

8. Add `typedoc.json` and curate generated docs.
9. Add environment/safety notes.
10. Add an examples section or `examples/` directory with copy-pasteable snippets.

## Suggested README Structure

1. Title / package description
2. Installation
3. Quickstart
   - read-only initialization
   - signed initialization
4. Core concepts
   - NFID / item
   - epoch
   - configuration
   - asset
   - TAC / remote token
5. Transaction model
   - async vs sync methods
6. Common workflows
   - get item
   - get item by public key
   - create configuration / bind item
   - validate auth
   - claim item
7. Utilities
8. API overview
9. Link to generated API docs / portal docs
10. Safety notes

## Verification Notes

This was a documentation audit only. No code changes were made in this pass.

Evidence gathered from:

- top-level README
- package metadata
- exported entrypoints
- `Item` class method inventory
- helper/type definitions
- test usage patterns
