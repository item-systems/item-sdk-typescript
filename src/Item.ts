import { ItemAPI } from './api'
import { ConstructorOptions, EpochType, ItemType, UserAccount } from './types'
import { Utils } from './helpers'
import { u, wallet } from '@cityofzion/neon-core'
import { NetworkOption } from './constants'
import { NeonParser } from '@cityofzion/neon-parser'
import { NeonInvoker } from '@cityofzion/neon-invoker'

const DEFAULT_OPTIONS: ConstructorOptions = {
  node: NetworkOption.MainNet,
  scriptHash: '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840',
  parser: NeonParser,
  account: undefined,
}

/**
 * The ITEM class is the primary interface point for the digital twin of an NFI. Use this class to execute standard
 * non-fungible token interations as well as additional capabilities like authentication and configuration. WalletConnect 2.0
 * has native support through the neon-invoker package.
 *
 * To use this class:
 * ```typescript
 * import { Item } from '@item-systems/item'
 * import Neon from '@cityofzion/neon-core'
 * import { NeonInvoker } from '@cityofzion/neon-invoker'
 * import { NeonParser } from '@cityofzion/neon-parser'
 *
 * const account = new Neon.wallet.Account()
 *
 * const item = new Item({
 *   scriptHash,
 *   invoker: await NeonInvoker.init(NODE, account),
 *   parser: NeonParser,
 * })
 * const totalItems = await item.totalSupply()
 * console.log(totalItems)
 * ```
 */
export class Item {
  private config: ConstructorOptions
  private initialized: boolean

