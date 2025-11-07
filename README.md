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

For SDK specific documentation, you can look [**here**](https://docs.item.systems/docs/sdk/ts/).

# Overview

This SDK provides bindings and workflows for use with various components in the NFI ecosystem.
Scopes are broken into classes, typically falling along contract lines.

## Quickstart

#### To install: `npm install @item-systems/item --save`

#### Getting an Item:

```ts
const item = new Item()
const nfi = await item.getItem({
  localNfid: 1,
})
```
