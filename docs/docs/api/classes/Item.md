---
id: "Item"
title: "Class: Item"
sidebar_label: "Item"
sidebar_position: 0
custom_edit_url: null
---

The ITEM class is the primary interface point for the digital twin of an NFI. Use this class to execute standard
non-fungible token interations as well as additional capabilities like authentication and configuration. WalletConnect 2.0
has native support through the neon-invoker package.

To use this class:
```typescript
import { Item } from '@item-systems/item'
import Neon from '@cityofzion/neon-core'
import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'

const account = new Neon.wallet.Account()

const item = new Item({
  scriptHash,
  invoker: await NeonInvoker.init(NODE, account),
  parser: NeonParser,
})
const totalItems = await item.totalSupply()
console.log(totalItems)
```

## Constructors

### constructor

• **new Item**(`configOptions`): [`Item`](Item.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `configOptions` | [`SmartContractConfig`](../namespaces/types.md#smartcontractconfig) |

#### Returns

[`Item`](Item.md)

#### Defined in

[Item.ts:36](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L36)

## Properties

### config

• `Private` **config**: [`SmartContractConfig`](../namespaces/types.md#smartcontractconfig)

#### Defined in

[Item.ts:34](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L34)

___

### MAINNET

▪ `Static` **MAINNET**: `string` = `'0x904deb56fdd9a87b48d89e0cc0ac3415f9207840'`

#### Defined in

[Item.ts:30](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L30)

___

### PRIVATENET

▪ `Static` **PRIVATENET**: `string` = `'0x904deb56fdd9a87b48d89e0cc0ac3415f9207840'`

#### Defined in

[Item.ts:32](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L32)

___

### TESTNET

▪ `Static` **TESTNET**: `string` = `'0x904deb56fdd9a87b48d89e0cc0ac3415f9207840'`

#### Defined in

[Item.ts:31](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L31)

## Accessors

### scriptHash

• `get` **scriptHash**(): `string`

Gets the script hash of the smart contract.

#### Returns

`string`

#### Defined in

[Item.ts:43](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L43)

## Methods

### auth

▸ **auth**(`params`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.burn` | `boolean` |
| `params.message` | `string` |
| `params.mode` | `string` |
| `params.signature` | `string` |

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[Item.ts:378](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L378)

___

### authCommit

▸ **authCommit**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.burn` | `boolean` |
| `params.message` | `string` |
| `params.mode` | `string` |
| `params.signature` | `string` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:397](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L397)

___

### authCommitConfirmed

▸ **authCommitConfirmed**(`params`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.burn` | `boolean` |
| `params.message` | `string` |
| `params.mode` | `string` |
| `params.signature` | `string` |

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[Item.ts:410](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L410)

___

### balanceOf

▸ **balanceOf**(`params`): `Promise`\<`number`\>

Gets the total NFI holdings of an entity

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.address` | `string` | the address of the requested entity |

#### Returns

`Promise`\<`number`\>

#### Defined in

[Item.ts:128](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L128)

___

### bindItem

▸ **bindItem**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:427](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L427)

___

### bindItemConfirmed

▸ **bindItemConfirmed**(`params`, `mock?`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.blockIndex` | `number` |
| `params.signature` | `string` |
| `params.tokenId` | `number` |
| `mock?` | `boolean` |

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[Item.ts:437](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L437)

___

### claimBindOnPickup

▸ **claimBindOnPickup**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.message` | `string` |
| `params.signature` | `string` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:460](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L460)

___

### claimBindOnPickupConfirmed

▸ **claimBindOnPickupConfirmed**(`params`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |
| `params.message` | `string` |
| `params.signature` | `string` |

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[Item.ts:467](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L467)

___

### createEpoch

▸ **createEpoch**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.authAge` | `number` |
| `params.generatorInstanceId` | `number` |
| `params.label` | `string` |
| `params.maxSupply` | `number` |
| `params.mintFee` | `number` |
| `params.sysFee` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:315](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L315)

___

### decimals

▸ **decimals**(): `Promise`\<`number`\>

Returns the decimals supported by ITEMs. Currently, the ITEM contract does not support native fractional ownership.

#### Returns

`Promise`\<`number`\>

#### Defined in

[Item.ts:70](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L70)

___

### getAssetItemJSON

▸ **getAssetItemJSON**(`params`): `Promise`\<[`ItemType`](../interfaces/types.ItemType.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |

#### Returns

`Promise`\<[`ItemType`](../interfaces/types.ItemType.md)\>

#### Defined in

[Item.ts:503](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L503)

___

### getEpoch

▸ **getEpoch**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.epochId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:344](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L344)

___

### getEpochJSON

▸ **getEpochJSON**(`params`): `Promise`\<[`EpochType`](../interfaces/types.EpochType.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.epochId` | `number` |

#### Returns

`Promise`\<[`EpochType`](../interfaces/types.EpochType.md)\>

#### Defined in

[Item.ts:329](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L329)

___

### getItem

▸ **getItem**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:517](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L517)

___

### getItemJSON

▸ **getItemJSON**(`params`, `mock?`): `Promise`\<[`ItemType`](../interfaces/types.ItemType.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.tokenId` | `number` |
| `mock?` | `boolean` |

#### Returns

`Promise`\<[`ItemType`](../interfaces/types.ItemType.md)\>

#### Defined in

[Item.ts:530](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L530)

___

### getItemJSONFlat

▸ **getItemJSONFlat**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:572](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L572)

___

### getUser

▸ **getUser**(`params`): `Promise`\<`string`\>

RAW data payload for contract interfacing

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.address` | `string` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:271](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L271)

___

### getUserJSON

▸ **getUserJSON**(`params`): `Promise`\<[`UserAccount`](../interfaces/types.UserAccount.md)\>

Gets the user entity state in the smart contract including permissions
and NFI ownership.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` | - |
| `params.address` | `string` | the entity you are requesting information about |

#### Returns

`Promise`\<[`UserAccount`](../interfaces/types.UserAccount.md)\>

#### Defined in

[Item.ts:254](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L254)

___

### lock

▸ **lock**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:603](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L603)

___

### offlineMint

▸ **offlineMint**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.address` | `string` |
| `params.bindOnPickup` | `boolean` |
| `params.epochId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:585](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L585)

___

### offlineMintConfirmed

▸ **offlineMintConfirmed**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.address` | `string` |
| `params.bindOnPickup` | `boolean` |
| `params.epochId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:592](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L592)

___

### ownerOf

▸ **ownerOf**(`params`): `Promise`\<`string`\>

Gets the owner of the NFI.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.tokenId` | `number` | the global id of the NFI |

#### Returns

`Promise`\<`string`\>

the owning entity's address

#### Defined in

[Item.ts:186](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L186)

___

### properties

▸ **properties**(`params`): `Promise`\<`string`\>

Gets the properties of the NFI. This method is designed to emulate existing
NFT standards for wallet support and marketplaces.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.tokenId` | `number` | the global id for the NFI |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:234](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L234)

___

### setBindOnPickup

▸ **setBindOnPickup**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.state` | `boolean` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:482](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L482)

___

### setBindOnPickupConfirmed

▸ **setBindOnPickupConfirmed**(`params`): `Promise`\<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.state` | `boolean` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`boolean`\>

#### Defined in

[Item.ts:489](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L489)

___

### setItemProperties

▸ **setItemProperties**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.properties` | `any` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:610](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L610)

___

### setMintFee

▸ **setMintFee**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.amount` | `number` |
| `params.epochId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:357](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L357)

