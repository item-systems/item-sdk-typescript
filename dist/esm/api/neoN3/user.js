import { u } from '@cityofzion/neon-core';
export class UserAPI {
    static createUser(scriptHash, params) {
        return {
            scriptHash,
            operation: 'createUser',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static getUser(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getUser',
            args: [{ type: 'Integer', value: params.localUid.toString() }],
        };
    }
    static getUserWithAddress(scriptHash, params) {
        return {
            scriptHash,
            operation: 'getUserWithAddress',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    static setUserProperty(scriptHash, params) {
        return {
            scriptHash,
            operation: 'setUserProperty',
            args: [
                { type: 'Integer', value: params.localUid.toString() },
                { type: 'ByteArray', value: u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: u.hex2base64(params.state) },
            ],
        };
    }
    static totalUsers(scriptHash) {
        return {
            scriptHash,
            operation: 'totalUsers',
            args: [],
        };
    }
}
//# sourceMappingURL=user.js.map