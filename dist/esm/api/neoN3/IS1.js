import { u } from '@cityofzion/neon-js';
export class IS1API {
    static isClaimable(scriptHash, params) {
        return {
            scriptHash,
            operation: 'isClaimable',
            args: [{ type: 'ByteArray', value: params.tokenId }],
        };
    }
    static setClaimableState(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setClaimableState',
            args: [
                { type: 'ByteArray', value: params.tokenId },
                { type: 'Boolean', value: params.state },
            ],
        };
    }
    static claim(scriptHash, params) {
        const authPayload = [
            { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
            { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
            { type: 'ByteArray', value: u.hex2base64(params.auth.challenge) },
        ];
        return {
            scriptHash,
            operation: 'claim',
            args: [
                { type: 'ByteArray', value: params.tokenId },
                { type: 'Array', value: authPayload },
                ...(params.receiverAccount ? [{ type: 'Hash160', value: params.receiverAccount }] : []),
            ],
        };
    }
    static authItem(scriptHash, params) {
        const authPayload = [
            { type: 'ByteArray', value: u.hex2base64(params.auth.message) },
            { type: 'ByteArray', value: u.hex2base64(params.auth.proof) },
            { type: 'ByteArray', value: u.hex2base64(u.reverseHex(params.auth.challenge)) },
        ];
        return {
            scriptHash,
            operation: 'authItem',
            args: [
                { type: 'ByteArray', value: params.tokenId },
                { type: 'Array', value: authPayload },
                { type: 'Boolean', value: params.burn },
            ],
        };
    }
    static getItem(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getItem',
            args: [{ type: 'ByteArray', value: params.tokenId }],
        };
    }
    static properties(scriptHash, params) {
        return {
            scriptHash,
            operation: 'properties',
            args: [{ type: 'ByteArray', value: params.tokenId }],
        };
    }
    static tokensOf(scriptHash, params) {
        return {
            scriptHash,
            operation: 'tokensOf',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static ownerOf(scriptHash, params) {
        return {
            scriptHash,
            operation: 'ownerOf',
            args: [{ type: 'ByteArray', value: params.tokenId }],
        };
    }
}
//# sourceMappingURL=IS1.js.map