import { ContractInvocation } from '@cityofzion/neo3-invoker';
export declare class ItemAPI {
    static symbol(scriptHash: string): ContractInvocation;
    static decimals(scriptHash: string): ContractInvocation;
    static totalSupply(scriptHash: string): ContractInvocation;
    static balanceOf(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static tokensOf(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static transfer(scriptHash: string, params: {
        to: string;
        tokenId: number;
        data: any;
    }): ContractInvocation;
    static ownerOf(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static tokens(scriptHash: string): ContractInvocation;
    static properties(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static getUserJSON(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static getUser(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static setUserPermissions(scriptHash: string, params: {
        address: string;
        permissions: {};
    }): ContractInvocation;
    static totalAccounts(scriptHash: string): ContractInvocation;
    static createEpoch(scriptHash: string, params: {
        label: string;
        generatorInstanceId: number;
        mintFee: number;
        sysFee: number;
        maxSupply: number;
        authAge: number;
    }): ContractInvocation;
    static getEpochJSON(scriptHash: string, params: {
        epochId: number;
    }): ContractInvocation;
    static getEpoch(scriptHash: string, params: {
        epochId: number;
    }): ContractInvocation;
    static setMintFee(scriptHash: string, params: {
        epochId: number;
        amount: number;
    }): ContractInvocation;
    static totalEpochs(scriptHash: string): ContractInvocation;
    static auth(scriptHash: string, params: {
        mode: string;
        assetPubKey: string;
        message: string;
        signature: string;
        burn: boolean;
    }): ContractInvocation;
    static bindItem(scriptHash: string, params: {
        tokenId: number;
        assetPubKey: string;
    }): ContractInvocation;
    static setBindOnPickup(scriptHash: string, params: {
        tokenId: number;
        state: boolean;
    }): ContractInvocation;
    static claimBindOnPickup(scriptHash: string, params: {
        assetPubKey: string;
        message: string;
        signature: string;
    }): ContractInvocation;
    static getAssetItemJSON(scriptHash: string, params: {
        assetPubKey: string;
    }): ContractInvocation;
    static getItem(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static getItemJSON(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static getItemJSONFlat(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static lock(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static offlineMint(scriptHash: string, params: {
        epochId: number;
        address: string;
        bindOnPickup: boolean;
    }): ContractInvocation;
    static setItemProperties(scriptHash: string, params: {
        tokenId: number;
        properties: any;
    }): ContractInvocation;
    static unbindToken(scriptHash: string, params: {
        tokenId: number;
    }): ContractInvocation;
    static unbindAsset(scriptHash: string, params: {
        assetPubKey: string;
    }): ContractInvocation;
    static update(scriptHash: string, params: {
        script: string;
        manifest: string;
        data: any;
    }): ContractInvocation;
}
//# sourceMappingURL=item.d.ts.map