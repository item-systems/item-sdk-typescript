"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = void 0;
const neoN3_1 = require("./api/neoN3");
const helpers_1 = require("./helpers");
const constants_1 = require("./constants");
const neon_dappkit_1 = require("@cityofzion/neon-dappkit");
const neon_js_1 = require("@cityofzion/neon-js");
const IS1_1 = require("./api/neoN3/IS1");
const DEFAULT_OPTIONS = {
    node: constants_1.NeoN3NetworkOptions.MainNet,
    scriptHash: '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d',
    parser: neon_dappkit_1.NeonParser,
    account: undefined,
};
const TIMEOUT = 60000;
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
class Item {
    constructor(scriptHash, node, invoker, listener, parser) {
        this.scriptHash = scriptHash;
        this.node = node;
        this.invoker = invoker;
        this.listener = listener;
        this.parser = parser;
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// /////////////// CORE SCOPE /////////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    static async init(configOptions) {
        const config = { ...DEFAULT_OPTIONS, ...configOptions };
        if (!config.invoker) {
            config.invoker = await neon_dappkit_1.NeonInvoker.init({
                rpcAddress: config.node,
                account: config.account,
            });
        }
        if (!config.listener) {
            config.listener = new neon_dappkit_1.NeonEventListener(config.node);
        }
        return new Item(config.scriptHash, config.node, config.invoker, config.listener, config.parser);
    }
    async update(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.AdminAPI.update(this.scriptHash, params)],
            signers: [],
        });
    }
    async updateSync(params, opts) {
        const txId = await this.update(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        console.log(resp.executions[0].stack);
        console.log(resp.executions[0].notifications);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// //////// APPLICATION SCOPE /////////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    async createUser(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.UserAPI.createUser(this.scriptHash, params)],
            signers: [],
        });
    }
    async getUser(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.UserAPI.getUser(this.scriptHash, params)]);
        res[0].address = new neon_js_1.wallet.Account(neon_js_1.u.reverseHex(neon_js_1.u.base642hex(res[0].address)));
        return res[0];
    }
    async getUserWithAddress(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            neoN3_1.UserAPI.getUserWithAddress(this.scriptHash, params),
        ]);
        res[0].address = new neon_js_1.wallet.Account(neon_js_1.u.reverseHex(neon_js_1.u.base642hex(res[0].address)));
        return res[0];
    }
    async setUserProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.UserAPI.setUserProperty(this.scriptHash, params)],
            signers: [],
        });
    }
    async setUserPropertySync(params, opts) {
        const txId = await this.setUserProperty(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async totalUsers() {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.UserAPI.totalUsers(this.scriptHash)]);
        return res[0];
    }
    async totalItems() {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.totalItems(this.scriptHash)]);
        return res[0];
    }
    async createItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.createItem(this.scriptHash, params)],
            signers: [],
        });
    }
    async createItemSync(params, opts) {
        const txId = await this.createItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async getItem(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.getItem(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + neon_js_1.u.reverseHex(neon_js_1.u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = neon_js_1.u.str2hexstring(item.binding_token_id);
        item.seed = neon_js_1.u.base642hex(item.seed);
        return item;
    }
    async getItemWithKey(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.getItemWithKey(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + neon_js_1.u.reverseHex(neon_js_1.u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = neon_js_1.u.base642hex(item.binding_token_id);
        item.seed = neon_js_1.u.base642hex(item.seed);
        return item;
    }
    async getItemWithTac(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.getItemWithTac(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + neon_js_1.u.reverseHex(neon_js_1.u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = neon_js_1.u.str2hexstring(item.binding_token_id);
        item.seed = neon_js_1.u.base642hex(item.seed);
        return item;
    }
    async getItemProperties(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.getItemProperties(this.scriptHash, params)]);
        return res[0];
    }
    async setItemPropertySync(params, opts) {
        const txId = await this.setItemProperty(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async setItemProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.setItemProperty(this.scriptHash, params)],
            signers: [],
        });
    }
    async bindItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.bindItem(this.scriptHash, params)],
            signers: [],
        });
    }
    async bindItemSync(params, opts) {
        const txId = await this.bindItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async lockItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.lockItem(this.scriptHash, params)],
            signers: [],
        });
    }
    async lockItemSync(params, opts) {
        const txId = await this.lockItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async authItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.authItem(this.scriptHash, params)],
            signers: [],
        });
    }
    async authItemSync(params, opts) {
        const txId = await this.authItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async isAuthValid(params) {
        const args = { ...params, ...{ burn: false } };
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.ItemAPI.authItem(this.scriptHash, args)]);
        return res[0];
    }
    async purgeItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ItemAPI.purgeItem(this.scriptHash, params)],
            signers: [],
        });
    }
    async purgeItemSync(params, opts) {
        const txId = await this.purgeItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async setEpochProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.EpochAPI.setEpochProperty(this.scriptHash, params)],
            signers: [],
        });
    }
    async setEpochPropertySync(params, opts) {
        const txId = await this.setEpochProperty(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async getEpoch(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.EpochAPI.getEpoch(this.scriptHash, params)]);
        const result = res[0];
        result.binding_script_hash = '0x' + neon_js_1.u.reverseHex(neon_js_1.u.base642hex(result.binding_script_hash));
        return result;
    }
    async getEpochItems(params) {
        const res = await this.invoker.testInvoke({
            invocations: [neoN3_1.EpochAPI.getEpochItems(this.scriptHash, params)],
            signers: [],
        });
        const itemBytes = await helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
        return itemBytes.map(item => {
            return parseInt(neon_js_1.u.reverseHex(item), 16);
        });
    }
    async getEpochProperties(params) {
        const res = await this.invoker.testInvoke({
            invocations: [neoN3_1.EpochAPI.getEpochProperties(this.scriptHash, params)],
            signers: [],
        });
        return helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
    }
    async totalEpochs() {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.EpochAPI.totalEpochs(this.scriptHash)]);
        return res[0];
    }
    async createConfiguration() {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ConfigurationAPI.createConfiguration(this.scriptHash)],
            signers: [],
        });
    }
    async createConfigurationSync(opts) {
        const txId = await this.createConfiguration();
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async getConfiguration(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            neoN3_1.ConfigurationAPI.getConfiguration(this.scriptHash, params),
        ]);
        return res[0];
    }
    async setConfigurationProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [neoN3_1.ConfigurationAPI.setConfigurationProperty(this.scriptHash, params)],
            signers: [],
        });
    }
    async setConfigurationPropertySync(params, opts) {
        const txId = await this.setConfigurationProperty(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async getConfigurationProperties(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            neoN3_1.ConfigurationAPI.getConfigurationProperties(this.scriptHash, params),
        ]);
        return helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
    }
    async getConfigurationAssets(params) {
        const res = await this.invoker.testInvoke({
            invocations: [neoN3_1.ConfigurationAPI.getConfigurationAssets(this.scriptHash, params)],
            signers: [],
        });
        const itemBytes = await helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
        return itemBytes.map(item => {
            return parseInt(neon_js_1.u.reverseHex(item), 16);
        });
    }
    async totalConfigurations() {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            neoN3_1.ConfigurationAPI.totalConfigurations(this.scriptHash),
        ]);
        return res[0];
    }
    async getAsset(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.AssetAPI.getAsset(this.scriptHash, params)]);
        const result = res[0];
        result.public_key = neon_js_1.u.base642hex(result.public_key);
        return result;
    }
    async getAssetWithKey(params) {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.AssetAPI.getAssetWithKey(this.scriptHash, params)]);
        return res[0];
    }
    async getAssetBurnLog(params) {
        const res = await this.invoker.testInvoke({
            invocations: [neoN3_1.AssetAPI.getAssetBurnLog(this.scriptHash, params)],
            signers: [],
        });
        return helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
    }
    async totalAssets() {
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [neoN3_1.AssetAPI.totalAssets(this.scriptHash)]);
        return res[0];
    }
    async tokenProperties(params) {
        const item = await this.getItemWithKey(params);
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            IS1_1.IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
        ]);
        return res[0];
    }
    async tokenPropertiesWithNfid(params) {
        const item = await this.getItem(params);
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            IS1_1.IS1API.properties(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
        ]);
        return res[0];
    }
    // TODO - This needs to be done in a better way using the smart contract or dora and can be parallelized
    async itemsOf(params) {
        const totalEpochs = await this.totalEpochs();
        const items = [];
        const contracts = [];
        for (let localEid = 1; localEid <= totalEpochs; localEid++) {
            const epoch = await this.getEpoch({ localEid });
            if (contracts.indexOf(epoch.binding_script_hash) === -1) {
                contracts.push(epoch.binding_script_hash);
            }
        }
        for (let i = 0; i < contracts.length; i++) {
            const res = await this.invoker.testInvoke({
                invocations: [IS1_1.IS1API.tokensOf(contracts[i], params)],
                signers: []
            });
            const tokenIds = await helpers_1.Utils.handleIterator(res, this.invoker, this.parser);
            tokenIds.forEach((tokenId) => {
                items.push({
                    scriptHash: contracts[i],
                    tokenId,
                });
            });
        }
        return items;
    }
    async isClaimable(params) {
        const item = await this.getItemWithKey(params);
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            IS1_1.IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
        ]);
        return res[0];
    }
    async isClaimableWithNfid(params) {
        const item = await this.getItem(params);
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            IS1_1.IS1API.isClaimable(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
        ]);
        return res[0];
    }
    async claimItem(params) {
        const item = await this.getItemWithKey({ pubKey: params.pubKey });
        return await this.invoker.invokeFunction({
            invocations: [
                IS1_1.IS1API.claim(item.epoch.binding_script_hash, { tokenId: item.binding_token_id, auth: params.auth }),
            ],
            signers: [],
        });
    }
    async claimItemSync(params, opts) {
        const txId = await this.claimItem(params);
        const resp = await this.listener.waitForApplicationLog(txId, opts?.timeout ?? TIMEOUT);
        // @ts-ignore
        return this.parser.parseRpcResponse(resp.executions[0].stack[0]);
    }
    async ownerOf(params) {
        const item = await this.getItem(params);
        const res = await helpers_1.Utils.testInvoker(this.invoker, this.parser, [
            IS1_1.IS1API.ownerOf(item.epoch.binding_script_hash, { tokenId: item.binding_token_id }),
        ]);
        return neon_js_1.wallet.getAddressFromScriptHash(neon_js_1.u.reverseHex(neon_js_1.u.base642hex(res[0])));
    }
}
exports.Item = Item;
//# sourceMappingURL=Item.js.map