___

### setUserPermissions

▸ **setUserPermissions**(`params`): `Promise`\<`string`\>

Updates a users permissions within the contract. This is a protected method.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.address` | `string` | the entity to update |
| `params.permissions` | `any` | the complete permission-set to update to |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:290](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L290)

___

### symbol

▸ **symbol**(): `Promise`\<`string`\>

Returns the token symbol for the digital twin "ITEM". This is a great test method and exist primarily to support
existing token standard.

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:54](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L54)

___

### tokens

▸ **tokens**(): `Promise`\<`number`[]\>

Gets every pointer for an NFI. This method exists for standards purposes.
Because we use incrementing pointers, using (totalSupply)[http://localhost:3000/docs/api/classes/Item#totalsupply]
and iterating from 1-"totalSupply" is more much more efficient.

#### Returns

`Promise`\<`number`[]\>

the list of globals ids for every NFI

#### Defined in

[Item.ts:208](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L208)

___

### tokensOf

▸ **tokensOf**(`params`): `Promise`\<`number`[]\>

Gets the items owned by an entity.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.address` | `string` | the address of the requested entity |

#### Returns

`Promise`\<`number`[]\>

an array of pointers to the items owned

#### Defined in

[Item.ts:105](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L105)

___

### totalAccounts

▸ **totalAccounts**(): `Promise`\<`number`\>

Gets the total number of accounts managed in the smart contract

#### Returns

`Promise`\<`number`\>

the number of accounts

#### Defined in

[Item.ts:301](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L301)

___

### totalEpochs

▸ **totalEpochs**(): `Promise`\<`number`\>

#### Returns

`Promise`\<`number`\>

#### Defined in

[Item.ts:364](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L364)

___

### totalSupply

▸ **totalSupply**(): `Promise`\<`number`\>

Gets the total number of ITEMS tracked in the contract.

#### Returns

`Promise`\<`number`\>

#### Defined in

[Item.ts:86](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L86)

___

### transfer

▸ **transfer**(`params`): `Promise`\<`string`\>

Transfers ownership of an NFI from the owner to another entity. For a method which
considers block confirmations, refer to (transferConfirmed)[http://localhost:3000/docs/api/classes/Item#transferconfirmed].

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.data` | `any` | parameters for handling upstream workflows (default: null) |
| `params.to` | `string` | the destination address |
| `params.tokenId` | `number` | the global id of the NFI to transfer |

#### Returns

`Promise`\<`string`\>

the transaction id for lookup on (dora)[https://dora.coz.io]

#### Defined in

[Item.ts:151](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L151)

___

### transferConfirmed

▸ **transferConfirmed**(`params`): `Promise`\<`string`\>

Transfers ownership of an NFI from the owner to another entity. This method confirms the block before returning
and will error if there is a confirmation issue.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `params` | `Object` |  |
| `params.data` | `any` | parameters for handling upstream workflows (default: null) |
| `params.to` | `string` | the destination address |
| `params.tokenId` | `number` | the global id of the NFI to transfer |

#### Returns

`Promise`\<`string`\>

boolean Was the transfer successful?

#### Defined in

[Item.ts:168](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L168)

___

### unbindAsset

▸ **unbindAsset**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.assetPubKey` | `string` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:624](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L624)

___

### unbindToken

▸ **unbindToken**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.tokenId` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:617](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L617)

___

### update

▸ **update**(`params`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.data` | `any` |
| `params.manifest` | `string` |
| `params.script` | `string` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[Item.ts:631](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/Item.ts#L631)
