import { ConstructorOptions, EpochType, ItemType, UserAccount } from './types';
/**
 * The ITEM class is the primary interface point for the digital twin of an NFI. Use this class to execute standard
 * non-fungible token interations as well as additional capabilities like authentication and configuration. WalletConnect 2.0
 * has native support through the neon-invoker package.
 *
 * To use this class:
 * ```typescript
 * import { Item } from '@item-systems/item'
 * import Neon from '@cityofzion/neon-core'
 * import { NeonInvoker } from '@cityofzion/neon-invoker'
 * import { NeonParser } from '@cityofzion/neon-parser'
 *
 * const account = new Neon.wallet.Account()
 *
 * const item = new Item({
 *   scriptHash,
 *   invoker: await NeonInvoker.init(NODE, account),
 *   parser: NeonParser,
 * })
 * const totalItems = await item.totalSupply()
 * console.log(totalItems)
 * ```
 */
export declare class Item {
    private config;
    private initialized;
    constructor(configOptions?: ConstructorOptions);
    /**
     * Gets the script hash of the smart contract.
     */
    get scriptHash(): string;
    init(): Promise<boolean>;
    /**
     * Returns the token symbol for the digital twin "ITEM". This is a great test method and exist primarily to support
     * existing token standard.
     */
    symbol(): Promise<string>;
    /**
     * Returns the decimals supported by ITEMs. Currently, the ITEM contract does not support native fractional ownership.
     */
    decimals(): Promise<number>;
    /**
     * Gets the total number of ITEMS tracked in the contract.
     */
    totalSupply(): Promise<number>;
    /**
     * Gets the items owned by an entity.
     * @param params
     * @param params.address the address of the requested entity
     * @returns an array of pointers to the items owned
     */
    tokensOf(params: {
        address: string;
    }): Promise<number[]>;
    /**
     * Gets the total NFI holdings of an entity
     * @param params
     * @param params.address the address of the requested entity
     */
    balanceOf(params: {
        address: string;
    }): Promise<number>;
    /**
     * Transfers ownership of an NFI from the owner to another entity. For a method which
     * considers block confirmations, refer to (transferConfirmed)[http://localhost:3000/docs/api/classes/Item#transferconfirmed].
     * @param params
     * @param params.to the destination address
     * @param params.tokenId the global id of the NFI to transfer
     * @param params.data parameters for handling upstream workflows (default: null)
     *
     * @return the transaction id for lookup on (dora)[https://dora.coz.io]
     */
    transfer(params: {
        to: string;
        tokenId: number;
        data: any;
    }): Promise<string>;
    /**
     * Transfers ownership of an NFI from the owner to another entity. This method confirms the block before returning
     * and will error if there is a confirmation issue.
     * @param params
     * @param params.to the destination address
     * @param params.tokenId the global id of the NFI to transfer
     * @param params.data parameters for handling upstream workflows (default: null)
     *
     * @return boolean Was the transfer successful?
     */
    transferConfirmed(params: {
        to: string;
        tokenId: number;
        data: any;
    }): Promise<string>;
    /**
     * Gets the owner of the NFI.
     * @param params
     * @param params.tokenId the global id of the NFI
     *
     * @return the owning entity's address
     */
    ownerOf(params: {
        tokenId: number;
    }): Promise<string>;
    /**
     * Gets every pointer for an NFI. This method exists for standards purposes.
     * Because we use incrementing pointers, using (totalSupply)[http://localhost:3000/docs/api/classes/Item#totalsupply]
     * and iterating from 1-"totalSupply" is more much more efficient.
     *
     * @return the list of globals ids for every NFI
     */
    tokens(): Promise<number[]>;
    /**
     * Gets the properties of the NFI. This method is designed to emulate existing
     * NFT standards for wallet support and marketplaces.
     * @param params
     * @param params.tokenId the global id for the NFI
     */
    properties(params: {
        tokenId: number;
    }): Promise<string>;
    /**
     * Gets the user entity state in the smart contract including permissions
     * and NFI ownership.
     * @param params.address the entity you are requesting information about
     */
    getUserJSON(params: {
        address: string;
    }): Promise<UserAccount>;
    /**
     * RAW data payload for contract interfacing
     * @param params
     */
    getUser(params: {
        address: string;
    }): Promise<string>;
    /**
     * Updates a users permissions within the contract. This is a protected method.
     * @param params
     * @param params.address the entity to update
     * @param params.permissions the complete permission-set to update to
     */
    setUserPermissions(params: {
        address: string;
        permissions: any;
    }): Promise<string>;
    /**
     * Gets the total number of accounts managed in the smart contract
     * @return the number of accounts
     */
    totalAccounts(): Promise<number>;
    /**
     * Creates a
     * @param params
     */
    createEpoch(params: {
        label: string;
        generatorInstanceId: number;
        mintFee: number;
        sysFee: number;
        maxSupply: number;
        authAge: number;
    }): Promise<string>;
    getEpochJSON(params: {
        epochId: number;
    }): Promise<EpochType>;
    getEpoch(params: {
        epochId: number;
    }): Promise<string>;
    setMintFee(params: {
        epochId: number;
        amount: number;
    }): Promise<string>;
    totalEpochs(): Promise<number>;
    auth(params: {
        mode: string;
        assetPubKey: string;
        message: string;
        signature: string;
        burn: boolean;
    }): Promise<boolean>;
    authCommit(params: {
        mode: string;
        assetPubKey: string;
        message: string;
        signature: string;
        burn: boolean;
    }): Promise<string>;
    authCommitConfirmed(params: {
        mode: string;
        assetPubKey: string;
        message: string;
        signature: string;
        burn: boolean;
    }): Promise<boolean>;
    bindItem(params: {
        tokenId: number;
        assetPubKey: string;
    }): Promise<string>;
    bindItemConfirmed(params: {
        tokenId: number;
        assetPubKey: string;
        blockIndex: number;
        signature: string;
    }, mock?: boolean): Promise<boolean>;
    claimBindOnPickup(params: {
        assetPubKey: string;
        message: string;
        signature: string;
    }): Promise<string>;
    claimBindOnPickupConfirmed(params: {
        assetPubKey: string;
        message: string;
        signature: string;
    }): Promise<boolean>;
    setBindOnPickup(params: {
        tokenId: number;
        state: boolean;
    }): Promise<string>;
    setBindOnPickupConfirmed(params: {
        tokenId: number;
        state: boolean;
    }): Promise<boolean>;
    getAssetItemJSON(params: {
        assetPubKey: string;
    }): Promise<ItemType>;
    getItem(params: {
        tokenId: number;
    }): Promise<string>;
    getItemJSON(params: {
        tokenId: number;
    }): Promise<ItemType>;
    getItemJSONFlat(params: {
        tokenId: number;
    }): Promise<string>;
    offlineMint(params: {
        epochId: number;
        address: string;
        bindOnPickup: boolean;
    }): Promise<string>;
    offlineMintConfirmed(params: {
        epochId: number;
        address: string;
        bindOnPickup: boolean;
    }): Promise<string>;
    lock(params: {
        tokenId: number;
    }): Promise<string>;
    setItemProperties(params: {
        tokenId: number;
        properties: any;
    }): Promise<string>;
    unbindToken(params: {
        tokenId: number;
    }): Promise<string>;
    unbindAsset(params: {
        assetPubKey: string;
    }): Promise<string>;
    update(params: {
        script: string;
        manifest: string;
        data: any;
    }): Promise<string>;
}
