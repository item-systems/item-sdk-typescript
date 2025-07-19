import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
export declare class EpochAPI {
    static createEpoch(scriptHash: string): ContractInvocation;
    static getEpoch(scriptHash: string, params: {
        localEid: number;
    }): ContractInvocation;
    static setEpochProperty(scriptHash: string, params: {
        localEid: number;
        globalPid: string;
        state: string;
    }): ContractInvocation;
    static getEpochProperties(scriptHash: string, params: {
        localEid: number;
    }): ContractInvocation;
    static getEpochItems(scriptHash: string, params: {
        localEid: number;
    }): ContractInvocation;
    static totalEpochs(scriptHash: string): ContractInvocation;
}
