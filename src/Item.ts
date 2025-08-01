import { AdminAPI, AssetAPI, ConfigurationAPI, EpochAPI, ItemAPI, UserAPI } from './api/neoN3'
import {
  AssetType,
  ClaimItem,
  ConfigurationType,
  ConstructorOptions,
  EpochType,
  ItemType,
  RemoteToken,
  UserType,
} from './types'
import { Utils } from './helpers'
import { NeoN3EllipticCurves, NeoN3NetworkOptions } from './constants'
import { NeonParser, NeonInvoker, NeonEventListener } from '@cityofzion/neon-dappkit'
import {
  Neo3EventListener,
  Neo3Invoker,
  Neo3Parser,
  RpcResponseStackItem,
  TypeChecker,
} from '@cityofzion/neon-dappkit-types'
import { u, wallet } from '@cityofzion/neon-js'
import { IS1API } from './api/neoN3/IS1'

const DEFAULT_OPTIONS: ConstructorOptions = {
  node: NeoN3NetworkOptions.MainNet,
  scriptHash: '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d',
  parser: NeonParser,
  account: undefined,
}

const TIMEOUT = 60000

/**
 * The ITEM class is the primary interface point for the digital twin of an NFI. Use this class to execute standard
 * non-fungible token interations as well as additional capabilities like authentication and configuration. WalletConnect 2.0
 * has native support through the neon-invoker package.
 *
 * To use this class:
 * ```typescript
 * import { Item } from '@item-systems/item'
 * import Neon from '@cityofzion/neon-js'
 *
 * const account = new Neon.wallet.Account()
 *
 * const item = await Item.init()
 * const totalItems = await item.totalItems()
 * console.log(totalItems)
 * ```
 */
export class Item {
  private constructor(
    readonly scriptHash: string,
    readonly node: string,
    private invoker: Neo3Invoker,
    private listener: Neo3EventListener,
    private parser: Neo3Parser
  ) {}

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// CORE SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  static async init(configOptions?: ConstructorOptions): Promise<Item> {
    const config = { ...DEFAULT_OPTIONS, ...configOptions }

    if (!config.invoker) {
      config.invoker = await NeonInvoker.init({
        rpcAddress: config.node!,
        account: config.account,
      })
    }

    if (!config.listener) {
      config.listener = new NeonEventListener(config.node!)
    }

