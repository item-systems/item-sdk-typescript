import { AdminAPI, AssetAPI, ConfigurationAPI, EpochAPI, ItemAPI, UserAPI } from './api/neoN3'
import {
  AddressStub,
  CreateItem,
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
  PropertyMap,
  KeyStub,
  PurgeItem,
  RemoteToken,
  AuthValidationResult,
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
 * High-level SDK facade for the ITEM smart contract on Neo N3.
 *
 * `Item` centralizes three concerns:
 * 1. building contract invocations through the generated API helpers,
 * 2. choosing the correct execution mode (`testInvoke` for reads, `invokeFunction` for writes), and
 * 3. normalizing Neo VM response data into application-friendly JavaScript/TypeScript values.
 *
 * The class is intentionally organized by domain scope rather than by raw contract file:
 * - admin operations for contract maintenance,
 * - user operations for identity and user-scoped properties,
 * - item operations for NFI lifecycle and authentication,
 * - epoch/configuration/asset operations for manufacturing and binding workflows,
 * - IS1 passthrough helpers for tokenized asset contract interactions.
 *
 * Read methods generally perform a `testInvoke`, parse the VM stack, and normalize byte-oriented fields into
 * ergonomic values such as addresses, script hashes, token ids, or property maps. Write methods generally return a
 * transaction id immediately; their `*Sync` counterparts wait for the application log and parse the first stack item
 * from the finalized execution.
 *
 * @example
 * ```typescript
 * import { Item } from '@item-systems/item'
 *
 * const item = await Item.init()
 * const totalItems = await item.totalItems()
 * console.log(totalItems)
 * ```
 */
export class Item {
  private constructor(
    /** Target ITEM contract script hash. */
    readonly scriptHash: string,
    /** RPC endpoint used for reads, writes, and event polling. */
    readonly node: string,
    /** Transaction/test invocation transport. */
    private invoker: Neo3Invoker,
    /** Application log listener used by synchronous write helpers. */
    private listener: Neo3EventListener,
    /** Stack parser used to convert Neo VM responses into JavaScript values. */
    private parser: Neo3Parser
  ) {}

  /**
   * Creates a ready-to-use SDK instance.
   *
   * If an invoker or listener is not supplied, the SDK creates Neon-based defaults using the configured node and
   * optional account. This makes `init()` suitable for both simple read-only clients and signer-backed write flows.
   *
   * @param configOptions Optional transport, parser, signer, network, and contract overrides.
   * @returns A configured `Item` instance bound to a specific contract and RPC endpoint.
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
   * Submits a contract update transaction.
   *
   * This is the low-level administrative upgrade path for the ITEM contract. The method only submits the transaction;
   * use {@link updateSync} or `Utils.transactionCompletion()` when the caller needs the execution result.
   *
   * @param params Replacement script, manifest, and optional update payload.
   * @returns The submitted transaction id.
   */
  async update(params: ContractUpdate): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [AdminAPI.update(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Submits a contract update and waits for the execution result.
   *
   * The ITEM contract returns its result in the first stack item of the application log execution. This helper hides
   * the polling/waiting mechanics and parses that stack item into a string result.
   *
   * @param params Replacement script, manifest, and optional update payload.
   * @param timeout Maximum wait time in milliseconds before the operation is considered unresolved.
   * @returns Parsed contract response from the finalized application log.
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
   * Creates a user record inside the ITEM identity model.
   *
   * The contract associates the provided address with an internal local user id. The returned transaction id can be
   * resolved later to obtain the created local uid.
   *
   * @param params Address payload for the user being registered.
   * @returns The submitted transaction id.
   */
  async createUser(params: AddressStub): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.createUser(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Loads a user by local uid.
   *
   * The parser returns the address as a base64-encoded byte array, so this method performs an additional normalization
   * step and converts it into a `wallet.Account` instance for downstream convenience.
   *
   * @param params User lookup stub containing `localUid`.
   * @returns Parsed user metadata with a normalized Neo account object.
   */
  async getUser(params: UserStub): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.getUser(this.scriptHash, params)])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  /**
   * Loads a user by Neo address.
   *
   * This is the address-oriented counterpart to {@link getUser}. It is useful when the caller knows the wallet address
   * but not the internal local uid assigned by the contract.
   *
   * @param params Address lookup payload.
   * @returns Parsed user metadata with a normalized Neo account object.
   */
  async getUserWithAddress(params: AddressStub): Promise<UserType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      UserAPI.getUserWithAddress(this.scriptHash, params),
    ])
    res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)))
    return res[0]
  }

  /**
   * Sets a user-scoped property.
   *
   * Properties are represented on-chain as byte-oriented key/value pairs. The contract enforces authorization and
   * property semantics; this method only submits the write transaction.
   *
   * @param params User id, global property id, and new property state.
   * @returns The submitted transaction id.
   */
  async setUserProperty(params: SetUserProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [UserAPI.setUserProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets a user-scoped property and waits for the boolean contract result.
   *
   * @param params User id, global property id, and new property state.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the contract reports a successful update.
   */
  async setUserPropertySync(params: SetUserProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setUserProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Retrieves all properties assigned to a user.
   *
   * The contract exposes properties through an iterator rather than a fully materialized map. This method traverses the
   * iterator session and returns a plain object keyed by hex-encoded global property id.
   *
   * @param params User lookup stub containing `localUid`.
   * @returns A property map of `globalPid -> state` in hex-string form.
   */
  async getUserProperties(params: UserStub): Promise<PropertyMap> {
    const res = await this.invoker.testInvoke({
      invocations: [UserAPI.getUserProperties(this.scriptHash, params)],
      signers: [],
    })
    return (await Utils.handlePropertyIterator(res, this.invoker, this.parser)) as PropertyMap
  }

  /**
   * Returns the total number of registered users.
   *
   * @returns Total user count as reported by the contract.
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
   * Returns the total number of ITEM records.
   *
   * @returns Total item count.
   */
  async totalItems(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.totalItems(this.scriptHash)])
    return res[0]
  }

  /**
   * Creates a new item inside an epoch.
   *
   * This is primarily a manufacturer/admin workflow. The contract associates the new item with an epoch and a binding
   * token id, but the method itself only submits the transaction.
   *
   * @param params Epoch id plus the external binding token id to associate with the new item.
   * @returns The submitted transaction id.
   */
  async createItem(params: CreateItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.createItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Creates a new item and waits for the newly assigned local NFID.
   *
   * @param params Epoch id plus binding token id.
   * @param timeout Maximum wait time in milliseconds.
   * @returns The created local NFID.
   */
  async createItemSync(params: CreateItem, timeout?: number): Promise<number> {
    const txId = await this.createItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Loads an item by local NFID.
   *
   * Unlike simpler read methods, item retrieval requires targeted post-processing because some fields are more useful in
   * raw byte form than in the parser's default representation. In particular:
   * - `binding_token_id` is forced to `ByteArray` parsing so token ids remain byte-exact,
   * - `epoch.binding_script_hash` is normalized to a conventional `0x`-prefixed script hash,
   * - `seed` is converted from base64 to hex for deterministic downstream handling.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns Fully normalized item metadata.
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
   * Loads an item by its asset public key.
   *
   * This is the public-key-oriented counterpart to {@link getItem}. The same normalization rules apply to token id,
   * epoch script hash, and seed fields.
   *
   * @param params Public key lookup payload.
   * @returns Fully normalized item metadata.
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
   * Loads an item by its remote tokenized-asset coordinates.
   *
   * This lookup path is especially useful for integrators that treat the tokenized asset contract as their primary
   * source of identity and only need to resolve back into ITEM metadata when necessary.
   *
   * @param params Remote token reference containing script hash and token id.
   * @returns Fully normalized item metadata.
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

  /**
   * Retrieves all item-scoped properties.
   *
   * The underlying contract returns an iterator session. This helper exhausts the iterator and materializes the result
   * into a plain object keyed by hex property id.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns A property map of `globalPid -> state` in hex-string form.
   */
  async getItemProperties(params: ItemStub): Promise<PropertyMap> {
    const res = await this.invoker.testInvoke({
      invocations: [ItemAPI.getItemProperties(this.scriptHash, params)],
      signers: [],
    })
    return (await Utils.handlePropertyIterator(res, this.invoker, this.parser)) as PropertyMap
  }

  /**
   * Sets an item-scoped property and waits for the contract result.
   *
   * @param params Item id, global property id, and new property state.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the contract reports success.
   */
  async setItemPropertySync(params: SetItemProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setItemProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Sets an item-scoped property.
   *
   * @param params Item id, global property id, and new property state.
   * @returns The submitted transaction id.
   */
  async setItemProperty(params: SetItemProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.setItemProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Binds a new asset to an item.
   *
   * Binding creates or replaces the active asset relationship for an item. The contract enforces the lifecycle rules:
   * the item must be in configuration state, the asset must be globally unique/unbound, and the caller must have the
   * required manufacturer authority.
   *
   * @param params Item id, configuration id, asset public key, and elliptic curve metadata.
   * @returns The submitted transaction id.
   */
  async bindItem(params: BindItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.bindItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Binds a new asset to an item and waits for the created asset id.
   *
   * @param params Item id, configuration id, asset public key, and elliptic curve metadata.
   * @param timeout Maximum wait time in milliseconds.
   * @returns The created local asset id.
   */
  async bindItemSync(params: BindItem, timeout?: number): Promise<number> {
    const txId = await this.bindItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Locks an item against unrestricted rebinding.
   *
   * This transitions the item from configuration state into locked state. After locking, rebinding requires the
   * additional approvals defined by the tokenized asset contract / ITEM lifecycle.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns The submitted transaction id.
   */
  async lockItem(params: ItemStub): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.lockItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Locks an item and waits for the boolean contract result.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the item was successfully locked.
   */
  async lockItemSync(params: ItemStub, timeout?: number): Promise<boolean> {
    const txId = await this.lockItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Submits an authentication attempt for an item.
   *
   * This is the stateful, on-chain authentication path. Depending on the challenge mode and `burn` flag, the attempt
   * may consume replayable proof material and mutate contract state.
   *
   * @param params Item id, challenge payload, and burn behavior.
   * @returns The submitted transaction id.
   */
  async authItem(params: AuthItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.authItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Submits an authentication attempt and waits for the boolean execution result.
   *
   * @param params Item id, challenge payload, and burn behavior.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the challenge passes on-chain.
   */
  async authItemSync(params: AuthItem, timeout?: number): Promise<boolean> {
    const txId = await this.authItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Simulates an authentication attempt without publishing a transaction.
   *
   * The helper intentionally forces `burn: false` before calling the same contract method used by {@link authItem}.
   * This makes the method safe for preflight validation while preserving the contract's real authentication logic.
   *
   * @param params Item id and challenge payload to validate.
   * @returns Structured validation result from the contract.
   */
  async isAuthValid(params: IsAuthValid): Promise<AuthValidationResult> {
    const args = { ...params, ...{ burn: false } }
    const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.authItem(this.scriptHash, args)])
    return res[0]
  }

  /**
   * Purges prior authentication proofs for an item.
   *
   * Purging is a security control that invalidates proofs predating the purge event. It is commonly used after custody
   * transfer or suspected proof leakage.
   *
   * @param params Item id plus the authorization material required to approve the purge.
   * @returns The submitted transaction id.
   */
  async purgeItem(params: PurgeItem): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ItemAPI.purgeItem(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Purges prior authentication proofs and waits for the boolean result.
   *
   * @param params Item id plus the authorization material required to approve the purge.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the purge succeeds.
   */
  async purgeItemSync(params: PurgeItem, timeout?: number): Promise<boolean> {
    const txId = await this.purgeItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Sets an epoch-scoped property.
   *
   * @param params Epoch id, global property id, and new property state.
   * @returns The submitted transaction id.
   */
  async setEpochProperty(params: SetEpochProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [EpochAPI.setEpochProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets an epoch-scoped property and waits for the boolean result.
   *
   * @param params Epoch id, global property id, and new property state.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the contract reports success.
   */
  async setEpochPropertySync(params: SetEpochProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setEpochProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Loads an epoch by local id.
   *
   * The contract returns the binding script hash as a byte array. This helper normalizes it to a conventional
   * `0x`-prefixed script hash string.
   *
   * @param params Epoch lookup stub containing `localEid`.
   * @returns Normalized epoch metadata.
   */
  async getEpoch(params: EpochStub): Promise<EpochType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.getEpoch(this.scriptHash, params)])
    const result = res[0]
    result.binding_script_hash = '0x' + u.reverseHex(u.base642hex(result.binding_script_hash))
    return result
  }

  /**
   * Lists all item ids associated with an epoch.
   *
   * The contract exposes epoch membership through an iterator of byte-encoded ids. This helper traverses the iterator
   * and converts each id into a JavaScript number.
   *
   * @param params Epoch lookup payload.
   * @returns All local NFIDs belonging to the epoch.
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

  /**
   * Retrieves all epoch-scoped properties.
   *
   * @param params Epoch lookup stub containing `localEid`.
   * @returns A property map of `globalPid -> state` in hex-string form.
   */
  async getEpochProperties(params: EpochStub): Promise<PropertyMap> {
    const res = await this.invoker.testInvoke({
      invocations: [EpochAPI.getEpochProperties(this.scriptHash, params)],
      signers: [],
    })
    return (await Utils.handlePropertyIterator(res, this.invoker, this.parser)) as PropertyMap
  }

  /**
   * Returns the total number of epochs.
   *
   * @returns Total epoch count.
   */
  async totalEpochs(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.totalEpochs(this.scriptHash)])
    return res[0]
  }

  /**
   * Creates a new manufacturing configuration.
   *
   * @returns The submitted transaction id.
   */
  async createConfiguration(): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.createConfiguration(this.scriptHash)],
      signers: [],
    })
  }

  /**
   * Creates a new manufacturing configuration and waits for the assigned local configuration id.
   *
   * @param timeout Maximum wait time in milliseconds.
   * @returns The created local configuration id.
   */
  async createConfigurationSync(timeout?: number): Promise<number> {
    const txId = await this.createConfiguration()
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Loads a manufacturing configuration.
   *
   * @param params Configuration lookup stub containing `localCid`.
   * @returns Parsed configuration metadata.
   */
  async getConfiguration(params: ConfigurationStub): Promise<ConfigurationType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.getConfiguration(this.scriptHash, params),
    ])
    return res[0]
  }

  /**
   * Sets a configuration-scoped property.
   *
   * @param params Configuration id, global property id, and new property state.
   * @returns The submitted transaction id.
   */
  async setConfigurationProperty(params: SetConfigurationProperty): Promise<string> {
    return await this.invoker.invokeFunction({
      invocations: [ConfigurationAPI.setConfigurationProperty(this.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Sets a configuration-scoped property and waits for the boolean result.
   *
   * @param params Configuration id, global property id, and new property state.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the contract reports success.
   */
  async setConfigurationPropertySync(params: SetConfigurationProperty, timeout?: number): Promise<boolean> {
    const txId = await this.setConfigurationProperty(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Retrieves all configuration-scoped properties.
   *
   * @param params Configuration lookup stub containing `localCid`.
   * @returns A property map of `globalPid -> state` in hex-string form.
   */
  async getConfigurationProperties(params: ConfigurationStub): Promise<PropertyMap> {
    const res = await this.invoker.testInvoke({
      invocations: [ConfigurationAPI.getConfigurationProperties(this.scriptHash, params)],
      signers: [],
    })
    return (await Utils.handlePropertyIterator(res, this.invoker, this.parser)) as PropertyMap
  }

  /**
   * Lists all asset ids associated with a configuration.
   *
   * @param params Configuration lookup stub containing `localCid`.
   * @returns All local asset ids linked to the configuration.
   */
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

  /**
   * Returns the total number of configurations.
   *
   * @returns Total configuration count.
   */
  async totalConfigurations(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      ConfigurationAPI.totalConfigurations(this.scriptHash),
    ])
    return res[0]
  }

  /**
   * Loads an asset by local asset id.
   *
   * The contract returns the public key in base64-encoded byte form; this helper converts it to a hex string so callers
   * can compare or persist it consistently.
   *
   * @param params Asset lookup stub containing `localAsid`.
   * @returns Normalized asset metadata.
   */
  async getAsset(params: AssetStub): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAsset(this.scriptHash, params)])
    const result = res[0]
    result.public_key = u.base642hex(result.public_key)
    return result
  }

  /**
   * Loads an asset by public key.
   *
   * @param params Public key lookup payload.
   * @returns Parsed asset metadata.
   */
  async getAssetWithKey(params: KeyStub): Promise<AssetType> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAssetWithKey(this.scriptHash, params)])
    return res[0]
  }

  /**
   * Retrieves the burn log for an asset.
   *
   * Burn logs are returned through an iterator and materialized into an ordered list of hex-encoded entries.
   *
   * @param params Asset lookup stub containing `localAsid`.
   * @returns Burn-log entries as hex strings.
   */
  async getAssetBurnLog(params: AssetStub): Promise<string[]> {
    const res = await this.invoker.testInvoke({
      invocations: [AssetAPI.getAssetBurnLog(this.scriptHash, params)],
      signers: [],
    })

    return Utils.handleIterator(res, this.invoker, this.parser)
  }

  /**
   * Returns the total number of assets.
   *
   * @returns Total asset count.
   */
  async totalAssets(): Promise<number> {
    const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.totalAssets(this.scriptHash)])
    return res[0]
  }

  /**
   * Reads tokenized-asset properties using an item's public key.
   *
   * This method first resolves the ITEM record, then delegates to the bound IS1 contract using the resolved binding
   * script hash and token id.
   *
   * @param params Public key lookup payload.
   * @returns Property map returned by the bound IS1 contract.
   */
  async tokenProperties(params: KeyStub): Promise<PropertyMap> {
    const item = await this.getItemWithKey(params)
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  /**
   * Reads tokenized-asset properties using a local NFID.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns Property map returned by the bound IS1 contract.
   */
  async tokenPropertiesWithNfid(params: ItemStub): Promise<PropertyMap> {
    const item = await this.getItem(params)
    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  /**
   * Enumerates remote tokens owned by an address across all known bound contracts.
   *
   * This helper is intentionally convenience-first rather than performance-first. It discovers all unique binding
   * contracts by scanning epochs, then queries each contract's `tokensOf` iterator. Large deployments may prefer a
   * dedicated indexer or a more parallelized implementation.
   *
   * @param params Address whose remote token holdings should be enumerated.
   * @returns Remote token references across all discovered binding contracts.
   */
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

  /**
   * Checks claimability for the tokenized asset associated with a public key.
   *
   * @param params Public key lookup payload.
   * @returns Claimability response from the bound IS1 contract.
   */
  async isClaimable(params: KeyStub): Promise<string[]> {
    const item = await this.getItemWithKey(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  /**
   * Checks claimability for the tokenized asset associated with a local NFID.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns Claimability response from the bound IS1 contract.
   */
  async isClaimableWithNfid(params: ItemStub): Promise<string[]> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return res[0]
  }

  /**
   * Claims ownership of the bound tokenized asset using an ITEM authentication proof.
   *
   * This method does not call the ITEM contract directly after item resolution. Instead, it resolves the bound tokenized
   * asset contract and invokes the optional IS1 `claim` method on that contract.
   *
   * @param params Asset public key, authentication payload, and optional receiver account.
   * @returns The submitted transaction id.
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
   * Claims ownership of the bound tokenized asset and waits for the boolean result.
   *
   * @param params Asset public key, authentication payload, and optional receiver account.
   * @param timeout Maximum wait time in milliseconds.
   * @returns `true` when the claim succeeds.
   */
  async claimItemSync(params: ClaimItem, timeout?: number): Promise<boolean> {
    const txId = await this.claimItem(params)
    const resp = await this.listener.waitForApplicationLog(txId, timeout ?? TIMEOUT)

    return this.parser.parseRpcResponse(resp.executions[0].stack[0] as RpcResponseStackItem)
  }

  /**
   * Resolves the current owner of an item from the bound tokenized asset contract.
   *
   * The IS1 `ownerOf` response is returned as script-hash bytes. This helper converts that value into a standard Neo
   * address string.
   *
   * @param params Item lookup stub containing `localNfid`.
   * @returns Current owner address.
   */
  async ownerOf(params: ItemStub): Promise<string> {
    const item = await this.getItem(params)

    const res = await Utils.testInvoker(this.invoker, this.parser, [
      IS1API.ownerOf(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
    ])
    return wallet.getAddressFromScriptHash(u.reverseHex(u.base642hex(res[0])))
  }
}
