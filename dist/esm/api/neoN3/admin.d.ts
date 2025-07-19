import { ContractInvocation } from '@cityofzion/neon-dappkit-types';
export declare class AdminAPI {
    static update(scriptHash: string, params: {
        script: string;
        manifest: string;
        data: any;
    }): ContractInvocation;
}
