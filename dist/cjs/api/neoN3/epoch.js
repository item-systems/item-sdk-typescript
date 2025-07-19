"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpochAPI = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
class EpochAPI {
    static createEpoch(scriptHash) {
        return {
            scriptHash,
            operation: 'createEpoch',
            args: [],
        };
    }
    static getEpoch(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getEpoch',
            args: [{ type: 'Integer', value: params.localEid.toString() }],
        };
    }
    static setEpochProperty(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setEpochProperty',
            args: [
                { type: 'Integer', value: params.localEid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.state) },
            ],
        };
    }
    static getEpochProperties(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getEpochProperties',
            args: [{ type: 'Integer', value: params.localEid.toString() }],
        };
    }
    static getEpochItems(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getEpochItems',
            args: [{ type: 'Integer', value: params.localEid.toString() }],
        };
    }
    static totalEpochs(scriptHash) {
        return {
            scriptHash,
            operation: 'totalEpochs',
            args: [],
        };
    }
}
exports.EpochAPI = EpochAPI;
//# sourceMappingURL=epoch.js.map