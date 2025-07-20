import { AssetType, ClaimItem, ConfigurationType, ConstructorOptions, EpochType, ItemType, RemoteToken, UserType } from "./types";
import { NeoN3EllipticCurves } from './constants';
/**
 * The ITEM class is the primary interface point for the digital twin of an NFI. Use this class to execute standard
 * non-fungible token interations as well as additional capabilities like authentication and configuration. WalletConnect 2.0
 * has native support through the neon-invoker package.
 *
 * To use this class:
 * ```typescript
 * import { Item } from '@item-systems/item'
 * import Neon from '@cityofzion/neon-js'
 *
 * const account = new Neon.wallet.Account()
 *
 * const item = await Item.init()
 * const totalItems = await item.totalItems()
 * console.log(totalItems)
 * ```
 */
export declare class Item {
    readonly scriptHash: string;
    readonly node: string;
    private invoker;
    private listener;
    private parser;
    private constructor();
    static init(configOptions?: ConstructorOptions): Promise<Item>;
    update(params: {
        script: string;
        manifest: string;
        data: any;
    }): Promise<string>;
    updateSync(params: {
        script: string;
        manifest: string;
        data: any;
    }, opts?: any): Promise<string>;
    createUser(params: {
        address: string;
    }): Promise<string>;
    getUser(params: {
        localUid: number;
    }): Promise<UserType>;
    getUserWithAddress(params: {
        address: string;
    }): Promise<UserType>;
    setUserProperty(params: {
        localUid: number;
        globalPid: string;
        state: string;
    }): Promise<string>;
    setUserPropertySync(params: {
        localUid: number;
        globalPid: string;
        state: string;
    }, opts?: any): Promise<boolean>;
    totalUsers(): Promise<number>;
    totalItems(): Promise<number>;
    createItem(params: {
        localEid: number;
    }): Promise<string>;
    createItemSync(params: {
        localEid: number;
    }, opts?: any): Promise<number>;
    getItem(params: {
        localNfid: number;
    }): Promise<ItemType>;
    getItemWithKey(params: {
        pubKey: string;
    }): Promise<ItemType>;
    getItemWithTac(params: {
        tacScriptHash: string;
        tokenId: string;
    }): Promise<ItemType>;
    getItemProperties(params: {
        localNfid: number;
    }): Promise<any[]>;
    setItemPropertySync(params: {
        localNfid: number;
        globalPid: string;
        state: string;
    }, opts?: any): Promise<boolean>;
    setItemProperty(params: {
        localNfid: number;
        globalPid: string;
        state: string;
    }): Promise<string>;
    bindItem(params: {
        localNfid: number;
        localCid: number;
        pubKey: string;
        assetEllipticCurve: NeoN3EllipticCurves;
    }): Promise<string>;
    bindItemSync(params: {
        localNfid: number;
        localCid: number;
        pubKey: string;
        assetEllipticCurve: NeoN3EllipticCurves;
    }, opts?: any): Promise<number>;
    lockItem(params: {
        localNfid: number;
    }): Promise<string>;
    lockItemSync(params: {
        localNfid: number;
    }, opts?: any): Promise<boolean>;
    authItem(params: {
        localNfid: number;
        message: string;
        proof: string;
        challenge: string;
        burn: boolean;
    }): Promise<string>;
    authItemSync(params: {
        localNfid: number;
        message: string;
        proof: string;
        challenge: string;
        burn: boolean;
    }, opts?: any): Promise<boolean>;
    isAuthValid(params: {
        localNfid: number;
        message: string;
        proof: string;
        challenge: string;
    }): Promise<EpochType>;
    purgeItem(params: {
        localNfid: number;
        message: string;
        signature: string;
    }): Promise<any>;
    purgeItemSync(params: {
        localNfid: number;
        message: string;
        signature: string;
    }, opts?: any): Promise<boolean>;
    setEpochProperty(params: {
        localEid: number;
        globalPid: string;
        state: string;
    }): Promise<string>;
    setEpochPropertySync(params: {
        localEid: number;
        globalPid: string;
        state: string;
    }, opts?: any): Promise<boolean>;
    getEpoch(params: {
        localEid: number;
    }): Promise<EpochType>;
    getEpochItems(params: {
        localEid: number;
    }): Promise<number[]>;
    getEpochProperties(params: {
        localEid: number;
    }): Promise<any[]>;
    totalEpochs(): Promise<number>;
    createConfiguration(): Promise<string>;
    createConfigurationSync(opts?: any): Promise<number>;
    getConfiguration(params: {
        localCid: number;
    }): Promise<ConfigurationType>;
    setConfigurationProperty(params: {
        localCid: number;
        globalPid: string;
        state: string;
    }): Promise<string>;
    setConfigurationPropertySync(params: {
        localCid: number;
        globalPid: string;
        state: string;
    }, opts?: any): Promise<number>;
    getConfigurationProperties(params: {
        localCid: number;
    }): Promise<any[]>;
    getConfigurationAssets(params: {
        localCid: number;
    }): Promise<number[]>;
    totalConfigurations(): Promise<number>;
    getAsset(params: {
        localAsid: number;
    }): Promise<AssetType>;
    getAssetWithKey(params: {
        assetPubKey: string;
    }): Promise<AssetType>;
    getAssetBurnLog(params: {
        localAsid: number;
    }): Promise<string[]>;
    totalAssets(): Promise<number>;
    tokenProperties(params: {
        pubKey: string;
    }): Promise<any>;
    tokenPropertiesWithNfid(params: {
        localNfid: number;
    }): Promise<any>;
    itemsOf(params: {
        address: string;
    }): Promise<RemoteToken[]>;
    isClaimable(params: {
        pubKey: string;
    }): Promise<string[]>;
    claimItem(params: ClaimItem): Promise<string>;
    claimItemSync(params: ClaimItem, opts?: any): Promise<boolean>;
}
