import { u } from '@cityofzion/neon-core';
export class ConfigurationAPI {
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
                { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: u.hex2base64(params.state) },
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
//# sourceMappingURL=configuration.js.map