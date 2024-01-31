---
id: "Utils"
title: "Class: Utils"
sidebar_label: "Utils"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Utils**(): [`Utils`](Utils.md)

#### Returns

[`Utils`](Utils.md)

## Methods

### decodeNDEF

▸ **decodeNDEF**(`d`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `d` | `string` |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `entropy` | `string` |
| `pubKey` | `string` |
| `sig` | `string` |

#### Defined in

[helpers/utils.ts:55](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L55)

___

### deployContract

▸ **deployContract**(`node`, `networkMagic`, `nefRaw`, `manifestRaw`, `signer`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `node` | `string` |
| `networkMagic` | `number` |
| `nefRaw` | `Buffer` |
| `manifestRaw` | `any` |
| `signer` | `Account` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[helpers/utils.ts:26](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L26)

___

### encodePublicKey

▸ **encodePublicKey**(`pubKey`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `pubKey` | `string` |

#### Returns

`string`

#### Defined in

[helpers/utils.ts:75](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L75)

___

### processDERSignature

▸ **processDERSignature**(`sigBytes`): `Uint8Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sigBytes` | `Uint8Array` |

#### Returns

`Uint8Array`

#### Defined in

[helpers/utils.ts:79](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L79)

___

### sleep

▸ **sleep**(`ms`): `Promise`\<`unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `ms` | `number` |

#### Returns

`Promise`\<`unknown`\>

#### Defined in

[helpers/utils.ts:107](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L107)

___

### transactionCompletion

▸ **transactionCompletion**(`txid`, `opts?`): `Promise`\<`ApplicationLogJson`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `txid` | `string` |
| `opts?` | [`pollingOptions`](../namespaces/types.md#pollingoptions) |

#### Returns

`Promise`\<`ApplicationLogJson`\>

#### Defined in

[helpers/utils.ts:7](https://github.com/item-systems/item-sdk-typescript/blob/3d8dd30/src/helpers/utils.ts#L7)
