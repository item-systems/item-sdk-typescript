"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestsAPI = void 0;
const neon_core_1 = require("@cityofzion/neon-core");
class QuestsAPI {
    /*
    # -------------------------------------------
    # Quests
    # -------------------------------------------
     */
    static totalQuests(scriptHash) {
        return {
            scriptHash,
            operation: 'total_quests',
            args: [],
        };
    }
    static getQuest(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_quest',
            args: [{ type: 'Integer', value: params.questId }],
        };
    }
    static getQuestJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_quest_json',
            args: [{ type: 'Integer', value: params.questId }],
        };
    }
    static createQuest(scriptHash, params) {
        return {
            scriptHash,
            operation: 'create_quest',
            args: [
                { type: 'String', value: params.title },
                { type: 'String', value: params.description },
                { type: 'Integer', value: params.maxCompletions },
            ],
        };
    }
    static setQuestActive(scriptHash, params) {
        return {
            scriptHash,
            operation: 'set_quest_active',
            args: [
                { type: 'Integer', value: params.questId },
                { type: 'Boolean', value: params.state },
            ],
        };
    }
    /*
    # -------------------------------------------
    # Edges
    # -------------------------------------------
    */
    static totalEdges(scriptHash) {
        return {
            scriptHash,
            operation: 'total_edges',
            args: [],
        };
    }
    static getEdge(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_edge',
            args: [{ type: 'Integer', value: params.edgeId }],
        };
    }
    static getEdgeJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_edge_json',
            args: [{ type: 'Integer', value: params.edgeId }],
        };
    }
    static createEdge(scriptHash, params) {
        return {
            scriptHash,
            operation: 'create_edge',
            args: [
                { type: 'Integer', value: params.questId },
                { type: 'String', value: params.description },
                { type: 'Integer', value: params.entryPoint },
                { type: 'Integer', value: params.exitPoint },
            ],
        };
    }
    static setEdgeCondition(scriptHash, params) {
        let constraints;
        let condition = [];
        if (params.conditionType === 1) {
            constraints = params.condition.tokens.map(tokenId => {
                return { type: 'Integer', value: tokenId };
            });
            condition = [
                { type: 'Integer', value: params.condition.count },
                { type: 'Array', value: constraints },
            ];
        }
        else if (params.conditionType === 2) {
            constraints = params.condition.epochs.map(epochId => {
                return { type: 'Integer', value: epochId };
            });
            condition = [
                { type: 'Integer', value: params.condition.count },
                { type: 'Array', value: constraints },
            ];
        }
        return {
            scriptHash,
            operation: 'set_edge_condition',
            args: [
                { type: 'Integer', value: params.edgeId },
                { type: 'Integer', value: params.conditionType },
                { type: 'Array', value: condition },
            ],
        };
    }
    static traverseEdge(scriptHash, params) {
        let resolution = [];
        switch (params.conditionType) {
            case 1:
                resolution = params.resolution.map(res => {
                    return {
                        type: 'Array',
                        value: [
                            { type: 'Integer', value: res.tokenId },
                            { type: 'ByteArray', value: neon_core_1.u.hex2base64(res.msg) },
                            { type: 'ByteArray', value: neon_core_1.u.hex2base64(res.sig) },
                        ],
                    };
                });
        }
        return {
            scriptHash,
            operation: 'traverse_edge',
            args: [
                { type: 'Integer', value: params.edgeId },
                { type: 'Array', value: resolution },
            ],
        };
    }
    /*
    # -------------------------------------------
    # Nodes
    # -------------------------------------------
    */
    static totalNodes(scriptHash) {
        return {
            scriptHash,
            operation: 'total_nodes',
            args: [],
        };
    }
    static getNode(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_node',
            args: [{ type: 'Integer', value: params.nodeId }],
        };
    }
    static getNodeJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_node_json',
            args: [{ type: 'Integer', value: params.nodeId }],
        };
    }
    static createNode(scriptHash, params) {
        return {
            scriptHash,
            operation: 'create_node',
            args: [{ type: 'String', value: params.label }],
        };
    }
    static setNodePermissions(scriptHash, params) {
        return {
            scriptHash,
            operation: 'set_node_permissions',
            args: [
                { type: 'Integer', value: params.nodeId },
                { type: 'Integer', value: params.permissions },
            ],
        };
    }
    /*
    # -------------------------------------------
    # User
    # -------------------------------------------
    */
    static getQuestProgress(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_quest_progress',
            args: [
                { type: 'Hash160', value: params.address },
                { type: 'Integer', value: params.questId },
            ],
        };
    }
    static getUserJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_user_json',
            args: [{ type: 'Hash160', value: params.address }],
        };
    }
    /*
    static setUserPermissions(
      scriptHash: string,
      params: {
        address: string
        permissions: {}
      }
    ): ContractInvocation {
      return {
        scriptHash,
        operation: 'get_user',
        args: [{ type: 'Hash160', value: params.address }],
      }
    }
  
     */
    static totalAccounts(scriptHash) {
        return {
            scriptHash,
            operation: 'total_accounts',
            args: [],
        };
    }
    /*
    # -------------------------------------------
    # Admin
    # -------------------------------------------
    */
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
exports.QuestsAPI = QuestsAPI;
//# sourceMappingURL=quests.js.map