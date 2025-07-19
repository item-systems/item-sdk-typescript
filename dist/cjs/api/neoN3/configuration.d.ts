import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
export declare class ConfigurationAPI {
    static createConfiguration(scriptHash: string): ContractInvocation;
    static getConfiguration(scriptHash: string, params: {
        localCid: number;
    }): ContractInvocation;
    static setConfigurationProperty(scriptHash: string, params: {
        localCid: number;
        globalPid: string;
        state: string;
    }): ContractInvocation;
    static getConfigurationProperties(scriptHash: string, params: {
        localCid: number;
    }): ContractInvocation;
    static getConfigurationAssets(scriptHash: string, params: {
        localCid: number;
    }): ContractInvocation;
    static totalConfigurations(scriptHash: string): ContractInvocation;
}
