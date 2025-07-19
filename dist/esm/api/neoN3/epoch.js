import { u } from '@cityofzion/neon-core';
export class EpochAPI {
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
                { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: u.hex2base64(params.state) },
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
//# sourceMappingURL=epoch.js.map