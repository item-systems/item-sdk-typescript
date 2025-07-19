"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetAPI = void 0;
class AssetAPI {
    static getAsset(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getAsset',
            args: [{ type: 'Integer', value: params.localAsid.toString() }],
        };
    }
    static getAssetWithKey(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getAssetWithKey',
            args: [{ type: 'Hash160', value: params.assetPubKey }],
        };
    }
    static getAssetBurnLog(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getAssetBurnLog',
            args: [{ type: 'Integer', value: params.localAsid.toString() }],
        };
    }
    static totalAssets(scriptHash) {
        return {
            scriptHash,
            operation: 'totalAssets',
            args: [],
        };
    }
}
exports.AssetAPI = AssetAPI;
//# sourceMappingURL=asset.js.map