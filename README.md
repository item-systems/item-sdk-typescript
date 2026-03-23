<p align="center">
  <img
    src="https://assets-global.website-files.com/65082d98418d032204fbd975/6511aa0e627929e14dbcf5c4_itemSystems%20logo.svg"
    width="200px;"></img>
</p>

<h1 align="center">ITEM SDK</h1>

<p align="center">
  A typescript SDK for Non-Fungible Items
</p>

## Documentation

For a more complete set of
project documentation, visit the [**developer portal**](https://docs.item.systems).

For SDK specific documentation, you can look [**here**](https://docs.item.systems/sdk/ts/).

# Overview

This SDK provides bindings and workflows for use with various components in the NFI ecosystem.

## Quickstart

#### To install: `npm install @item-systems/item --save`

#### Test strategy

The repository now separates tests by execution intent:

- `npm test` / `npm run test:unit`: deterministic default suite used for local validation and CI.
- `npm run test:integration`: environment-backed ITEM workflow tests under `tests/integration/**`. These require configured `.env` values and may interact with live services or mutate state.
- `npm run test:manual`: manual or hardware-backed tests under `tests/manual/**`. Some specs require explicit opt-in flags such as `RUN_SMARTCARD_MANUAL=1`.
- `npm run test:all`: runs all tiers in sequence.

Contributors should keep new fast, deterministic coverage in the default unit suite and place live, stateful, or hardware-dependent tests in the explicit integration/manual tiers.

#### Getting an Item:

```ts
const item = new Item()
const nfi = await item.getItem({
  localNfid: 1,
})
```
