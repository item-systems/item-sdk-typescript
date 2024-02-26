/// <reference types="node" />
import { rpc, wallet } from '@cityofzion/neon-core';
import { pollingOptions } from '../types';
export declare class Utils {
    static transactionCompletion(txid: string, opts?: pollingOptions): Promise<rpc.ApplicationLogJson>;
    static deployContract(node: string, networkMagic: number, nefRaw: Buffer, manifestRaw: any, signer: wallet.Account): Promise<string>;
    static decodeNDEF(d: string): {
        validSignature: boolean;
        pubKey: string;
        msg: string;
        sig: string;
    };
    static encodePublicKey(pubKey: string): string;
    static processDERSignature(sigBytes: Uint8Array): Uint8Array;
    static sleep(ms: number): Promise<unknown>;
}
