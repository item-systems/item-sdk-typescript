import { ItemAPI } from './api';
import { Utils } from './helpers';
import { u, wallet } from "@cityofzion/neon-core";
export class Item {
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
            invocations: [ItemAPI.symbol(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async decimals() {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.decimals(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async totalSupply() {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.totalSupply(this.config.scriptHash)],
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
            invocations: [ItemAPI.tokensOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const sessionId = res.session;
        const iteratorId = res.stack[0].id;
        const res2 = await this.config.invoker.traverseIterator(sessionId, iteratorId, 100);
        return res2.map(item => {
            return parseInt(u.reverseHex(u.base642hex(item.value)), 16);
        });
    }
    async balanceOf(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.balanceOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async transfer(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.transfer(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async transferConfirmed(params) {
        const txid = await this.transfer(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async ownerOf(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.ownerOf(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const scriptHash = this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
        return wallet.getAddressFromScriptHash(scriptHash.slice(2));
    }
    async tokens() {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.tokens(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        const sessionId = res.session;
        const iteratorId = res.stack[0].id;
        const res2 = await this.config.invoker.traverseIterator(sessionId, iteratorId, 100);
        return res2.map(item => {
            return parseInt(u.reverseHex(u.base642hex(item.value)), 16);
        });
    }
    async properties(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.properties(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.getUserJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async getUser(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.getUser(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.setUserPermissions(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async totalAccounts() {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.totalAccounts(this.config.scriptHash)],
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
            invocations: [ItemAPI.createEpoch(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async getEpochJSON(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.getEpochJSON(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.getEpoch(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async setMintFee(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.setMintFee(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async totalEpochs() {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.totalEpochs(this.config.scriptHash)],
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
            invocations: [ItemAPI.auth(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async authCommit(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.auth(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async authCommitConfirmed(params) {
        const txid = await this.authCommit(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async bindItem(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.bindItem(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async bindItemConfirmed(params, mock) {
        if (mock) {
            return true;
        }
        const txid = await this.bindItem(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async claimBindOnPickup(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.claimBindOnPickup(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async claimBindOnPickupConfirmed(params) {
        const txid = await this.claimBindOnPickup(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async setBindOnPickup(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.setBindOnPickup(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setBindOnPickupConfirmed(params) {
        const txid = await this.setBindOnPickup(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async getAssetItemJSON(params) {
        const res = await this.config.invoker.testInvoke({
            invocations: [ItemAPI.getAssetItemJSON(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.getItem(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.getItemJSON(this.config.scriptHash, params)],
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
            invocations: [ItemAPI.getItemJSONFlat(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    async offlineMint(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.offlineMint(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async offlineMintConfirmed(params) {
        const txid = await this.offlineMint(params);
        const log = await Utils.transactionCompletion(txid);
        if (log.executions[0].stack.length === 0) {
            throw new Error('unrecognized response');
        }
        return this.config.parser.parseRpcResponse(log.executions[0].stack[0]);
    }
    async lock(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.lock(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setItemProperties(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.setItemProperties(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async unbindToken(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.unbindToken(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async unbindAsset(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.unbindAsset(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async update(params) {
        return await this.config.invoker.invokeFunction({
            invocations: [ItemAPI.update(this.config.scriptHash, params)],
            signers: [],
        });
    }
}
// Once you get a scriptHash from deploying your smart contract via `npm run deploy`, update the `this.options.scriptHash` value.
// The default is analogous to localnet (neo-express) so you will most likely want to be updating that value.  Remember to
// compile the sdk before use or your change wont take effect.  Do that by running `tsc` in the sdk directory.
Item.MAINNET = '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840';
Item.TESTNET = '';
Item.PRIVATENET = '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840';
//# sourceMappingURL=Item.js.map