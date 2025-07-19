"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationAPI = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
class ConfigurationAPI {
    static createConfiguration(scriptHash) {
        return {
            scriptHash,
            operation: 'createConfiguration',
            args: [],
        };
    }
    static getConfiguration(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getConfiguration',
            args: [{ type: 'Integer', value: params.localCid.toString() }],
        };
    }
    static setConfigurationProperty(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setConfigurationProperty',
            args: [
                { type: 'Integer', value: params.localCid.toString() },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.state) },
            ],
        };
    }
    static getConfigurationProperties(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getConfigurationProperties',
            args: [{ type: 'Integer', value: params.localCid.toString() }],
        };
    }
    static getConfigurationAssets(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getConfigurationAssets',
            args: [{ type: 'Integer', value: params.localCid.toString() }],
        };
    }
    static totalConfigurations(scriptHash) {
        return {
            scriptHash,
            operation: 'totalConfigurations',
            args: [],
        };
    }
}
exports.ConfigurationAPI = ConfigurationAPI;
//# sourceMappingURL=configuration.js.map