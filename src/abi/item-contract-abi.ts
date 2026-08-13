/**
 * Machine-readable ITEM SDK ↔ contract ABI compatibility inventory.
 *
 * Source contract:
 * https://github.com/item-systems/contract_N3_ITEM/blob/main/contract/Item.py
 *
 * `contractArgTypes` preserves the Neo manifest type. `sdkArgTypes` records
 * the invocation transport shape emitted by Neon. PublicKey is intentionally
 * transported as ByteArray because Neo invocation payloads carry the exact
 * compressed/uncompressed ECPoint bytes in that form.
 *
 * Keep unexposed operations explicit. Adding a facade/builder requires moving
 * it into the supported list with a test rather than silently expanding the
 * SDK surface.
 */
export type ItemAbiOperation = {
  operation: string
  contractArgTypes: readonly string[]
  sdkArgTypes: readonly string[]
  facadeMethod?: string
  invocationMode?: 'read' | 'write'
  safe: boolean
}

export const ITEM_ABI_OPERATIONS: readonly ItemAbiOperation[] = [
  { operation: 'update', contractArgTypes: ['ByteArray', 'ByteArray', 'Any'], sdkArgTypes: ['ByteArray', 'ByteArray', 'Any'], facadeMethod: 'update', invocationMode: 'write', safe: false },
  { operation: 'createUser', contractArgTypes: ['Hash160'], sdkArgTypes: ['Hash160'], facadeMethod: 'createUser', invocationMode: 'write', safe: false },
  { operation: 'getUser', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getUser', invocationMode: 'read', safe: true },
  { operation: 'getUserWithAddress', contractArgTypes: ['Hash160'], sdkArgTypes: ['Hash160'], facadeMethod: 'getUserWithAddress', invocationMode: 'read', safe: false },
  { operation: 'setUserProperty', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray'], facadeMethod: 'setUserProperty', invocationMode: 'write', safe: false },
  { operation: 'getUserProperties', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getUserProperties', invocationMode: 'read', safe: true },
  { operation: 'totalUsers', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'totalUsers', invocationMode: 'read', safe: true },
  { operation: 'createEpoch', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'createEpoch', invocationMode: 'write', safe: false },
  { operation: 'setEpochProperty', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray'], facadeMethod: 'setEpochProperty', invocationMode: 'write', safe: false },
  { operation: 'getEpoch', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getEpoch', invocationMode: 'read', safe: true },
  { operation: 'getEpochProperties', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getEpochProperties', invocationMode: 'read', safe: true },
  { operation: 'getEpochItems', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getEpochItems', invocationMode: 'read', safe: true },
  { operation: 'totalEpochs', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'totalEpochs', invocationMode: 'read', safe: true },
  { operation: 'createConfiguration', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'createConfiguration', invocationMode: 'write', safe: false },
  { operation: 'setConfigurationProperty', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray'], facadeMethod: 'setConfigurationProperty', invocationMode: 'write', safe: false },
  { operation: 'getConfiguration', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getConfiguration', invocationMode: 'read', safe: true },
  { operation: 'getConfigurationProperties', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getConfigurationProperties', invocationMode: 'read', safe: true },
  { operation: 'getConfigurationAssets', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getConfigurationAssets', invocationMode: 'read', safe: true },
  { operation: 'totalConfigurations', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'totalConfigurations', invocationMode: 'read', safe: true },
  { operation: 'createItem', contractArgTypes: ['Integer', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray'], facadeMethod: 'createItem', invocationMode: 'write', safe: false },
  { operation: 'bindItem', contractArgTypes: ['Integer', 'Integer', 'PublicKey', 'Integer'], sdkArgTypes: ['Integer', 'Integer', 'ByteArray', 'Integer'], facadeMethod: 'bindItem', invocationMode: 'write', safe: false },
  { operation: 'lockItem', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'lockItem', invocationMode: 'write', safe: false },
  { operation: 'totalItems', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'totalItems', invocationMode: 'read', safe: true },
  { operation: 'getItem', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getItem', invocationMode: 'read', safe: true },
  { operation: 'getItemWithKey', contractArgTypes: ['PublicKey'], sdkArgTypes: ['ByteArray'], facadeMethod: 'getItemWithKey', invocationMode: 'read', safe: true },
  { operation: 'getItemWithTAC', contractArgTypes: ['Hash160', 'ByteArray'], sdkArgTypes: ['Hash160', 'ByteArray'], facadeMethod: 'getItemWithTac', invocationMode: 'read', safe: true },
  { operation: 'setItemProperty', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray'], facadeMethod: 'setItemProperty', invocationMode: 'write', safe: false },
  { operation: 'getItemProperties', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getItemProperties', invocationMode: 'read', safe: true },
  { operation: 'getAsset', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getAsset', invocationMode: 'read', safe: true },
  { operation: 'getAssetWithKey', contractArgTypes: ['PublicKey'], sdkArgTypes: ['ByteArray'], facadeMethod: 'getAssetWithKey', invocationMode: 'read', safe: true },
  { operation: 'getAssetBurnLog', contractArgTypes: ['Integer'], sdkArgTypes: ['Integer'], facadeMethod: 'getAssetBurnLog', invocationMode: 'read', safe: true },
  { operation: 'totalAssets', contractArgTypes: [], sdkArgTypes: [], facadeMethod: 'totalAssets', invocationMode: 'read', safe: true },
  { operation: 'authItem', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray', 'ByteArray', 'Boolean'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray', 'ByteArray', 'Boolean'], facadeMethod: 'authItem', invocationMode: 'write', safe: false },
  { operation: 'purgeItem', contractArgTypes: ['Integer', 'ByteArray', 'ByteArray'], sdkArgTypes: ['Integer', 'ByteArray', 'ByteArray'], facadeMethod: 'purgeItem', invocationMode: 'write', safe: false },
]

/**
 * Current contract operations intentionally not exposed by the TypeScript facade.
 * Each omission is explicit so future public API work has an audit trail.
 */
export const ITEM_UNEXPOSED_OPERATIONS = [
  { operation: 'unlockItem', reason: 'Lifecycle unlock facade has not been designed or documented for this SDK.' },
  { operation: 'authAsset', reason: 'Direct historical-asset authentication has no approved SDK facade contract yet.' },
] as const
