import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
import { AuthItem, AuthPayload } from "../../types";
export declare class IS1API {
    static isClaimable(scriptHash: string, params: {
        tokenId: string;
    }): ContractInvocation;
    static setClaimableState(scriptHash: string, params: {
        tokenId: string;
        state: boolean;
    }): ContractInvocation;
    static claim(scriptHash: string, params: {
        tokenId: string;
        auth: AuthPayload;
    }): ContractInvocation;
    static authItem(scriptHash: string, params: AuthItem): ContractInvocation;
    static getItem(scriptHash: string, params: {
        tokenId: string;
    }): ContractInvocation;
    static properties(scriptHash: string, params: {
        tokenId: string;
    }): ContractInvocation;
    static tokensOf(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
}
