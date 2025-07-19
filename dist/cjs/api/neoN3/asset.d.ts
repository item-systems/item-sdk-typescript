import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
export declare class AssetAPI {
    static getAsset(scriptHash: string, params: {
        localAsid: number;
    }): ContractInvocation;
    static getAssetWithKey(scriptHash: string, params: {
        assetPubKey: string;
    }): ContractInvocation;
    static getAssetBurnLog(scriptHash: string, params: {
        localAsid: number;
    }): ContractInvocation;
    static totalAssets(scriptHash: string): ContractInvocation;
}
