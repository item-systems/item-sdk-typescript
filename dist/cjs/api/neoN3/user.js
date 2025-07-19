"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAPI = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
class UserAPI {
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
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.globalPid) },
                { type: 'ByteArray', value: neon_core_1.u.hex2base64(params.state) },
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
exports.UserAPI = UserAPI;
//# sourceMappingURL=user.js.map