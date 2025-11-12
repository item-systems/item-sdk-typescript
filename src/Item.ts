import { AdminAPI, AssetAPI, ConfigurationAPI, EpochAPI, ItemAPI, UserAPI } from './api/neoN3'
import {
  AddressStub,
  AssetStub,
  AssetType,
  AuthItem,
  BindItem,
  ClaimItem,
  ConfigurationStub,
  ConfigurationType,
  ConstructorOptions,
  ContractUpdate,
  EpochStub,
  EpochType,
  IsAuthValid,
  ItemStub,
  ItemType,
  KeyStub,
  PurgeItem,
  RemoteToken,
  SetConfigurationProperty,
  SetEpochProperty,
  SetItemProperty,
  SetUserProperty,
  UserStub,
  UserType,
} from './types'
import { Utils } from './helpers'
import { NeoN3NetworkOptions } from './constants'
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
 * non-fungible token interactions as well as additional capabilities like authentication and configuration.
 *
 * To use this class:
 * ```typescript
 * import { Item } from '@item-systems/item'
 * import Neon from '@cityofzion/neon-js'
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

  /**
   * Initializes the Item interface and is required before interaction with the contract can take place.
   * This method accepts a number of configuration options that enable native local/WalletConnect interactions
   * as well as network and signer configuration.
   *
   * @param configOptions The settings for interacting with the network.
   */
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

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// ADMIN SCOPE ////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Updates the smart contract if the signer has the appropriate permissions.
   * @param params The contract update parameters
   * @return a transaction id; Utils.transactionCompletion() or updateSync() for a response.
   */
  async update(params: ContractUpdate): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [AdminAPI.update(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * A synchronous version of the update method, which waits for a response.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute
   * default is used.
   */
  async updateSync(params: ContractUpdate, timeout?: number): Promise<string> {
    const txId = await this.update(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)
    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// USER SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Creates a new user in the system.
   * @param params the properties required to create a new user in
   * the internal identity solution. The ultimate response is a LocalUid
   * representing the user.
   *
   * @return a transaction id; Use Util.transactionCompletion() to resolve the result.
   */
  async createUser(params: AddressStub): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.createUser(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Gets a user with their local uid.
   * @param params the properties required to get a user
   *
   * @return the user related to the queried id.
   */
  async getUser(params: UserStub): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.getUser(this.scriptHash, params)])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  /**
   * Gets the user metadata using their address. Response data includes permissions and settings in the contract.
   * @param params the Neo N3 formatted address of the user.
   *
   * @return the metadata of the user associated with the queried address
   */
  async getUserWithAddress(params: AddressStub): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      UserAPI.getUserWithAddress(this.scriptHash, params),
    ])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  /**
   * Sets a global property for a user account.
   * @param params the properties required to set a property
   *
   * @return a transaction id; Use Util.transactionCompletion() to resolve the result.
   */
  async setUserProperty(params: SetUserProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.setUserProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets a global property for a user account
   * @param params the properties required to set a user property
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute
   * default is used.
   *
   * @return A boolean indicating whether the attempt was successful
   */
  async setUserPropertySync(params: SetUserProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setUserProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Gets the total number of users in the system.
   * @return The total users
   */
  async totalUsers(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.totalUsers(this.scriptHash)])
    return res[0]
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// ITEM SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the total number of items in the system
   * @return The total items
   */
  async totalItems(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.totalItems(this.scriptHash)])
    return res[0]
  }

  /**
   * Creates a new item against an epoch. The user much be a manufacturer to use this method. This method is `usually`
   * called from inside a contract, but is exposed here to support admin workflows.
   * @param params the parameters required to create an item.
   * @return a transaction id; Use Util.transactionCompletion() to resolve the result or the synchronous equivalent
   * for a direct response.
   */
  async createItem(params: EpochStub): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.createItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Creates a new item against an epoch. The user much be a manufacturer to use this method. This method is `usually`
   * called from inside a contract, but is exposed here to support admin workflows.
   * @param params the parameters required to create an item.
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is
   * used.
   * @return the local NFID of the new item that was created.
   */
  async createItemSync(params: EpochStub, timeout?: number): Promise<number> {
    const txId = await this.createItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Gets the object representation of an item in the system.
   * @param params the parameters required to get an item
   * @return an object representing a non-fungible item including tokenized asset contract details
   */
  async getItem(params: ItemStub): Promise<ItemType> {
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

  /**
   * Gets the object representation of an item in the system using its public key.
   * @param params the parameters required to get an item
   * @return an object representing a non-fungible item including tokenized asset contract details
   */
  async getItemWithKey(params: KeyStub): Promise<ItemType> {
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

  /**
   * Gets the object representation of an item in the system using a reference to
   * the associated tokenized asset contract and tokenId. This is especially useful
   * for application developers who want to use the "native token id" of their project.
   * @param params the parameters required to get an item
   * @return an object representing a non-fungible item
   */
  async getItemWithTac(params: RemoteToken): Promise<ItemType> {
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

  // TODO - typing
  /**
   * Gets the properties of the selected item.
   * @param params the parameters required to get the properties
   * @return a json object outlining the properties of an NFI
   */
  async getItemProperties(params: ItemStub): Promise<any[]> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItemProperties(this.scriptHash, params)])
    return res[0]
  }

  /**
   * Sets the property of an item. The signer much be the manufacturer of the item.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a boolean indicating whether the attempt was successful
   */
  async setItemPropertySync(params: SetItemProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setItemProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Sets the property of an item. The signer much be the manufacturer of the item.
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async setItemProperty(params: SetItemProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.setItemProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Creates a new asset in the system and attaches it to the item, creating a complete NFI. The asset will supersede
   * an asset that is currently bound to the targeted item. The item MUST be in a `configuration` state. The asset must
   * be globally unique and unbound. This transaction must be signed by a manufacturer.
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async bindItem(params: BindItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.bindItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Creates a new asset in the system and attaches it to the item, creating a complete NFI. The asset will supersede
   * an asset that is currently bound to the targeted item. The item MUST be in a `configuration` state. The asset must
   * be globally unique and unbound. This transaction must be signed by a manufacturer.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return the asset id (localAsid) representing the new asset that was created in the binding process
   */
  async bindItemSync(params: BindItem, timeout?: number): Promise<number> {
    const txId = await this.bindItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Transitions an item from `configuration` to `locked` state. This transition prevents an NFI from being rebound to a
   * new asset without approvals by the TAC owner. The signer must be the manufacturer.
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async lockItem(params: ItemStub): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.lockItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Transitions an item from `configuration` to `locked` state. This transition prevents an NFI from being rebound to a
   * new asset without approvals by the TAC owner. The signer must be the manufacturer.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a boolean indicating whether the lock attempt was successful
   */
  async lockItemSync(params: ItemStub, timeout?: number): Promise<boolean> {
    const txId = await this.lockItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * attempts to use a proof to authenticate an item against a challenge
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async authItem(params: AuthItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.authItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * attempts to use a proof to authenticate an item against a challenge
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a boolean indicating whether the challenge was passed
   */
  async authItemSync(params: AuthItem, timeout?: number): Promise<boolean> {
    const txId = await this.authItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  // TODO - response typing
  /**
   * Checks if the challenge can be passed using the proof provided. This method is not published to a block.
   * @param params
   * @return a boolean indicating if the challenge passed
   */
  async isAuthValid(params: IsAuthValid): Promise<EpochType> {
    const args = { ...params, ...{ burn: false } }
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.authItem(this.scriptHash, args)])
    return res[0]
  }

  /**
   * Invalidates all proofs predating the execution of this method. Purging is a security solution designed to
   * mitigate signature leakage. It is also very useful when transferring an NFI to a new owner to prevent the old owner
   * from retaining access rights.
   * @param params
   *
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async purgeItem(params: PurgeItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.purgeItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Invalidates all proofs predating the execution of this method. Purging is a security solution designed to
   * mitigate signature leakage. It is also very useful when transferring an NFI to a new owner to prevent the old owner
   * from retaining access rights.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   *
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async purgeItemSync(params: PurgeItem, timeout?: number): Promise<boolean> {
    const txId = await this.purgeItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Sets an epoch property
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async setEpochProperty(params: SetEpochProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [EpochAPI.setEpochProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets an epoch property
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a boolean indicating whether the property was successfully set
   */
  async setEpochPropertySync(params: SetEpochProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setEpochProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Gets the object representation of an epoch
   * @param params
   * @return the requested epoch
   */
  async getEpoch(params: EpochStub): Promise<EpochType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.getEpoch(this.scriptHash, params)])
    const result = res[0]
    result.binding_script_hash = '0x' + u.reverseHex(u.base642hex(result.binding_script_hash))
    return result
  }

  /**
   * Gets all the items in an epoch. This is particularly used for manufacturers interested in
   * understanding all the items associated with a tokenized asset contract or for TAC owners to inventory their NFIs.
   * @param params
   * @return a list of all the NFIDs associated with an epoch
   */
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

  // TODO - typing
  /**
   * Gets the configuration properties of an epoch
   * @param params
   * @return an object outlining all the configured properties of an epoch
   */
  async getEpochProperties(params: EpochStub): Promise<any[]> {
    const res = await this.invoker.testInvoke({
      invocations: [EpochAPI.getEpochProperties(this.scriptHash, params)],
      signers: [],
    })
    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  /**
   * Gets the total number of epochs in the system.
   * @return the total number of epochs
   */
  async totalEpochs(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.totalEpochs(this.scriptHash)])
    return res[0]
  }

  /**
   * Creates a new configuration in the system. The signer must be a manufacturer.
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async createConfiguration(): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.createConfiguration(this.scriptHash)],
      signers: [],
    })
  }

  /**
   * Creates a new configuration in the system. The signer must be a manufacturer.
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   *
   * @return the Configuration ID (LocalCid) of the new configuration
   */
  async createConfigurationSync(timeout?: number): Promise<number> {
    const txId = await this.createConfiguration()
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /** Gets a manufacturing configuration
   *
   * @param params
   * @return the object formatted representation of a manufacturing configuration
   */
  async getConfiguration(params: ConfigurationStub): Promise<ConfigurationType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.getConfiguration(this.scriptHash, params),
    ])
    return res[0]
  }

  /**
   * Sets a property of a manufacturing configuration
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async setConfigurationProperty(params: SetConfigurationProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.setConfigurationProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets a property of a manufacturing configuration
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a boolean indicating whether the property was set
   */
  async setConfigurationPropertySync(params: SetConfigurationProperty, timeout?: number): Promise<number> {
    const txId = await this.setConfigurationProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  async getConfigurationProperties(params: ConfigurationStub): Promise<any[]> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.getConfigurationProperties(this.scriptHash, params),
    ])
    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  async getConfigurationAssets(params: ConfigurationStub): Promise<number[]> {
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

  async getAsset(params: AssetStub): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAsset(this.scriptHash, params)])
    const result = res[0]
    result.public_key = u.base642hex(result.public_key)
    return result
  }

  async getAssetWithKey(params: KeyStub): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAssetWithKey(this.scriptHash, params)])
    return res[0]
  }

  async getAssetBurnLog(params: AssetStub): Promise<string[]> {
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

  async tokenProperties(params: KeyStub): Promise<any> {
    const item = await this.getItemWithKey(params)
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  async tokenPropertiesWithNfid(params: ItemStub): Promise<any> {
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

  async isClaimable(params: KeyStub): Promise<string[]> {
    const item = await this.getItemWithKey(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  async isClaimableWithNfid(params: ItemStub): Promise<string[]> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  /**
   * implements the optional "claimItem" method on the IS1 standard to change the owner of the NFI on the tokenized
   * asset contract using an asset proof. This method calls the tokenized asset contract associated with the item.
   * @param params
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
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

  /**
   * implements the optional "claimItem" method on the IS1 standard to change the owner of the NFI on the tokenized
   * asset contract using an asset proof. This method calls the tokenized asset contract associated with the item.
   * @param params
   * @param timeout the timeout to wait for resolution in milliseconds. If one is not provided, a 1-minute timeout is used.
   * @return a transaction id; Use Utils.transactionCompletion() or the synchronous equivalent of this method to receive a result.
   */
  async claimItemSync(params: ClaimItem, timeout?: number): Promise<boolean> {
    const txId = await this.claimItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Gets the owner of an item. This method calls the bound tokenized asset contract to look up the owner.
   * @param params
   * @return the address of the item owner
   */
  async ownerOf(params: ItemStub): Promise<string> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.ownerOf(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return wallet.getAddressFromScriptHash(u.reverseHex(u.base642hex(res[0])))
  }
}
