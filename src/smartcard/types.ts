/**
 * Structured information and descriptor interfaces for smartcard/microkernel resources.
 */

/**
 * Structured metadata for a MasterKey slot in the ITEM Microkernel.
 */
export interface MasterKeyStats {
  slotId: number
  isTunnelAnchor: boolean
  tunnelCryptoSlot: number
  ownerUid: number
  ownerGid: number
  posixMode: number
  refCount: number
  flags: number
  isDeprecated: boolean
  ringCount: number
  ringIds: number[]
}

/**
 * Structured metadata for a derived or standalone KeyRing in the ITEM Microkernel.
 */
export interface KeyRingInfo {
  ringId: number
  masterKeySlot: number
  cryptoEngineSlot: number
  isFused: boolean
  ownerUid: number
  ownerGid: number
  posixMode: number
  refCount: number
  flags: number
  isDeprecated: boolean
  pathLen: number
  path: Uint8Array
}

/**
 * Structured metadata for an on-card SIO plugin in the ITEM Microkernel.
 */
export interface PluginInfo {
  slotId: number
  aid: Uint8Array
  uid: number
  gid: number
  posixMode: number
  quotaBlocks: number
  hCode: Uint8Array
}

/**
 * Microkernel attribute flags for resources.
 */
export enum MicrokernelResourceFlags {
  NONE = 0x0000,
  FUSED = 0x4000,
  DEPRECATED = 0x8000,
}
