# API Overview

This document groups the public `Item` API by domain so integrators can find the right method quickly.

## Initialization

- `Item.init(options?)`

Use `Item.init` instead of `new Item()`. The constructor is private.

## Return-pattern guide

### Read methods
Read methods usually return parsed domain objects directly:
- `number`
- `boolean`
- `string`
- `PropertyMap`
- typed objects such as `ItemType`, `AssetType`, `EpochType`, `ConfigurationType`, `UserType`

### Write methods
Write methods generally come in two forms:
- async submission form returning `txid: string`
- `*Sync` form returning the parsed contract result after waiting for the application log

## Users

### Reads
- `getUser({ localUid })`
- `getUserWithAddress({ address })`
- `getUserProperties({ localUid })`
- `totalUsers()`

### Writes
- `createUser({ address })`
- `setUserProperty({ localUid, globalPid, state })`
- `setUserPropertySync({ localUid, globalPid, state }, timeout?)`

## Items

### Reads
- `totalItems()`
- `getItem({ localNfid })`
- `getItemWithKey({ pubKey })`
- `getItemWithTac({ scriptHash, tokenId })`
- `getItemProperties({ localNfid })`

### Writes / lifecycle
- `createItem({ localEid, bindingTokenId })`
- `createItemSync({ localEid, bindingTokenId }, timeout?)`
- `setItemProperty({ localNfid, globalPid, state })`
- `setItemPropertySync({ localNfid, globalPid, state }, timeout?)`
- `bindItem({ localNfid, localCid, pubKey, assetEllipticCurve })`
- `bindItemSync({ localNfid, localCid, pubKey, assetEllipticCurve }, timeout?)`
- `lockItem({ localNfid })`
- `lockItemSync({ localNfid }, timeout?)`
- `purgeItem({ localNfid, message, proof })`
- `purgeItemSync({ localNfid, message, proof }, timeout?)`

### Authentication
- `authItem({ localNfid, auth, burn })`
- `authItemSync({ localNfid, auth, burn }, timeout?)`
- `verifyAuth({ localNfid, auth })` — canonical read-only preflight
- `isAuthValid({ localNfid, auth })` — deprecated compatibility alias

## Epochs

### Reads
- `getEpoch({ localEid })`
- `getEpochItems({ localEid })`
- `getEpochProperties({ localEid })`
- `totalEpochs()`

### Writes
- `setEpochProperty({ localEid, globalPid, state })`
- `setEpochPropertySync({ localEid, globalPid, state }, timeout?)`

## Configurations

### Reads
- `getConfiguration({ localCid })`
- `getConfigurationProperties({ localCid })`
- `getConfigurationAssets({ localCid })`
- `totalConfigurations()`

### Writes
- `createConfiguration()`
- `createConfigurationSync(timeout?)`
- `setConfigurationProperty({ localCid, globalPid, state })`
- `setConfigurationPropertySync({ localCid, globalPid, state }, timeout?)`

## Assets

### Reads
- `getAsset({ localAsid })`
- `getAssetWithKey({ pubKey })`
- `getAssetBurnLog({ localAsid })`
- `totalAssets()`

## Tokenized asset contract helpers

These methods cross the boundary from ITEM records into the bound tokenized asset contract:

- `tokenProperties({ pubKey })`
- `tokenPropertiesWithNfid({ localNfid })`
- `itemsOf({ address })`
- `isClaimable({ pubKey })`
- `isClaimableWithNfid({ localNfid })`
- `claimItem({ pubKey, auth, receiverAccount? })`
- `claimItemSync({ pubKey, auth, receiverAccount? }, timeout?)`
- `ownerOf({ localNfid })`

## Admin

- `update({ script, manifest, data })`
- `updateSync({ script, manifest, data }, timeout?)`

## Important exported types

From `types`:
- `ConstructorOptions`
- `PropertyMap`
- `RemoteToken`
- `AuthPayload`
- `AuthItem`
- `ClaimItem`
- `VerifyAuth`
- `IsAuthValid` (compatibility alias input)
- `ItemType`
- `AssetType`
- `ConfigurationType`
- `EpochType`
- `UserType`
- `AuthChallenge`

From `constants`:
- `NeoN3NetworkOptions`
- `NeoN3EllipticCurves`
- `Challenges`
