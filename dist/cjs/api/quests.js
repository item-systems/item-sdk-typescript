"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestsAPI = void 0;
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
            args: [
                { type: 'Integer', value: params.questId }
            ],
        };
    }
    static getQuestJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_quest_json',
            args: [
                { type: 'Integer', value: params.questId }
            ],
        };
    }
    static createQuest(scriptHash, params) {
        return {
            scriptHash,
            operation: 'create_quest',
            args: [
                { type: 'String', value: params.title },
                { type: 'String', value: params.description },
                { type: 'Integer', value: params.maxCompletions }
            ],
        };
    }
    static setQuestActive(scriptHash, params) {
        return {
            scriptHash,
            operation: 'set_quest_active',
            args: [
                { type: 'Integer', value: params.questId },
                { type: 'Boolean', value: params.state }
            ]
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
            args: [
                { type: 'Integer', value: params.edgeId }
            ],
        };
    }
    static getEdgeJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_edge_json',
            args: [
                { type: 'Integer', value: params.edgeId }
            ],
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
                { type: 'Integer', value: params.exitPoint }
            ],
        };
    }
    static traverseEdge(scriptHash, params) {
        return {
            scriptHash,
            operation: 'traverse_edge',
            args: [
                { type: 'Integer', value: params.edgeId },
                { type: 'Array', value: params.resolution }
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
            args: [
                { type: 'Integer', value: params.nodeId }
            ],
        };
    }
    static getNodeJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_node_json',
            args: [
                { type: 'Integer', value: params.nodeId }
            ],
        };
    }
    static createNode(scriptHash, params) {
        return {
            scriptHash,
            operation: 'create_node',
            args: [
                { type: 'String', value: params.label },
            ],
        };
    }
    static setNodePermissions(scriptHash, params) {
        return {
            scriptHash,
            operation: 'set_node_permissions',
            args: [
                { type: 'Integer', value: params.nodeId },
                { type: 'Integer', value: params.permissions }
            ]
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
                { type: 'Integer', value: params.questId }
            ],
        };
    }
    static getUserJSON(scriptHash, params) {
        return {
            scriptHash,
            operation: 'get_user_json',
            args: [
                { type: 'Hash160', value: params.address }
            ],
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