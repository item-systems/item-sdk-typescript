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

/**
 * User Access Control (UAC) Authentication Policies.
 */
export enum AuthPolicy {
  ANY_OF = 0x01,
  ALL_OF = 0x02,
  M_OF_N = 0x03,
}

/**
 * User Access Control (UAC) Credential Types.
 */
export enum AuthCredentialType {
  ASYMMETRIC = 0x01,
  SYMMETRIC = 0x02,
  PIN = 0x03,
  INDIRECT = 0x04,
}

/**
 * User Access Control (UAC) Granular Capability Bitmasks.
 */
export enum UacCapability {
  NONE = 0x0000,
  CREATE_MASTER_KEY = 0x0001,
  SELECT_TUNNEL_MASTERKEY = 0x0002,
  PROVISION_ENCLAVE = 0x0004,
  CONFIGURE_STORAGE = 0x0008,
  CRYPTO_CREATE_ENGINE = 0x0010,
  CRYPTO_LOAD_BYTECODE = 0x0020,
  MANAGE_IDENTITIES = 0x0040,
  KEYRING_PURGE_NONCES = 0x0080,
  CONFIGURE_SYSTEM = 0x0100,
  CRYPTO_EXECUTE = 0x0200,
  CREATE_KEYRING = 0x0400,
  MANAGE_PLUGINS = 0x0800,
  ALL_PRIVILEGES = 0xffff,
}

/**
 * Descriptor structure for a single credential in the UAC Credential Pool.
 */
export interface CredentialDescriptor {
  type: AuthCredentialType
  algorithmId: number
  keyReference: number
  ownerIdentityId: number
  verificationData: Uint8Array
}

/**
 * Structured metadata for a UAC Identity.
 */
export interface IdentityInfo {
  identityId: number
  active: boolean
  authPolicy: AuthPolicy
  requiredThreshold: number
  capabilities: number
  credentialCount: number
  credentials: CredentialDescriptor[]
}
