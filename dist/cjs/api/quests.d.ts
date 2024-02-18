import { ContractInvocation } from '@cityofzion/neo3-invoker';
export declare class QuestsAPI {
    static totalQuests(scriptHash: string): ContractInvocation;
    static getQuest(scriptHash: string, params: {
        questId: number;
    }): ContractInvocation;
    static getQuestJSON(scriptHash: string, params: {
        questId: number;
    }): ContractInvocation;
    static createQuest(scriptHash: string, params: {
        title: string;
        description: string;
        maxCompletions: number;
    }): ContractInvocation;
    static setQuestActive(scriptHash: string, params: {
        questId: number;
        state: boolean;
    }): ContractInvocation;
    static totalEdges(scriptHash: string): ContractInvocation;
    static getEdge(scriptHash: string, params: {
        edgeId: number;
    }): ContractInvocation;
    static getEdgeJSON(scriptHash: string, params: {
        edgeId: number;
    }): ContractInvocation;
    static createEdge(scriptHash: string, params: {
        questId: number;
        description: string;
        entryPoint: number;
        exitPoint: number;
    }): ContractInvocation;
    static traverseEdge(scriptHash: string, params: {
        edgeId: number;
        resolution: [];
    }): ContractInvocation;
    static totalNodes(scriptHash: string): ContractInvocation;
    static getNode(scriptHash: string, params: {
        nodeId: number;
    }): ContractInvocation;
    static getNodeJSON(scriptHash: string, params: {
        nodeId: number;
    }): ContractInvocation;
    static createNode(scriptHash: string, params: {
        label: string;
    }): ContractInvocation;
    static setNodePermissions(scriptHash: string, params: {
        nodeId: number;
        permissions: number;
    }): ContractInvocation;
    static getQuestProgress(scriptHash: string, params: {
        address: string;
        questId: number;
    }): ContractInvocation;
    static getUserJSON(scriptHash: string, params: {
        address: string;
    }): ContractInvocation;
    static totalAccounts(scriptHash: string): ContractInvocation;
    static update(scriptHash: string, params: {
        script: string;
        manifest: string;
        data: any;
    }): ContractInvocation;
}
