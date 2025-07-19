import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
export declare class UserAPI {
    static createUser(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static getUser(scriptHash: string, params: {
        localUid: number;
    }): ContractInvocation;
    static getUserWithAddress(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static setUserProperty(scriptHash: string, params: {
        localUid: number;
        globalPid: string;
        state: string;
    }): ContractInvocation;
    static totalUsers(scriptHash: string): ContractInvocation;
}
