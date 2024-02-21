"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = void 0;
const api_1 = require("./api");
const helpers_1 = require("./helpers");
const neon_core_1 = require("@cityofzion/neon-core");
const constants_1 = require("./constants");
const neon_parser_1 = require("@cityofzion/neon-parser");
const neon_invoker_1 = require("@cityofzion/neon-invoker");
const DEFAULT_OPTIONS = {
    node: constants_1.NetworkOption.MainNet,
    scriptHash: '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840',
    parser: neon_parser_1.NeonParser,
    account: undefined,
};
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
class Item {
    constructor(configOptions = {}) {
        this.initialized = 'invoker' in configOptions;
        this.config = { ...DEFAULT_OPTIONS, ...configOptions };
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// /////////////// CORE SCOPE /////////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /**
     * Gets the script hash of the smart contract.
     */
    get scriptHash() {
        if (this.config.scriptHash) {
            return this.config.scriptHash;
        }
        throw new Error('no scripthash defined');
    }
    async init() {
        if (!this.initialized) {
            this.config.invoker = await neon_invoker_1.NeonInvoker.init(this.config.node, this.config.account);
            this.initialized = true;
        }
        return true;
    }
    /**
     * Returns the token symbol for the digital twin "ITEM". This is a great test method and exist primarily to support
     * existing token standard.
     */
    async symbol() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.symbol(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Returns the decimals supported by ITEMs. Currently, the ITEM contract does not support native fractional ownership.
     */
    async decimals() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.decimals(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets the total number of ITEMS tracked in the contract.
     */
    async totalSupply() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.totalSupply(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets the items owned by an entity.
     * @param params
     * @param params.address the address of the requested entity
     * @returns an array of pointers to the items owned
     */
    async tokensOf(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.tokensOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const sessionId = res.session;
        const iteratorId = res.stack[0].id;
        const res2 = await this.config.invoker.traverseIterator(sessionId, iteratorId, 100);
        return res2.map(item => {
            return parseInt(neon_core_1.u.reverseHex(neon_core_1.u.base642hex(item.value)), 16);
        });
    }
    /**
     * Gets the total NFI holdings of an entity
     * @param params
     * @param params.address the address of the requested entity
     */
    async balanceOf(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.balanceOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
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
    async transfer(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.transfer(this.config.scriptHash, params)],
            signers: [],
        });
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
    async transferConfirmed(params) {
        await this.init();
        const txid = await this.transfer(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    /**
     * Gets the owner of the NFI.
     * @param params
     * @param params.tokenId the global id of the NFI
     *
     * @return the owning entity's address
     */
    async ownerOf(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.ownerOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const scriptHash = this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
        return neon_core_1.wallet.getAddressFromScriptHash(scriptHash.slice(2));
    }
    /**
     * Gets every pointer for an NFI. This method exists for standards purposes.
     * Because we use incrementing pointers, using (totalSupply)[http://localhost:3000/docs/api/classes/Item#totalsupply]
     * and iterating from 1-"totalSupply" is more much more efficient.
     *
     * @return the list of globals ids for every NFI
     */
    async tokens() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.tokens(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const sessionId = res.session;
        const iteratorId = res.stack[0].id;
        const res2 = await this.config.invoker.traverseIterator(sessionId, iteratorId, 100);
        return res2.map(item => {
            return parseInt(neon_core_1.u.reverseHex(neon_core_1.u.base642hex(item.value)), 16);
        });
    }
    /**
     * Gets the properties of the NFI. This method is designed to emulate existing
     * NFT standards for wallet support and marketplaces.
     * @param params
     * @param params.tokenId the global id for the NFI
     */
    async properties(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.properties(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
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
    async getUserJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getUserJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * RAW data payload for contract interfacing
     * @param params
     */
    async getUser(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getUser(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Updates a users permissions within the contract. This is a protected method.
     * @param params
     * @param params.address the entity to update
     * @param params.permissions the complete permission-set to update to
     */
    async setUserPermissions(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setUserPermissions(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /**
     * Gets the total number of accounts managed in the smart contract
     * @return the number of accounts
     */
    async totalAccounts() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.totalAccounts(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
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
    async createEpoch(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.createEpoch(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async getEpochJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getEpochJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
    }
    async getEpoch(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getEpoch(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async setMintFee(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setMintFee(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async totalEpochs() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.totalEpochs(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    // ITEM SCOPE
    async auth(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.auth(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async authCommit(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.auth(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async authCommitConfirmed(params) {
        await this.init();
        const txid = await this.authCommit(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async bindItem(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.bindItem(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async bindItemConfirmed(params, mock) {
        await this.init();
        if (mock) {
            return true;
        }
        const txid = await this.bindItem(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async claimBindOnPickup(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.claimBindOnPickup(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async claimBindOnPickupConfirmed(params) {
        await this.init();
        const txid = await this.claimBindOnPickup(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async setBindOnPickup(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setBindOnPickup(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setBindOnPickupConfirmed(params) {
        await this.init();
        const txid = await this.setBindOnPickup(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async getAssetItemJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getAssetItemJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
    }
    async getItem(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getItem(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async getItemJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getItemJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
    }
    async getItemJSONFlat(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getItemJSONFlat(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async offlineMint(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.offlineMint(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async offlineMintConfirmed(params) {
        await this.init();
        const txid = await this.offlineMint(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async lock(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.lock(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setItemProperties(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setItemProperties(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async unbindToken(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.unbindToken(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async unbindAsset(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.unbindAsset(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async update(params) {
        await this.init();
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.update(this.config.scriptHash, params)],
            signers: [],
        });
    }
}
exports.Item = Item;
//# sourceMappingURL=Item.js.map