    return new Item(config.scriptHash!, config.node!, config.invoker, config.listener, config.parser!)
  }

  async update(params: { script: string; manifest: string; data: any }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [AdminAPI.update(this.scriptHash, params)],
      signers: [],
    })
  }

  async updateSync(
    params: {
      script: string
      manifest: string
      data: any
    },
    opts?: any
  ): Promise<string> {
    const txId = await this.update(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)
    console.log(resp.executions[0].stack)
    console.log(resp.executions[0].notifications)
    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// //////// APPLICATION SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  async createUser(params: { address: string }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.createUser(this.scriptHash, params)],
      signers: [],
    })
  }

  async getUser(params: { localUid: number }): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.getUser(this.scriptHash, params)])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  async getUserWithAddress(params: { address: string }): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      UserAPI.getUserWithAddress(this.scriptHash, params),
    ])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  async setUserProperty(params: { localUid: number; globalPid: string; state: string }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.setUserProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  async setUserPropertySync(
    params: { localUid: number; globalPid: string; state: string },
    opts?: any
  ): Promise<boolean> {
    const txId = await this.setUserProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async totalUsers(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.totalUsers(this.scriptHash)])
    return res[0]
  }

  async totalItems(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.totalItems(this.scriptHash)])
    return res[0]
  }

  async createItem(params: { localEid: number }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.createItem(this.scriptHash, params)],
      signers: [],
    })
  }

  async createItemSync(params: { localEid: number }, opts?: any): Promise<number> {
    const txId = await this.createItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async getItem(params: { localNfid: number }): Promise<ItemType> {
    const resRaw = await Utils.testInvokerRaw(this.invoker, [ItemAPI.getItem(this.scriptHash, params)])
    const itemRaw = resRaw.stack[0]
    if (!TypeChecker.isStackTypeMap(itemRaw)) {
      throw new Error(`unrecognized response. Got ${itemRaw.type} instead of Map`)
    }

    const item = this.parser.parseRpcResponse(itemRaw)

    const bindingTokenIdRaw = itemRaw.value.filter((pair: any) => {
      return pair.key.value === this.parser.strToBase64('binding_token_id')
    })[0].value
    item.binding_token_id = this.parser.parseRpcResponse(bindingTokenIdRaw, { type: 'ByteArray' })

    item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash))
    item.seed = u.base642hex(item.seed)

    return item
  }

  async getItemWithKey(params: { pubKey: string }): Promise<ItemType> {
    const resRaw = await Utils.testInvokerRaw(this.invoker, [ItemAPI.getItemWithKey(this.scriptHash, params)])
    const itemRaw = resRaw.stack[0]
    if (!TypeChecker.isStackTypeMap(itemRaw)) {
      throw new Error(`unrecognized response. Got ${itemRaw.type} instead of Map`)
    }

    const item = this.parser.parseRpcResponse(itemRaw)

    const bindingTokenIdRaw = itemRaw.value.filter((pair: any) => {
      return pair.key.value === this.parser.strToBase64('binding_token_id')
    })[0].value
    item.binding_token_id = this.parser.parseRpcResponse(bindingTokenIdRaw, { type: 'ByteArray' })

    item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash))
    item.seed = u.base642hex(item.seed)

    return item
  }

  async getItemWithTac(params: { tacScriptHash: string; tokenId: string }): Promise<ItemType> {
    const resRaw = await Utils.testInvokerRaw(this.invoker, [ItemAPI.getItemWithTac(this.scriptHash, params)])
    const itemRaw = resRaw.stack[0]
    if (!TypeChecker.isStackTypeMap(itemRaw)) {
      throw new Error(`unrecognized response. Got ${itemRaw.type} instead of Map`)
    }

    const item = this.parser.parseRpcResponse(itemRaw)

    const bindingTokenIdRaw = itemRaw.value.filter((pair: any) => {
      return pair.key.value === this.parser.strToBase64('binding_token_id')
    })[0].value
    item.binding_token_id = this.parser.parseRpcResponse(bindingTokenIdRaw, { type: 'ByteArray' })

    item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash))
    item.seed = u.base642hex(item.seed)

    return item
  }

  async getItemProperties(params: { localNfid: number }): Promise<any[]> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItemProperties(this.scriptHash, params)])
    return res[0]
  }

  async setItemPropertySync(
    params: { localNfid: number; globalPid: string; state: string },
    opts?: any
  ): Promise<boolean> {
    const txId = await this.setItemProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async setItemProperty(params: { localNfid: number; globalPid: string; state: string }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.setItemProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  async bindItem(params: {
    localNfid: number
    localCid: number
    pubKey: string
    assetEllipticCurve: NeoN3EllipticCurves
  }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.bindItem(this.scriptHash, params)],
      signers: [],
    })
  }

  async bindItemSync(
    params: {
      localNfid: number
      localCid: number
      pubKey: string
      assetEllipticCurve: NeoN3EllipticCurves
    },
    opts?: any
  ): Promise<number> {
    const txId = await this.bindItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async lockItem(params: { localNfid: number }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.lockItem(this.scriptHash, params)],
      signers: [],
    })
  }

  async lockItemSync(params: { localNfid: number }, opts?: any): Promise<boolean> {
    const txId = await this.lockItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async authItem(params: {
    localNfid: number
    message: string
    proof: string
    challenge: string
    burn: boolean
  }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.authItem(this.scriptHash, params)],
      signers: [],
    })
  }

  async authItemSync(
    params: {
      localNfid: number
      message: string
      proof: string
      challenge: string
      burn: boolean
    },
    opts?: any
  ): Promise<boolean> {
    const txId = await this.authItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async isAuthValid(params: {
    localNfid: number
    message: string
    proof: string
    challenge: string
  }): Promise<EpochType> {
    const args = { ...params, ...{ burn: false } }
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.authItem(this.scriptHash, args)])
    return res[0]
  }

  async purgeItem(params: { localNfid: number; message: string; signature: string }): Promise<any> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.purgeItem(this.scriptHash, params)],
      signers: [],
    })
  }

  async purgeItemSync(params: { localNfid: number; message: string; signature: string }, opts?: any): Promise<boolean> {
    const txId = await this.purgeItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async setEpochProperty(params: { localEid: number; globalPid: string; state: string }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [EpochAPI.setEpochProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  async setEpochPropertySync(
    params: { localEid: number; globalPid: string; state: string },
    opts?: any
  ): Promise<boolean> {
    const txId = await this.setEpochProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async getEpoch(params: { localEid: number }): Promise<EpochType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.getEpoch(this.scriptHash, params)])
    const result = res[0]
    result.binding_script_hash = '0x' + u.reverseHex(u.base642hex(result.binding_script_hash))
    return result
  }

  async getEpochItems(params: { localEid: number }): Promise<number[]> {
    const res = await this.invoker.testInvoke({
      invocations: [EpochAPI.getEpochItems(this.scriptHash, params)],
      signers: [],
    })

    const itemBytes: string[] = await Utils.handleIterator(res, this.invoker, this.parser)
    return itemBytes.map(item => {
      return parseInt(u.reverseHex(item), 16)
    })
  }

  async getEpochProperties(params: { localEid: number }): Promise<any[]> {
    const res = await this.invoker.testInvoke({
      invocations: [EpochAPI.getEpochProperties(this.scriptHash, params)],
      signers: [],
    })
    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  async totalEpochs(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.totalEpochs(this.scriptHash)])
    return res[0]
  }

  async createConfiguration(): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.createConfiguration(this.scriptHash)],
      signers: [],
    })
  }

  async createConfigurationSync(opts?: any): Promise<number> {
    const txId = await this.createConfiguration()
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async getConfiguration(params: { localCid: number }): Promise<ConfigurationType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.getConfiguration(this.scriptHash, params),
    ])
    return res[0]
  }

  async setConfigurationProperty(params: { localCid: number; globalPid: string; state: string }): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.setConfigurationProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  async setConfigurationPropertySync(
    params: { localCid: number; globalPid: string; state: string },
    opts?: any
  ): Promise<number> {
    const txId = await this.setConfigurationProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async getConfigurationProperties(params: { localCid: number }): Promise<any[]> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.getConfigurationProperties(this.scriptHash, params),
    ])
    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  async getConfigurationAssets(params: { localCid: number }): Promise<number[]> {
    const res = await this.invoker.testInvoke({
      invocations: [ConfigurationAPI.getConfigurationAssets(this.scriptHash, params)],
      signers: [],
    })
    const itemBytes: string[] = await Utils.handleIterator(res, this.invoker, this.parser)
    return itemBytes.map(item => {
      return parseInt(u.reverseHex(item), 16)
    })
  }

  async totalConfigurations(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.totalConfigurations(this.scriptHash),
    ])
    return res[0]
  }

  async getAsset(params: { localAsid: number }): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAsset(this.scriptHash, params)])
    const result = res[0]
    result.public_key = u.base642hex(result.public_key)
    return result
  }

  async getAssetWithKey(params: { assetPubKey: string }): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAssetWithKey(this.scriptHash, params)])
    return res[0]
  }

  async getAssetBurnLog(params: { localAsid: number }): Promise<string[]> {
    const res = await this.invoker.testInvoke({
      invocations: [AssetAPI.getAssetBurnLog(this.scriptHash, params)],
      signers: [],
    })

    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  async totalAssets(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.totalAssets(this.scriptHash)])
    return res[0]
  }

  async tokenProperties(params: { pubKey: string }): Promise<any> {
    const item = await this.getItemWithKey(params)
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  async tokenPropertiesWithNfid(params: { localNfid: number }): Promise<any> {
    const item = await this.getItem(params)
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  // TODO - This needs to be done in a better way using the smart contract or dora and can be parallelized
  async itemsOf(params: { address: string }): Promise<RemoteToken[]> {
    const totalEpochs = await this.totalEpochs()

    const items: RemoteToken[] = []
    const contracts: string[] = []
    for (let localEid = 1; localEid <= totalEpochs; localEid++) {
      const epoch = await this.getEpoch({ localEid })
      if (contracts.indexOf(epoch.binding_script_hash) === -1) {
        contracts.push(epoch.binding_script_hash)
      }
    }

    for (let i = 0; i < contracts.length; i++) {
      const res = await this.invoker.testInvoke({
        invocations: [IS1API.tokensOf(contracts[i], params)],
        signers: [],
      })
      const tokenIds: string[] = await Utils.handleIterator(res, this.invoker, this.parser)
      tokenIds.forEach((tokenId: string) => {
        items.push({
          scriptHash: contracts[i],
          tokenId,
        })
      })
    }
    return items
  }

  async isClaimable(params: { pubKey: string }): Promise<string[]> {
    const item = await this.getItemWithKey(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  async isClaimableWithNfid(params: { localNfid: number }): Promise<string[]> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  async claimItem(params: ClaimItem): Promise<string> {
    const item = await this.getItemWithKey({ pubKey: params.pubKey })

    return await this.invoker.invokeFunction({
      invocations: [
        IS1API.claim(item.epoch.binding_script_hash, {
          tokenId: item.binding_token_id,
          auth: params.auth,
          receiverAccount: params.receiverAccount,
        }),
      ],
      signers: [],
    })
  }

  async claimItemSync(params: ClaimItem, opts?: any): Promise<boolean> {
    const txId = await this.claimItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT)

    // @ts-ignore
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async ownerOf(params: { localNfid: number }): Promise<string> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.ownerOf(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return wallet.getAddressFromScriptHash(u.reverseHex(u.base642hex(res[0])))
  }
}
