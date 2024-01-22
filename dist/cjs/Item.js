"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = void 0;
const api_1 = require("./api");
const helpers_1 = require("./helpers");
const neon_core_1 = require("@cityofzion/neon-core");
class Item {
    constructor(configOptions) {
        this.config = configOptions;
    }
    /**
     * DO NOT EDIT ME
     * The contract script hash that is being interfaced with.
     */
    get scriptHash() {
        if (this.config.scriptHash) {
            return this.config.scriptHash;
        }
        throw new Error('no scripthash defined');
    }
    async symbol() {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.symbol(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async decimals() {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.decimals(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async totalSupply() {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.totalSupply(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    // TODO - Iterator Support
    async tokensOf(params) {
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
    async balanceOf(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.balanceOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async transfer(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.transfer(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async transferConfirmed(params) {
        const txid = await this.transfer(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async ownerOf(params) {
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
    async tokens() {
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
    async properties(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.properties(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    // USER SCOPE
    async getUserJSON(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getUserJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async getUser(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getUser(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    // TODO
    async setUserPermissions(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setUserPermissions(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async totalAccounts() {
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.totalAccounts(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    // EPOCH SCOPE
    async createEpoch(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.createEpoch(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async getEpochJSON(params) {
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
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setMintFee(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async totalEpochs() {
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
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.auth(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async authCommitConfirmed(params) {
        const txid = await this.authCommit(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async bindItem(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.bindItem(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async bindItemConfirmed(params, mock) {
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
        const txid = await this.claimBindOnPickup(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async setBindOnPickup(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setBindOnPickup(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setBindOnPickupConfirmed(params) {
        const txid = await this.setBindOnPickup(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async getAssetItemJSON(params) {
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
        const res = await this.config.invoker.testInvoke({
            invocations: [api_1.ItemAPI.getItem(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async getItemJSON(params, mock) {
        if (mock) {
            return {
                description: 'An ITEM',
                image: 'https://props.coz.io/img/item/neo/2780587208/1.png',
                name: 'ITEM',
                asset: '0x9f0663cd392d918938a57de3d1318fca2c8130de',
                owner: '0x8a4c7d4629a4e58715945510c0350ae1a5e5a403',
                creator: '0x8a4c7d4629a4e58715945510c0350ae1a5e5a403',
                bindOnPickup: 0,
                seed: 'ÛØ0«[ýJcªãF\r\\Àa\x93',
                tokenId: 1,
                tokenURI: 'https://props.coz.io/tok/item/neo/2780587208/1',
                epoch: {
                    epochId: 1,
                    label: 'Consensus 2023',
                    authAge: 4,
                    epochTokenId: 1,
                    maxSupply: 100,
                    totalSupply: 10,
                    mintFee: 0,
                    sysFee: 0,
                },
                traits: {
                    color: 'white',
                },
            };
        }
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
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.offlineMint(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async offlineMintConfirmed(params) {
        const txid = await this.offlineMint(params);
        const log = await helpers_1.Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async lock(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.lock(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setItemProperties(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.setItemProperties(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async update(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [api_1.ItemAPI.update(this.config.scriptHash, params)],
            signers: [],
        });
    }
}
exports.Item = Item;
// Once you get a scriptHash from deploying your smart contract via `npm run deploy`, update the `this.options.scriptHash` value.
// The default is analogous to localnet (neo-express) so you will most likely want to be updating that value.  Remember to
// compile the sdk before use or your change wont take effect.  Do that by running `tsc` in the sdk directory.
Item.MAINNET = '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840';
Item.TESTNET = '';
Item.PRIVATENET = '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840';
//# sourceMappingURL=Item.js.map