  constructor(configOptions: ConstructorOptions = {}) {
    this.initialized = 'invoker' in configOptions
    this.config = { ...DEFAULT_OPTIONS, ...configOptions }
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// CORE SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the script hash of the smart contract.
   */
  get scriptHash(): string {
    if (this.config.scriptHash!) {
      return this.config.scriptHash!
    }
    throw new Error('no scripthash defined')
  }

  async init(): Promise<boolean> {
    if (!this.initialized) {
      this.config.invoker = await NeonInvoker.init(this.config.node as string, this.config.account)
      this.initialized = true
    }
    return true
  }

  /**
   * Returns the token symbol for the digital twin "ITEM". This is a great test method and exist primarily to support
   * existing token standard.
   */
  async symbol(): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.symbol(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * Returns the decimals supported by ITEMs. Currently, the ITEM contract does not support native fractional ownership.
   */
  async decimals(): Promise<number> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.decimals(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets the total number of ITEMS tracked in the contract.
   */
  async totalSupply(): Promise<number> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.totalSupply(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets the items owned by an entity.
   * @param params
   * @param params.address the address of the requested entity
   * @returns an array of pointers to the items owned
   */
  async tokensOf(params: { address: string }): Promise<number[]> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.tokensOf(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    const sessionId = res.session as string
    const iteratorId = res.stack[0].id as string

    const res2 = await this.config.invoker!.traverseIterator(sessionId, iteratorId, 100)
    return res2.map(item => {
      return parseInt(u.reverseHex(u.base642hex(item.value as string)), 16)
    })
  }

  /**
   * Gets the total NFI holdings of an entity
   * @param params
   * @param params.address the address of the requested entity
   */
  async balanceOf(params: { address: string }): Promise<number> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.balanceOf(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * Transfers ownership of an NFI from the owner to another entity. For a method which
   * considers block confirmations, refer to (transferConfirmed)[http://localhost:3000/docs/api/classes/Item#transferconfirmed].
   * @param params
   * @param params.to the destination address
   * @param params.tokenId the global id of the NFI to transfer
   * @param params.data parameters for handling upstream workflows (default: null)
   *
   * @return the transaction id for lookup on (dora)[https://dora.coz.io]
   */
  async transfer(params: { to: string; tokenId: number; data: any }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.transfer(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  /**
   * Transfers ownership of an NFI from the owner to another entity. This method confirms the block before returning
   * and will error if there is a confirmation issue.
   * @param params
   * @param params.to the destination address
   * @param params.tokenId the global id of the NFI to transfer
   * @param params.data parameters for handling upstream workflows (default: null)
   *
   * @return boolean Was the transfer successful?
   */
  async transferConfirmed(params: { to: string; tokenId: number; data: any }): Promise<string> {
    await this.init()
    const txid = await this.transfer(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async transferFungible(params: {
    tokenScriptHash: string
    transfers: { address: string; amount: number }[]
  }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: params.transfers.map(event => {
        return {
          scriptHash: params.tokenScriptHash,
          operation: 'transfer',
          args: [
            { type: 'Address', value: this.config.account?.address },
            { type: 'Address', value: event.address },
            { type: 'Integer', value: event.amount * 10 ** 8 },
            { type: 'Array', value: [] },
          ],
        }
      }),
      signers: [],
    })
  }

  /**
   * Gets the owner of the NFI.
   * @param params
   * @param params.tokenId the global id of the NFI
   *
   * @return the owning entity's address
   */
  async ownerOf(params: { tokenId: number }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.ownerOf(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    const scriptHash = this.config.parser!.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
    return wallet.getAddressFromScriptHash(scriptHash.slice(2))
  }

  /**
   * Gets every pointer for an NFI. This method exists for standards purposes.
   * Because we use incrementing pointers, using (totalSupply)[http://localhost:3000/docs/api/classes/Item#totalsupply]
   * and iterating from 1-"totalSupply" is more much more efficient.
   *
   * @return the list of globals ids for every NFI
   */
  async tokens(): Promise<number[]> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.tokens(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    const sessionId = res.session as string
    const iteratorId = res.stack[0].id as string

    const res2 = await this.config.invoker!.traverseIterator(sessionId, iteratorId, 100)

    return res2.map(item => {
      return parseInt(u.reverseHex(u.base642hex(item.value as string)), 16)
    })
  }

  /**
   * Gets the properties of the NFI. This method is designed to emulate existing
   * NFT standards for wallet support and marketplaces.
   * @param params
   * @param params.tokenId the global id for the NFI
   */
  async properties(params: { tokenId: number }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.properties(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// USER SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the user entity state in the smart contract including permissions
   * and NFI ownership.
   * @param params.address the entity you are requesting information about
   */
  async getUserJSON(params: { address: string }): Promise<UserAccount> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getUserJSON(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * RAW data payload for contract interfacing
   * @param params
   */
  async getUser(params: { address: string }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getUser(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /**
   * Updates a users permissions within the contract. This is a protected method.
   * @param params
   * @param params.address the entity to update
   * @param params.permissions the complete permission-set to update to
   */
  async setUserPermissions(params: { address: string; permissions: any }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.setUserPermissions(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  /**
   * Gets the total number of accounts managed in the smart contract
   * @return the number of accounts
   */
  async totalAccounts(): Promise<number> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.totalAccounts(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// USER SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Creates a
   * @param params
   */
  async createEpoch(params: {
    label: string
    generatorInstanceId: number
    mintFee: number
    sysFee: number
    maxSupply: number
    authAge: number
  }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.createEpoch(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async getEpochJSON(params: { epochId: number }): Promise<EpochType> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getEpochJSON(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  async getEpoch(params: { epochId: number }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getEpoch(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  async setMintFee(params: { epochId: number; amount: number }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.setMintFee(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async totalEpochs(): Promise<number> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.totalEpochs(this.config.scriptHash!)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  // ITEM SCOPE
  async auth(params: {
    mode: string
    assetPubKey: string
    message: string
    signature: string
    burn: boolean
  }): Promise<boolean> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.auth(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  async authCommit(params: {
    mode: string
    assetPubKey: string
    message: string
    signature: string
    burn: boolean
  }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.auth(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async authCommitConfirmed(params: {
    mode: string
    assetPubKey: string
    message: string
    signature: string
    burn: boolean
  }): Promise<boolean> {
    await this.init()
    const txid = await this.authCommit(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async bindItem(params: { tokenId: number; assetPubKey: string }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.bindItem(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async bindItemConfirmed(
    params: {
      tokenId: number
      assetPubKey: string
      blockIndex: number
      signature: string
    },
    mock?: boolean
  ): Promise<boolean> {
    await this.init()

    if (mock) {
      return true
    }

    const txid = await this.bindItem(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async claimBindOnPickup(params: { assetPubKey: string; message: string; signature: string }): Promise<string> {
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.claimBindOnPickup(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async claimBindOnPickupConfirmed(params: {
    assetPubKey: string
    message: string
    signature: string
  }): Promise<boolean> {
    await this.init()
    const txid = await this.claimBindOnPickup(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async setBindOnPickup(params: { tokenId: number; state: boolean }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.setBindOnPickup(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async setBindOnPickupConfirmed(params: { tokenId: number; state: boolean }): Promise<boolean> {
    await this.init()
    const txid = await this.setBindOnPickup(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async getAssetItemJSON(params: { assetPubKey: string }): Promise<ItemType> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getAssetItemJSON(this.config.scriptHash!, params)],
      signers: [],
    })
    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  async getItem(params: { tokenId: number }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getItem(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  async getItemJSON(params: { tokenId: number }): Promise<ItemType> {
    await this.init()

    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getItemJSON(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  async getItemJSONFlat(params: { tokenId: number }): Promise<string> {
    await this.init()
    const res = await this.config.invoker!.testInvoke({
      invocations: [ItemAPI.getItemJSONFlat(this.config.scriptHash!, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(res.stack[0])
  }

  async offlineMint(params: { epochId: number; address: string; bindOnPickup: boolean }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.offlineMint(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async offlineMintConfirmed(params: { epochId: number; address: string; bindOnPickup: boolean }): Promise<string> {
    await this.init()
    const txid = await this.offlineMint(params)
    const log = await Utils.transactionCompletion(txid)

    if (log.executions[0].stack!.length === 0) {
      throw new Error('unrecognized response')
    }

    return this.config.parser!.parseRpcResponse(log.executions[0].stack![0])
  }

  async lock(params: { tokenId: number }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.lock(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async setItemProperties(params: { tokenId: number; properties: any }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.setItemProperties(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async unbindToken(params: { tokenId: number }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.unbindToken(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async unbindAsset(params: { assetPubKey: string }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.unbindAsset(this.config.scriptHash!, params)],
      signers: [],
    })
  }

  async update(params: { script: string; manifest: string; data: any }): Promise<string> {
    await this.init()
    return await this.config.invoker!.invokeFunction({
      invocations: [ItemAPI.update(this.config.scriptHash!, params)],
      signers: [],
    })
  }
}
