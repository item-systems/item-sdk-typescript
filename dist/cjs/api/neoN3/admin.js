"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAPI = void 0;
class AdminAPI {
    static update(scriptHash, params) {
        return {
            scriptHash,
            operation: 'update',
            args: [
                { type: 'ByteArray', value: params.script },
                { type: 'String', value: params.manifest },
                { type: 'Any', value: params.data },
            ],
        };
    }
}
exports.AdminAPI = AdminAPI;
//# sourceMappingURL=admin.js.map