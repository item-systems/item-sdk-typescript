import { sc, u } from '@cityofzion/neon-core';
export class ItemAPI {
    static symbol(scriptHash) {
        return {
            scriptHash,
            operation: 'symbol',
            args: [],
        };
    }
    static decimals(scriptHash) {
        return {
            scriptHash,
            operation: 'decimals',
            args: [],
        };
    }
    static totalSupply(scriptHash) {
        return {
            scriptHash,
            operation: 'totalSupply',
            args: [],
        };
    }
    static balanceOf(scriptHash, params) {
        return {
            scriptHash,
            operation: 'balanceOf',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static tokensOf(scriptHash, params) {
        return {
            scriptHash,
            operation: 'tokensOf',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static transfer(scriptHash, params) {
        return {
            scriptHash,
            operation: 'transfer',
            args: [
                { type: 'Hash160', value: params.to },
                { type: 'Integer', value: params.tokenId },
                { type: 'Any', value: params.data },
            ],
        };
    }
    static ownerOf(scriptHash, params) {
        return {
            scriptHash,
            operation: 'ownerOf',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    static tokens(scriptHash) {
        return {
            scriptHash,
            operation: 'tokens',
            args: [],
        };
    }
    static properties(scriptHash, params) {
        return {
            scriptHash,
            operation: 'properties',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    // USER SCOPE
    static getUserJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getUserJSON',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static getUser(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getUser',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static setUserPermissions(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getUser',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static totalAccounts(scriptHash) {
        return {
            scriptHash,
            operation: 'totalAccounts',
            args: [],
        };
    }
    // EPOCH SCOPE
    static createEpoch(scriptHash, params) {
        return {
            scriptHash,
            operation: 'createEpoch',
            args: [
                { type: 'String', value: params.label },
                { type: 'Integer', value: params.generatorInstanceId },
                { type: 'Integer', value: params.mintFee },
                { type: 'Integer', value: params.sysFee },
                { type: 'Integer', value: params.maxSupply },
                { type: 'Integer', value: params.authAge },
            ],
        };
    }
    static getEpochJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getEpochJSON',
            args: [{ type: 'Integer', value: params.epochId }],
        };
    }
    static getEpoch(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getEpoch',
            args: [{ type: 'Integer', value: params.epochId }],
        };
    }
    static setMintFee(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setMintFee',
            args: [
                { type: 'Integer', value: params.epochId },
                { type: 'Integer', value: params.amount },
            ],
        };
    }
    static totalEpochs(scriptHash) {
        return {
            scriptHash,
            operation: 'totalEpochs',
            args: [],
        };
    }
    // ITEM Scope
    static auth(scriptHash, params) {
        return {
            scriptHash,
            operation: 'auth',
            args: [
                { type: 'String', value: params.mode },
                { type: 'PublicKey', value: params.assetPubKey },
                { type: 'ByteArray', value: u.hex2base64(params.message) },
                { type: 'ByteArray', value: u.hex2base64(params.signature) },
                { type: 'Boolean', value: params.burn },
            ],
        };
    }
    static bindItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'bindItem',
            args: [
                { type: 'Integer', value: params.tokenId },
                { type: 'ByteArray', value: u.hex2base64(params.assetPubKey) },
            ],
        };
    }
    static setBindOnPickup(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setBindOnPickup',
            args: [
                { type: 'Integer', value: params.tokenId },
                { type: 'Boolean', value: params.state },
            ],
        };
    }
    static claimBindOnPickup(scriptHash, params) {
        return {
            scriptHash,
            operation: 'claimBindOnPickup',
            args: [
                { type: 'ByteArray', value: u.hex2base64(params.assetPubKey) },
                { type: 'ByteArray', value: u.hex2base64(params.message) },
                { type: 'ByteArray', value: u.hex2base64(params.signature) },
            ],
        };
    }
    static getAssetItemJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getAssetItemJSON',
            args: [{ type: 'ByteArray', value: u.hex2base64(params.assetPubKey) }],
        };
    }
    static getItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItem',
            args: [{ type: 'String', value: params.tokenId }],
        };
    }
    static getItemJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItemJSON',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    static getItemJSONFlat(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItemJSONFlat',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    static lock(scriptHash, params) {
        return {
            scriptHash,
            operation: 'lock',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    static offlineMint(scriptHash, params) {
        return {
            scriptHash,
            operation: 'offlineMint',
            args: [
                { type: 'Integer', value: params.epochId },
                { type: 'Hash160', value: params.address },
                { type: 'Boolean', value: params.bindOnPickup },
            ],
        };
    }
    static setItemProperties(scriptHash, params) {
        const properties = Object.keys(params.properties).map(key => {
            return sc.ContractParam.array(sc.ContractParam.string(key), sc.ContractParam.any(u.str2hexstring(params.properties[key]))).toJson();
        });
        return {
            scriptHash,
            operation: 'setItemProperties',
            args: [
                { type: 'Integer', value: params.tokenId },
                { type: 'Array', value: properties },
            ],
        };
    }
    static unbindToken(scriptHash, params) {
        return {
            scriptHash,
            operation: 'unbindToken',
            args: [{ type: 'Integer', value: params.tokenId }],
        };
    }
    static unbindAsset(scriptHash, params) {
        return {
            scriptHash,
            operation: 'unbindAsset',
            args: [{ type: 'ByteArray', value: u.hex2base64(params.assetPubKey) }],
        };
    }
    static update(scriptHash, params) {
        return {
            scriptHash,
            operation: 'update',
            args: [
                { type: 'ByteArray', value: params.script },
                { type: 'String', value: params.manifest },
                { type: 'Any', value: params.data },
            ],
        };
    }
}
//# sourceMappingURL=item.js.map