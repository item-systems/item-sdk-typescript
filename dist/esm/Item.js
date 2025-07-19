import { AdminAPI, AssetAPI, ConfigurationAPI, EpochAPI, ItemAPI, UserAPI } from './api/neoN3';
import { Utils } from './helpers';
import { NeoN3NetworkOptions } from './constants';
import { NeonParser, NeonInvoker, NeonEventListener } from '@cityofzion/neon-dappkit';
import { u, wallet } from '@cityofzion/neon-js';
const DEFAULT_OPTIONS = {
    node: NeoN3NetworkOptions.MainNet,
    scriptHash: '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d',
    parser: NeonParser,
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
export class Item {
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
            config.invoker = await NeonInvoker.init({
                rpcAddress: config.node,
                account: config.account,
            });
        }
        if (!config.listener) {
            config.listener = new NeonEventListener(config.node);
        }
        return new Item(config.scriptHash, config.node, config.invoker, config.listener, config.parser);
    }
    async update(params) {
        return await this.invoker.invokeFunction({
            invocations: [AdminAPI.update(this.scriptHash, params)],
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
            invocations: [UserAPI.createUser(this.scriptHash, params)],
            signers: [],
        });
    }
    async getUser(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.getUser(this.scriptHash, params)]);
        res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)));
        return res[0];
    }
    async getUserWithAddress(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [
            UserAPI.getUserWithAddress(this.scriptHash, params),
        ]);
        res[0].address = new wallet.Account(u.reverseHex(u.base642hex(res[0].address)));
        return res[0];
    }
    async setUserProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [UserAPI.setUserProperty(this.scriptHash, params)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [UserAPI.totalUsers(this.scriptHash)]);
        return res[0];
    }
    async totalItems() {
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.totalItems(this.scriptHash)]);
        return res[0];
    }
    async createItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [ItemAPI.createItem(this.scriptHash, params)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItem(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = u.str2hexstring(item.binding_token_id);
        item.seed = u.base642hex(item.seed);
        return item;
    }
    async getItemWithKey(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItemWithKey(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = u.str2hexstring(item.binding_token_id);
        item.seed = u.base642hex(item.seed);
        return item;
    }
    async getItemWithTac(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItemWithTac(this.scriptHash, params)]);
        const item = res[0];
        item.epoch.binding_script_hash = '0x' + u.reverseHex(u.base642hex(item.epoch.binding_script_hash));
        item.binding_token_id = u.str2hexstring(item.binding_token_id);
        item.seed = u.base642hex(item.seed);
        return item;
    }
    async getItemProperties(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.getItemProperties(this.scriptHash, params)]);
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
            invocations: [ItemAPI.setItemProperty(this.scriptHash, params)],
            signers: [],
        });
    }
    async bindItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [ItemAPI.bindItem(this.scriptHash, params)],
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
            invocations: [ItemAPI.lockItem(this.scriptHash, params)],
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
            invocations: [ItemAPI.authItem(this.scriptHash, params)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [ItemAPI.authItem(this.scriptHash, args)]);
        return res[0];
    }
    async purgeItem(params) {
        return await this.invoker.invokeFunction({
            invocations: [ItemAPI.purgeItem(this.scriptHash, params)],
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
            invocations: [EpochAPI.setEpochProperty(this.scriptHash, params)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.getEpoch(this.scriptHash, params)]);
        return res[0];
    }
    async getEpochItems(params) {
        const res = await this.invoker.testInvoke({
            invocations: [EpochAPI.getEpochItems(this.scriptHash, params)],
            signers: [],
        });
        const itemBytes = await Utils.handleIterator(res, this.invoker, this.parser);
        return itemBytes.map(item => {
            return parseInt(u.reverseHex(item), 16);
        });
    }
    async getEpochProperties(params) {
        const res = await this.invoker.testInvoke({
            invocations: [EpochAPI.getEpochProperties(this.scriptHash, params)],
            signers: [],
        });
        return Utils.handleIterator(res, this.invoker, this.parser);
    }
    async totalEpochs() {
        const res = await Utils.testInvoker(this.invoker, this.parser, [EpochAPI.totalEpochs(this.scriptHash)]);
        return res[0];
    }
    async createConfiguration() {
        return await this.invoker.invokeFunction({
            invocations: [ConfigurationAPI.createConfiguration(this.scriptHash)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [
            ConfigurationAPI.getConfiguration(this.scriptHash, params),
        ]);
        return res[0];
    }
    async setConfigurationProperty(params) {
        return await this.invoker.invokeFunction({
            invocations: [ConfigurationAPI.setConfigurationProperty(this.scriptHash, params)],
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
        const res = await Utils.testInvoker(this.invoker, this.parser, [
            ConfigurationAPI.getConfigurationProperties(this.scriptHash, params),
        ]);
        return Utils.handleIterator(res, this.invoker, this.parser);
    }
    async getConfigurationAssets(params) {
        const res = await this.invoker.testInvoke({
            invocations: [ConfigurationAPI.getConfigurationAssets(this.scriptHash, params)],
            signers: [],
        });
        const itemBytes = await Utils.handleIterator(res, this.invoker, this.parser);
        return itemBytes.map(item => {
            return parseInt(u.reverseHex(item), 16);
        });
    }
    async totalConfigurations() {
        const res = await Utils.testInvoker(this.invoker, this.parser, [
            ConfigurationAPI.totalConfigurations(this.scriptHash),
        ]);
        return res[0];
    }
    async getAsset(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAsset(this.scriptHash, params)]);
        const result = res[0];
        result.public_key = u.base642hex(result.public_key);
        return result;
    }
    async getAssetWithKey(params) {
        const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.getAssetWithKey(this.scriptHash, params)]);
        return res[0];
    }
    async getAssetBurnLog(params) {
        const res = await this.invoker.testInvoke({
            invocations: [AssetAPI.getAssetBurnLog(this.scriptHash, params)],
            signers: [],
        });
        return Utils.handleIterator(res, this.invoker, this.parser);
    }
    async totalAssets() {
        const res = await Utils.testInvoker(this.invoker, this.parser, [AssetAPI.totalAssets(this.scriptHash)]);
        return res[0];
    }
}
//# sourceMappingURL=Item.js.map