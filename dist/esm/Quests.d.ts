import { UserAccount, EdgeConditionITEMPick, EdgeResolutionITEMPick, EdgeType, NodeType, QuestType, ConstructorOptions } from './types';
export declare class Quests {
    private config;
    private initialized;
    constructor(configOptions?: ConstructorOptions);
    /**
     * Gets the script hash of the smart contract.
     */
    get scriptHash(): string;
    init(): Promise<boolean>;
    /**
     * Gets the total number of quests being tracked by the system
     */
    totalQuests(): Promise<number>;
    /**
     * Gets a raw quest object from contract storage
     * @param params
     * @param params.questId the unique identifier of the quest.
     */
    getQuest(params: {
        questId: number;
    }): Promise<any>;
    /**
     * Gets a JSON formatted representation of the quest
     * @param params
     * @param params.questId the unique identifier of the quest
     */
    getQuestJSON(params: {
        questId: number;
    }): Promise<QuestType>;
    /**
     * Creates a new quest entity in the system. Initially quests are set to restricted (only the creator can participate).
     * New quests include an edge from and to the origin node.
     * @param params
     * @param params.description A description of the quest
     * @param params.maxCompletions The maximum number of times that the quest can be completed
     */
    createQuest(params: {
        title: string;
        description: string;
        maxCompletions: number;
    }): Promise<string>;
    /**
     * Toggles whether the quest is active
     * @param params
     */
    setQuestActive(params: {
        questId: number;
        state: boolean;
    }): Promise<string>;
    /**
     * Gets the total number of edges being tracked by the system
     */
    totalEdges(): Promise<number>;
    /**
     * Gets a raw edge object from contract storage
     * @param params
     * @param params.edgeId the unique identifier of the edge.
     */
    getEdge(params: {
        edgeId: number;
    }): Promise<any>;
    /**
     * Gets a JSON formatted representation of the edge
     * @param params
     * @param params.edgeId the unique identifier of the edge
     */
    getEdgeJSON(params: {
        edgeId: number;
    }): Promise<EdgeType>;
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
    createEdge(params: {
        questId: number;
        description: string;
        entryPoint: number;
        exitPoint: number;
    }): Promise<string>;
    setEdgeCondition(params: {
        edgeId: number;
        conditionType: number;
        condition: EdgeConditionITEMPick;
    }): Promise<string>;
    traverseEdge(params: {
        edgeId: number;
        conditionType: number;
        resolution: EdgeResolutionITEMPick[];
    }): Promise<string>;
    /**
     * Gets the total number of nodes being tracked by the system
     */
    totalNodes(): Promise<number>;
    /**
     * Gets a raw node object from contract storage
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    getNode(params: {
        nodeId: number;
    }): Promise<any>;
    /**
     * Gets a JSON formatted representation of the node
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    getNodeJSON(params: {
        nodeId: number;
    }): Promise<NodeType>;
    /**
     * Creates a new node entity in the system.
     * @param params
     * @param params.label A label for the state that the node represents
     */
    createNode(params: {
        label: string;
    }): Promise<string>;
    /**
     * Updates the node permissions. Node permissions impact who can manipulate the metadata, add/remove edges, and set
     * triggers.
     * @param params
     * @param params.nodeId the target node
     * @param params.permissions the permission state to update the node to
     */
    setNodePermissions(params: {
        nodeId: number;
        permissions: number;
    }): Promise<string>;
    getQuestState(params: {
        address: string;
        questId: number;
    }): Promise<UserAccount>;
    /**
     * Gets a JSON formatted representation of the user
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    getUserJSON(params: {
        address: string;
    }): Promise<UserAccount>;
    /**
     * Gets the total number of nodes being tracked by the system
     */
    totalAccounts(): Promise<number>;
}
