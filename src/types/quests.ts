export enum NodePermissions {
  PUBLIC = 1,
  RESTRICTED,
}

export enum QuestPermissions {
  PUBLIC = 1,
  RESTRICTED,
}

export interface EdgeConditionITEMPick {
  condition_type?: number
  label?: string
  count: number
  tokens: number[]
}

export interface EdgeConditionEpochPick {
  condition_type?: number
  label?: string
  count: number
  epochs: number[]
}

export interface EdgeResolutionITEMPick {
  tokenId?: number
  pubKey?: string
  msg: string
  sig: string
}

export interface NodeType {
  nodeId: number
  label: string
  edges: [number]
  creator: string
  permissions: NodePermissions
}

export interface QuestType {
  quest_id: number
  creator: string
  permissions: QuestPermissions
  active: boolean
  title: string
  description: string
  completions: number
  max_completions: number
  entry_nodes: [number]
  exit_nodes: [number]
  edges: [number]
}

export interface EdgeType {
  edge_id: number
  quest_id: number
  description: string
  entry_node: number
  exit_node: number
  condition: EdgeConditionITEMPick | EdgeConditionEpochPick
}
