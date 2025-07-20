import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
import { NeoN3EllipticCurves } from '../../constants';
export declare class ItemAPI {
    static createItem(scriptHash: string, params: {
        localEid: number;
    }): ContractInvocation;
    static getItem(scriptHash: string, params: {
        localNfid: number;
    }): ContractInvocation;
    static getItemWithKey(scriptHash: string, params: {
        pubKey: string;
    }): ContractInvocation;
    static getItemWithTac(scriptHash: string, params: {
        tacScriptHash: string;
        tokenId: string;
    }): ContractInvocation;
    static getItemProperties(scriptHash: string, params: {
        localNfid: number;
    }): ContractInvocation;
    static totalItems(scriptHash: string): ContractInvocation;
    static setItemProperty(scriptHash: string, params: {
        localNfid: number;
        globalPid: string;
        state: string;
    }): ContractInvocation;
    static bindItem(scriptHash: string, params: {
        localNfid: number;
        localCid: number;
        pubKey: string;
        assetEllipticCurve: NeoN3EllipticCurves;
    }): ContractInvocation;
    static lockItem(scriptHash: string, params: {
        localNfid: number;
    }): ContractInvocation;
    static authItem(scriptHash: string, params: {
        localNfid: number;
        message: string;
        proof: string;
        challenge: string;
        burn: boolean;
    }): ContractInvocation;
    static purgeItem(scriptHash: string, params: {
        localNfid: number;
        message: string;
        signature: string;
    }): ContractInvocation;
}
