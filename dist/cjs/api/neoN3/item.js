"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemAPI = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
class ItemAPI {
    static createItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'createItem',
            args: [{ type: 'Integer', value: params.localEid.toString() }],
        };
    }
    static getItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItem',
            args: [{ type: 'Integer', value: params.localNfid.toString() }],
        };
    }
    static getItemWithKey(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItemWithKey',
            args: [{ type: 'ByteArray', value: params.assetPublicKey }],
        };
    }
    static getItemWithTac(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItemWithTAC',
            args: [
                { type: 'Hash160', value: params.tacScriptHash },
                { type: 'ByteArray', value: params.tokenId },
            ],
        };
    }
    static getItemProperties(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItemProperties',
            args: [{ type: 'Integer', value: params.localNfid.toString() }],
        };
    }
    static totalItems(scriptHash) {
        return {
            scriptHash,
            operation: 'totalItems',
            args: [],
        };
    }
    static setItemProperty(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setItemProperty',
            args: [
                { type: 'Integer', value: params.localNfid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.state) },
            ],
        };
    }
    static bindItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'bindItem',
            args: [
                { type: 'Integer', value: params.localNfid.toString() },
                { type: 'Integer', value: params.localCid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.assetPubKey) },
                { type: 'Integer', value: params.assetEllipticCurve.toString() },
            ],
        };
    }
    static lockItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'lockItem',
            args: [{ type: 'Integer', value: params.localNfid.toString() }],
        };
    }
    static authItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'authItem',
            args: [
                { type: 'Integer', value: params.localNfid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.message) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.proof) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(neon_core_1.u.reverseHex(params.challenge)) },
                { type: 'Boolean', value: params.burn },
            ],
        };
    }
    static purgeItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'purgeItem',
            args: [
                { type: 'Integer', value: params.localNfid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.message) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.signature) },
            ],
        };
    }
}
exports.ItemAPI = ItemAPI;
//# sourceMappingURL=item.js.map