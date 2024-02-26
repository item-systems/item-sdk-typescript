import { QuestsAPI } from './api';
import { NetworkOption } from './constants';
import { NeonParser } from '@cityofzion/neon-parser';
import { NeonInvoker } from '@cityofzion/neon-invoker';
import { Item } from './Item';
const DEFAULT_OPTIONS = {
    node: NetworkOption.MainNet,
    scriptHash: '0xe7b2e6fbe8c2853a61f2bc8694bca7e9f14b996c',
    parser: NeonParser,
    account: undefined,
};
export class Quests {
    constructor(configOptions = {}) {
        this.initialized = 'invoker' in configOptions;
        this.config = { ...DEFAULT_OPTIONS, ...configOptions };
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// /////////////// CORE SCOPE /////////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /**
     * Gets the script hash of the smart contract.
     */
    get scriptHash() {
        if (this.config.scriptHash) {
            return this.config.scriptHash;
        }
        throw new Error('no scripthash defined');
    }
    async init() {
        if (!this.initialized) {
            this.config.invoker = await NeonInvoker.init(this.config.node, this.config.account);
            this.initialized = true;
        }
        return true;
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// /////////////// QUESTS SCOPE ///////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /**
     * Gets the total number of quests being tracked by the system
     */
    async totalQuests() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.totalQuests(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a raw quest object from contract storage
     * @param params
     * @param params.questId the unique identifier of the quest.
     */
    async getQuest(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getQuest(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a JSON formatted representation of the quest
     * @param params
     * @param params.questId the unique identifier of the quest
     */
    async getQuestJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getQuestJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
    }
    /**
     * Creates a new quest entity in the system. Initially quests are set to restricted (only the creator can participate).
     * New quests include an edge from and to the origin node.
     * @param params
     * @param params.description A description of the quest
     * @param params.maxCompletions The maximum number of times that the quest can be completed
     */
    async createQuest(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.createQuest(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /**
     * Toggles whether the quest is active
     * @param params
     */
    async setQuestActive(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.setQuestActive(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// ///////////////// EDGE SCOPE ///////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /**
     * Gets the total number of edges being tracked by the system
     */
    async totalEdges() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.totalEdges(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a raw edge object from contract storage
     * @param params
     * @param params.edgeId the unique identifier of the edge.
     */
    async getEdge(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getEdge(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a JSON formatted representation of the edge
     * @param params
     * @param params.edgeId the unique identifier of the edge
     */
    async getEdgeJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getEdgeJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
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
    async createEdge(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.createEdge(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async setEdgeCondition(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.setEdgeCondition(this.config.scriptHash, params)],
            signers: [],
        });
    }
    async traverseEdge(params) {
        await this.init();
        const item = new Item({
            node: this.config.node,
        });
        // if the tokenIds are missing, get them
        for (let i = 0; i < params.resolution.length; i++) {
            const { pubKey, tokenId } = params.resolution[i];
            if (pubKey && !tokenId) {
                const itemJSON = await item.getAssetItemJSON({
                    assetPubKey: pubKey,
                });
                params.resolution[i].tokenId = itemJSON.tokenId;
            }
            else if (!tokenId) {
                throw new Error('Either a pubKey or tokenId must be provided for each entry');
            }
        }
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.traverseEdge(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// ///////////////// NODE SCOPE ///////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /**
     * Gets the total number of nodes being tracked by the system
     */
    async totalNodes() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.totalNodes(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a raw node object from contract storage
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    async getNode(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getNode(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a JSON formatted representation of the node
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    async getNodeJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getNodeJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0], {
            ByteStringToScriptHash: true,
        });
    }
    /**
     * Creates a new node entity in the system.
     * @param params
     * @param params.label A label for the state that the node represents
     */
    async createNode(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.createNode(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /**
     * Updates the node permissions. Node permissions impact who can manipulate the metadata, add/remove edges, and set
     * triggers.
     * @param params
     * @param params.nodeId the target node
     * @param params.permissions the permission state to update the node to
     */
    async setNodePermissions(params) {
        await this.init();
        return this.config.invoker.invokeFunction({
            invocations: [QuestsAPI.setNodePermissions(this.config.scriptHash, params)],
            signers: [],
        });
    }
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    /// ///////////////// USER SCOPE ///////////////////
    /// ////////////////////////////////////////////////
    /// ////////////////////////////////////////////////
    async getQuestState(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getQuestProgress(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets a JSON formatted representation of the user
     * @param params
     * @param params.nodeId the unique identifier of the node
     */
    async getUserJSON(params) {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.getUserJSON(this.config.scriptHash, params)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
    /**
     * Gets the total number of nodes being tracked by the system
     */
    async totalAccounts() {
        await this.init();
        const res = await this.config.invoker.testInvoke({
            invocations: [QuestsAPI.totalAccounts(this.config.scriptHash)],
            signers: [],
        });
        if (res.stack.length === 0) {
            throw new Error(res.exception ?? 'unrecognized response');
        }
        return this.config.parser.parseRpcResponse(res.stack[0]);
    }
}
//# sourceMappingURL=Quests.js.map