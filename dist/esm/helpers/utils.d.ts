/// <reference types="node" />
import { rpc, wallet } from '@cityofzion/neon-core';
import { NdefDecodeType, pollingOptions } from "../types";
import { ContractInvocation, Neo3Invoker, Neo3Parser } from '@cityofzion/neon-dappkit-types';
export declare class Utils {
    static transactionCompletion(txid: string, opts?: pollingOptions): Promise<rpc.ApplicationLogJson>;
    static deployContract(node: string, networkMagic: number, nefRaw: Buffer, manifestRaw: any, signer: wallet.Account): Promise<string>;
    static decodeNDEF(d: string): NdefDecodeType;
    static encodePublicKey(pubKey: string): string;
    static processDERSignature(sigBytes: Uint8Array): Uint8Array;
    static isPublicKey(key: string, encoded?: boolean): boolean;
    static testInvoker(invoker: Neo3Invoker, parser: Neo3Parser, invocations: ContractInvocation[]): Promise<any[]>;
    static handleIterator(res: any, invoker: Neo3Invoker, parser: Neo3Parser): Promise<any[]>;
    static sleep(ms: number): Promise<unknown>;
}
