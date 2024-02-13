import { Neo3Invoker } from '@cityofzion/neo3-invoker';
import { Neo3Parser } from '@cityofzion/neo3-parser';
export declare type SmartContractConfig = {
    scriptHash: string;
    invoker: Neo3Invoker;
    parser: Neo3Parser;
};
export declare type pollingOptions = {
    period: number;
    timeout: number;
    node: string;
};
export interface AccountPermissions {
    contract_upgrade: boolean;
    set_mint_fee: boolean;
    create_epoch: boolean;
    set_permissions: boolean;
}
export interface UserAccount {
    balance: number;
    account_id: string;
    permissions: AccountPermissions;
}
export interface EpochType {
    author?: string;
    epochId?: number;
    generatorInstanceId?: number;
    label: string;
    epochTokenId?: number;
    authAge: number;
    maxSupply: number;
    totalSupply?: number;
    mintFee: number;
    sysFee: number;
}
export interface ItemType {
    description: string;
    image: string;
    name: string;
    asset: string | undefined;
    owner: string;
    creator: string;
    bindOnPickup: number;
    seed: string;
    tokenId: number;
    tokenURI: string;
    epoch: EpochType;
    traits: any;
}
