import { expect } from 'chai'
import { abi } from '../../dist/esm/index.js'
import { AdminAPI } from '../../dist/esm/api/neoN3/admin.js'
import { AssetAPI } from '../../dist/esm/api/neoN3/asset.js'
import { ConfigurationAPI } from '../../dist/esm/api/neoN3/configuration.js'
import { EpochAPI } from '../../dist/esm/api/neoN3/epoch.js'
import { ItemAPI } from '../../dist/esm/api/neoN3/item.js'
import { UserAPI } from '../../dist/esm/api/neoN3/user.js'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'
const HEX = '00112233'
const KEY = '02c0ffee00112233445566778899aabbccddeeff00112233445566778899aabbcc'

const builders: Record<string, () => any> = {
  update: () => AdminAPI.update(SCRIPT_HASH, { script: HEX, manifest: HEX, data: null }),
  createUser: () => UserAPI.createUser(SCRIPT_HASH, { address: SCRIPT_HASH }),
  getUser: () => UserAPI.getUser(SCRIPT_HASH, { localUid: 1 }),
  getUserWithAddress: () => UserAPI.getUserWithAddress(SCRIPT_HASH, { address: SCRIPT_HASH }),
  setUserProperty: () => UserAPI.setUserProperty(SCRIPT_HASH, { localUid: 1, globalPid: HEX, state: HEX }),
  getUserProperties: () => UserAPI.getUserProperties(SCRIPT_HASH, { localUid: 1 }),
  totalUsers: () => UserAPI.totalUsers(SCRIPT_HASH),
  createEpoch: () => EpochAPI.createEpoch(SCRIPT_HASH),
  setEpochProperty: () => EpochAPI.setEpochProperty(SCRIPT_HASH, { localEid: 1, globalPid: HEX, state: HEX }),
  getEpoch: () => EpochAPI.getEpoch(SCRIPT_HASH, { localEid: 1 }),
  getEpochProperties: () => EpochAPI.getEpochProperties(SCRIPT_HASH, { localEid: 1 }),
  getEpochItems: () => EpochAPI.getEpochItems(SCRIPT_HASH, { localEid: 1 }),
  totalEpochs: () => EpochAPI.totalEpochs(SCRIPT_HASH),
  createConfiguration: () => ConfigurationAPI.createConfiguration(SCRIPT_HASH),
  setConfigurationProperty: () => ConfigurationAPI.setConfigurationProperty(SCRIPT_HASH, { localCid: 1, globalPid: HEX, state: HEX }),
  getConfiguration: () => ConfigurationAPI.getConfiguration(SCRIPT_HASH, { localCid: 1 }),
  getConfigurationProperties: () => ConfigurationAPI.getConfigurationProperties(SCRIPT_HASH, { localCid: 1 }),
  getConfigurationAssets: () => ConfigurationAPI.getConfigurationAssets(SCRIPT_HASH, { localCid: 1 }),
  totalConfigurations: () => ConfigurationAPI.totalConfigurations(SCRIPT_HASH),
  createItem: () => ItemAPI.createItem(SCRIPT_HASH, { localEid: 1, bindingTokenId: HEX }),
  bindItem: () => ItemAPI.bindItem(SCRIPT_HASH, { localNfid: 1, localCid: 2, pubKey: KEY, assetEllipticCurve: 23 }),
  lockItem: () => ItemAPI.lockItem(SCRIPT_HASH, { localNfid: 1 }),
  totalItems: () => ItemAPI.totalItems(SCRIPT_HASH),
  getItem: () => ItemAPI.getItem(SCRIPT_HASH, { localNfid: 1 }),
  getItemWithKey: () => ItemAPI.getItemWithKey(SCRIPT_HASH, { pubKey: KEY }),
  getItemWithTAC: () => ItemAPI.getItemWithTac(SCRIPT_HASH, { scriptHash: SCRIPT_HASH, tokenId: HEX }),
  setItemProperty: () => ItemAPI.setItemProperty(SCRIPT_HASH, { localNfid: 1, globalPid: HEX, state: HEX }),
  getItemProperties: () => ItemAPI.getItemProperties(SCRIPT_HASH, { localNfid: 1 }),
  getAsset: () => AssetAPI.getAsset(SCRIPT_HASH, { localAsid: 1 }),
  getAssetWithKey: () => AssetAPI.getAssetWithKey(SCRIPT_HASH, { pubKey: KEY }),
  getAssetBurnLog: () => AssetAPI.getAssetBurnLog(SCRIPT_HASH, { localAsid: 1 }),
  totalAssets: () => AssetAPI.totalAssets(SCRIPT_HASH),
  authItem: () => ItemAPI.authItem(SCRIPT_HASH, { localNfid: 1, auth: { message: HEX, proof: HEX }, burn: false }),
  purgeItem: () => ItemAPI.purgeItem(SCRIPT_HASH, { localNfid: 1, message: HEX, proof: HEX }),
}

describe('ITEM contract ABI compatibility inventory', () => {
  it('keeps every supported SDK invocation builder aligned to operation, arity, and transport types', () => {
    for (const expected of abi.ITEM_ABI_OPERATIONS) {
      const build = builders[expected.operation]
      expect(build, `missing builder fixture for ${expected.operation}`).to.be.a('function')

      const invocation = build()
      expect(invocation.operation).to.equal(expected.operation)
      expect(invocation.args?.map((arg: { type: string }) => arg.type)).to.deep.equal(expected.sdkArgTypes)
      expect(invocation.args).to.have.length(expected.contractArgTypes.length)
    }
  })

  it('serializes the manifest as ABI ByteArray bytes rather than a VM String', () => {
    const invocation = AdminAPI.update(SCRIPT_HASH, { script: '00112233', manifest: '7b7d', data: null }) as any

    expect(invocation.args).to.deep.equal([
      { type: 'ByteArray', value: 'ABEiMw==' },
      { type: 'ByteArray', value: 'e30=' },
      { type: 'Any', value: null },
    ])
  })

  it('keeps intentional ABI transport adaptations explicit', () => {
    for (const expected of abi.ITEM_ABI_OPERATIONS) {
      if (expected.contractArgTypes.join(',') !== expected.sdkArgTypes.join(',')) {
        expect(expected.contractArgTypes).to.include('PublicKey')
        expect(expected.sdkArgTypes).to.include('ByteArray')
      }
    }
  })

  it('records every contract operation without a facade as an explicit omission', () => {
    expect(abi.ITEM_UNEXPOSED_OPERATIONS.map(operation => operation.operation).sort()).to.deep.equal([
      'authAsset',
      'unlockItem',
    ])
    for (const operation of abi.ITEM_UNEXPOSED_OPERATIONS) {
      expect(operation.reason).to.be.a('string')
      expect(operation.reason.length).to.be.greaterThan(0)
    }
  })
})
