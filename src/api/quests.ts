import { Arg, ContractInvocation } from '@cityofzion/neo3-invoker'
import { u } from '@cityofzion/neon-core'
import { EdgeConditionITEMPick, EdgeResolutionITEMPick } from '../types'

export class QuestsAPI {
  /*
  # -------------------------------------------
  # Quests
  # -------------------------------------------
   */
  static totalQuests(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'total_quests',
      args: [],
    }
  }

  static getQuest(
    scriptHash: string,
    params: {
      questId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_quest',
      args: [{ type: 'Integer', value: params.questId }],
    }
  }

  static getQuestJSON(
    scriptHash: string,
    params: {
      questId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_quest_json',
      args: [{ type: 'Integer', value: params.questId }],
    }
  }

  static createQuest(
    scriptHash: string,
    params: {
      title: string
      description: string
      maxCompletions: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'create_quest',
      args: [
        { type: 'String', value: params.title },
        { type: 'String', value: params.description },
        { type: 'Integer', value: params.maxCompletions },
      ],
    }
  }

  static setQuestActive(
    scriptHash: string,
    params: {
      questId: number
      state: boolean
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'set_quest_active',
      args: [
        { type: 'Integer', value: params.questId },
        { type: 'Boolean', value: params.state },
      ],
    }
  }

  /*
  # -------------------------------------------
  # Edges
  # -------------------------------------------
  */

  static totalEdges(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'total_edges',
      args: [],
    }
  }

  static getEdge(
    scriptHash: string,
    params: {
      edgeId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_edge',
      args: [{ type: 'Integer', value: params.edgeId }],
    }
  }

  static getEdgeJSON(
    scriptHash: string,
    params: {
      edgeId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_edge_json',
      args: [{ type: 'Integer', value: params.edgeId }],
    }
  }

  static createEdge(
    scriptHash: string,
    params: {
      questId: number
      description: string
      entryPoint: number
      exitPoint: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'create_edge',
      args: [
        { type: 'Integer', value: params.questId },
        { type: 'String', value: params.description },
        { type: 'Integer', value: params.entryPoint },
        { type: 'Integer', value: params.exitPoint },
      ],
    }
  }

  static setEdgeCondition(
    scriptHash: string,
    params: {
      edgeId: number
      conditionType: number
      condition: EdgeConditionITEMPick
    }
  ): ContractInvocation {
    let condition: Arg[] = []

    switch (params.conditionType) {
      case 1:
        const tokens = params.condition.tokens.map(tokenId => {
          return { type: 'Integer', value: tokenId }
        })
        condition = [
          { type: 'Integer', value: params.condition.count },
          { type: 'Array', value: tokens },
        ]
    }
    return {
      scriptHash,
      operation: 'set_edge_condition',
      args: [
        { type: 'Integer', value: params.edgeId },
        { type: 'Integer', value: params.conditionType },
        { type: 'Array', value: condition },
      ],
    }
  }

  static traverseEdge(
    scriptHash: string,
    params: {
      edgeId: number
      conditionType: number
      resolution: EdgeResolutionITEMPick[]
    }
  ): ContractInvocation {
    let resolution: Arg[] = []
    switch (params.conditionType) {
      case 1:
        resolution = params.resolution.map(res => {
          return {
            type: 'Array',
            value: [
              { type: 'Integer', value: res.tokenId },
              { type: 'ByteArray', value: u.hex2base64(res.msg) },
              { type: 'ByteArray', value: u.hex2base64(res.sig) },
            ],
          }
        })
    }
    return {
      scriptHash,
      operation: 'traverse_edge',
      args: [
        { type: 'Integer', value: params.edgeId },
        { type: 'Array', value: resolution },
      ],
    }
  }

  /*
  # -------------------------------------------
  # Nodes
  # -------------------------------------------
  */

  static totalNodes(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'total_nodes',
      args: [],
    }
  }

  static getNode(
    scriptHash: string,
    params: {
      nodeId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_node',
      args: [{ type: 'Integer', value: params.nodeId }],
    }
  }

  static getNodeJSON(
    scriptHash: string,
    params: {
      nodeId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_node_json',
      args: [{ type: 'Integer', value: params.nodeId }],
    }
  }

  static createNode(
    scriptHash: string,
    params: {
      label: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'create_node',
      args: [{ type: 'String', value: params.label }],
    }
  }

  static setNodePermissions(
    scriptHash: string,
    params: {
      nodeId: number
      permissions: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'set_node_permissions',
      args: [
        { type: 'Integer', value: params.nodeId },
        { type: 'Integer', value: params.permissions },
      ],
    }
  }

  /*
  # -------------------------------------------
  # User
  # -------------------------------------------
  */

  static getQuestProgress(
    scriptHash: string,
    params: {
      address: string
      questId: number
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_quest_progress',
      args: [
        { type: 'Hash160', value: params.address },
        { type: 'Integer', value: params.questId },
      ],
    }
  }

  static getUserJSON(
    scriptHash: string,
    params: {
      address: string
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'get_user_json',
      args: [{ type: 'Hash160', value: params.address }],
    }
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

  static totalAccounts(scriptHash: string): ContractInvocation {
    return {
      scriptHash,
      operation: 'total_accounts',
      args: [],
    }
  }

  /*
  # -------------------------------------------
  # Admin
  # -------------------------------------------
  */

  static update(
    scriptHash: string,
    params: {
      script: string
      manifest: string
      data: any
    }
  ): ContractInvocation {
    return {
      scriptHash,
      operation: 'update',
      args: [
        { type: 'ByteArray', value: params.script },
        { type: 'String', value: params.manifest },
        { type: 'Any', value: params.data },
      ],
    }
  }
}
