import { QuestsAPI } from './api'
import {
  SmartContractConfig,
  UserAccount,
  EdgeConditionITEMPick,
  EdgeResolutionITEMPick,
  EdgeType,
  NodeType,
  QuestType,
} from './types'

/**

 */
// TODO - Provide class overview with examples and recipes
// TODO - Parse ids
// TODO - Parse addresses
export class Quest {
  static MAINNET = '0x2fa49f2db0a653f3d48acfd11ff0303c6ea3592c'
  static TESTNET = '0x2fa49f2db0a653f3d48acfd11ff0303c6ea3592c'
  static PRIVATENET = '0x2fa49f2db0a653f3d48acfd11ff0303c6ea3592c'

  private config: SmartContractConfig

  constructor(configOptions: SmartContractConfig) {
    this.config = configOptions
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// CORE SCOPE /////////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the script hash of the smart contract.
   */
  get scriptHash(): string {
    if (this.config.scriptHash) {
      return this.config.scriptHash
    }
    throw new Error('no scripthash defined')
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// /////////////// QUESTS SCOPE ///////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the total number of quests being tracked by the system
   */
  async totalQuests(): Promise<number> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.totalQuests(this.config.scriptHash)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a raw quest object from contract storage
   * @param params
   * @param params.questId the unique identifier of the quest.
   */
  async getQuest(params: { questId: number }): Promise<any> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getQuest(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a JSON formatted representation of the quest
   * @param params
   * @param params.questId the unique identifier of the quest
   */
  async getQuestJSON(params: { questId: number }): Promise<QuestType> {
    if (params.questId === 0) {
      return {
        quest_id: 0,
        creator: '0x5699cace59e49e70d1a2e10bb16a7cf2d621bbae',
        permissions: 2,
        active: true,
        title: 'Visit 2 murals and get a free beer',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Sed viverra ipsum nunc aliquet bibendum enim facilisis. Risus at ultrices mi tempus imperdiet. Sollicitudin aliquam ultrices sagittis orci. Fames ac turpis egestas maecenas pharetra convallis posuere morbi leo. Nulla posuere sollicitudin aliquam ultrices sagittis orci a scelerisque purus. Diam quam nulla porttitor massa id neque. In aliquam sem fringilla ut morbi. Arcu risus quis varius quam quisque id diam vel quam. Placerat duis ultricies lacus sed. Porttitor massa id neque aliquam vestibulum. Sed vulputate mi sit amet mauris commodo quis imperdiet massa. Integer enim neque volutpat ac tincidunt vitae. Dolor sit amet consectetur adipiscing elit ut aliquam purus. Amet consectetur adipiscing elit ut. Viverra nam libero justo laoreet sit amet cursus. Massa ultricies mi quis hendrerit dolor. Rutrum tellus pellentesque eu tincidunt. Senectus et netus et malesuada fames ac turpis egestas.\n' +
          '\n' +
          'Nisi quis eleifend quam adipiscing vitae. Id semper risus in hendrerit gravida rutrum quisque non. Porttitor lacus luctus accumsan tortor posuere ac ut consequat semper. Odio eu feugiat pretium nibh ipsum. Urna nec tincidunt praesent semper. Felis bibendum ut tristique et egestas. Elit ullamcorper dignissim cras tincidunt lobortis feugiat vivamus. Pharetra pharetra massa massa ultricies. In mollis nunc sed id semper risus in hendrerit gravida. Pulvinar mattis nunc sed blandit libero. Dictumst quisque sagittis purus sit amet. Magnis dis parturient montes nascetur ridiculus mus mauris vitae. Tortor dignissim convallis aenean et tortor.',
        completions: 0,
        max_completions: 5,
        entry_nodes: [1],
        exit_nodes: [1],
        edges: [1],
      }
    }
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getQuestJSON(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  /**
   * Creates a new quest entity in the system. Initially quests are set to restricted (only the creator can participate).
   * New quests include an edge from and to the origin node.
   * @param params
   * @param params.description A description of the quest
   * @param params.maxCompletions The maximum number of times that the quest can be completed
   */
  async createQuest(params: { title: string; description: string; maxCompletions: number }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.createQuest(this.config.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Toggles whether the quest is active
   * @param params
   */
  async setQuestActive(params: { questId: number; state: boolean }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.setQuestActive(this.config.scriptHash, params)],
      signers: [],
    })
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// ///////////////// EDGE SCOPE ///////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the total number of edges being tracked by the system
   */
  async totalEdges(): Promise<number> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.totalEdges(this.config.scriptHash)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a raw edge object from contract storage
   * @param params
   * @param params.edgeId the unique identifier of the edge.
   */
  async getEdge(params: { edgeId: number }): Promise<any> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getEdge(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a JSON formatted representation of the edge
   * @param params
   * @param params.edgeId the unique identifier of the edge
   */
  async getEdgeJSON(params: { edgeId: number }): Promise<EdgeType> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getEdgeJSON(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  /**
   * Creates a new edge entity in the system. Initially edges are set to restricted (only the creator can participate).
   * Edges can only be attached to nodes which are either public or owned by the creator. Additionally, they can only be
   * added to quests which share a creator. Edges are vectored and require an entry node and exit node.
   * @param params
   * @param params.questId The quest to attach the edge to
   * @param params.description A description of the edge
   * @param params.entryPoint the node that the edge can be entered from
   * @param params.exitPoint the node that the edge exits to
   */
  async createEdge(params: {
    questId: number
    description: string
    entryPoint: number
    exitPoint: number
  }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.createEdge(this.config.scriptHash, params)],
      signers: [],
    })
  }

  async setEdgeCondition(params: {
    edgeId: number
    conditionType: number
    condition: EdgeConditionITEMPick
  }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.setEdgeCondition(this.config.scriptHash, params)],
      signers: [],
    })
  }

  async traverseEdge(params: {
    edgeId: number
    conditionType: number
    resolution: EdgeResolutionITEMPick[]
  }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.traverseEdge(this.config.scriptHash, params)],
      signers: [],
    })
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// ///////////////// NODE SCOPE ///////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  /**
   * Gets the total number of nodes being tracked by the system
   */
  async totalNodes(): Promise<number> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.totalNodes(this.config.scriptHash)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a raw node object from contract storage
   * @param params
   * @param params.nodeId the unique identifier of the node
   */
  async getNode(params: { nodeId: number }): Promise<any> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getNode(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a JSON formatted representation of the node
   * @param params
   * @param params.nodeId the unique identifier of the node
   */
  async getNodeJSON(params: { nodeId: number }): Promise<NodeType> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getNodeJSON(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser.parseRpcResponse(res.stack[0], {
      ByteStringToScriptHash: true,
    })
  }

  /**
   * Creates a new node entity in the system.
   * @param params
   * @param params.label A label for the state that the node represents
   */
  async createNode(params: { label: string }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.createNode(this.config.scriptHash, params)],
      signers: [],
    })
  }

  /**
   * Updates the node permissions. Node permissions impact who can manipulate the metadata, add/remove edges, and set
   * triggers.
   * @param params
   * @param params.nodeId the target node
   * @param params.permissions the permission state to update the node to
   */
  async setNodePermissions(params: { nodeId: number; permissions: number }): Promise<string> {
    return this.config.invoker.invokeFunction({
      invocations: [QuestsAPI.setNodePermissions(this.config.scriptHash, params)],
      signers: [],
    })
  }

  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////
  /// ///////////////// USER SCOPE ///////////////////
  /// ////////////////////////////////////////////////
  /// ////////////////////////////////////////////////

  async getQuestState(params: { address: string; questId: number }): Promise<UserAccount> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getQuestProgress(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets a JSON formatted representation of the user
   * @param params
   * @param params.nodeId the unique identifier of the node
   */
  async getUserJSON(params: { address: string }): Promise<UserAccount> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.getUserJSON(this.config.scriptHash, params)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }
    return this.config.parser.parseRpcResponse(res.stack[0])
  }

  /**
   * Gets the total number of nodes being tracked by the system
   */
  async totalAccounts(): Promise<number> {
    const res = await this.config.invoker.testInvoke({
      invocations: [QuestsAPI.totalAccounts(this.config.scriptHash)],
      signers: [],
    })

    if (res.stack.length === 0) {
      throw new Error(res.exception ?? 'unrecognized response')
    }

    return this.config.parser.parseRpcResponse(res.stack[0])
  }
}
