import { Neo3EventListener, Neo3Invoker, Neo3Parser } from '@cityofzion/neon-dappkit-types'
import { wallet } from '@cityofzion/neon-js'
import { NeoN3EllipticCurves } from '../constants'

type WalletAccount = InstanceType<typeof wallet.Account>

/**
 * Construction-time options for {@link Item.init}.
 *
 * Most consumers only need to provide a custom `node` and, for write flows, an `account`. Advanced integrators can
 * inject their own invoker, listener, or parser implementations to integrate with custom transports or testing setups.
 */
export interface ConstructorOptions {
  /** RPC endpoint used for reads, writes, and event polling. */
  node?: string
  /** ITEM contract script hash to bind the SDK instance to. */
  scriptHash?: string
  /** Custom invocation transport. */
  invoker?: Neo3Invoker
  /** Custom application-log listener. */
  listener?: Neo3EventListener
  /** Custom Neo VM response parser. */
  parser?: Neo3Parser
  /** Optional signer account used by default invoker creation. */
  account?: WalletAccount | undefined
}

/**
 * Polling configuration for transaction-resolution helpers such as `Utils.transactionCompletion()`.
 *
 * @property period Delay between polling attempts, in milliseconds.
 * @property timeout Maximum total wait time, in milliseconds.
 * @property node RPC endpoint to query for the application log.
 */
export type pollingOptions = {
  period: number
  timeout: number
  node: string
}

/**
 * Payload used to upgrade or replace the deployed ITEM contract.
 */
export type ContractUpdate = {
  /** Compiled contract script bytes, typically hex-encoded. */
  script: string
  /** Contract manifest JSON string. */
  manifest: string
  /** Optional contract-defined update payload. */
  data: any
}

/** Hex-encoded string used throughout the SDK for byte-oriented values. */
export type HexString = string
/** Global property identifier encoded as hex. */
export type PropertyId = HexString
/** Property state/value encoded as hex. */
export type PropertyState = HexString
/** Token id encoded as hex. */
export type TokenId = HexString
/** Authentication challenge message encoded as hex. */
export type AuthMessage = HexString
/** Authentication proof/signature encoded as hex. */
export type AuthProof = HexString

/** Input for setting a user-scoped property. */
export type SetUserProperty = {
  localUid: number
  globalPid: PropertyId
  state: PropertyState
}

/** Input for setting an item-scoped property. */
export type SetItemProperty = {
  localNfid: number
  globalPid: PropertyId
  state: PropertyState
}

/** Input for binding a new asset to an item. */
export type BindItem = {
  localNfid: number
  localCid: number
  pubKey: string
  assetEllipticCurve: NeoN3EllipticCurves
}

/** Authorization payload required to purge prior proofs for an item. */
export type PurgeItem = {
  localNfid: number
  message: AuthMessage
  signature: AuthProof
}

/** Input for setting an epoch-scoped property. */
export type SetEpochProperty = {
  localEid: number
  globalPid: PropertyId
  state: PropertyState
}

/** Lookup stub for a configuration. */
export type ConfigurationStub = {
  localCid: number
}

/** Lookup stub for a user. */
export type UserStub = {
  localUid: number
}

/** Lookup stub for an address-based query. */
export type AddressStub = {
  address: string
}

/** Lookup stub for an item. */
export type ItemStub = {
  localNfid: number
}

/** Lookup stub for an epoch. */
export type EpochStub = {
  localEid: number
}

/** Input for creating a new item inside an epoch. */
export type CreateItem = {
  localEid: number
  bindingTokenId: TokenId
}

/** Lookup stub for a public-key-based query. */
export type KeyStub = {
  pubKey: string
}

/** Lookup stub for an asset. */
export type AssetStub = {
  localAsid: number
}

/** Input for setting a configuration-scoped property. */
export type SetConfigurationProperty = {
  localCid: number
  globalPid: PropertyId
  state: PropertyState
}

/** Property values are represented as hex-encoded byte strings. */
export type PropertyValue = HexString
/** Materialized property collection keyed by global property id. */
export type PropertyMap = Record<PropertyId, PropertyValue>

/**
 * Result returned by read-only authentication validation helpers.
 */
export interface AuthValidationResult {
  /** Whether the provided challenge/proof combination is currently valid. */
  valid: boolean
}

/**
 * Materialized user record returned by the SDK.
 */
export interface UserType {
  /** Internal local user id assigned by the contract. */
  id: number
  /** Normalized Neo account object for the user's address. */
  address: WalletAccount
}

/**
 * Materialized epoch record.
 */
export interface EpochType {
  /** Internal local epoch id. */
  id: number
  /** Manufacturer/vendor local user id associated with the epoch. */
  vendor: number
  /** Bound tokenized-asset contract script hash, normalized as `0x...`. */
  binding_script_hash: string
}

/**
 * Reference to a token on a remote tokenized-asset contract.
 */
export interface RemoteToken {
  /** Tokenized-asset contract script hash. */
  scriptHash: string
  /** Token id on the remote contract. */
  tokenId: string
}

/**
 * Materialized item record.
 */
export interface ItemType {
  /** Internal local NFID. */
  id: number
  /** Epoch metadata that defines the binding contract context. */
  epoch: EpochType
  /** Item seed normalized to hex. */
  seed: string
  /** Contract-defined lifecycle state. */
  state: string
  /** Bound token id on the remote tokenized-asset contract. */
  binding_token_id: string
  /** Historical/local asset ids associated with the item. */
  assets: number[]
}

/**
 * Materialized asset record.
 */
export interface AssetType {
  /** Internal local asset id. */
  id: number
  /** Configuration id used when the asset was created. */
  configuration: number
  /** Owning local NFID. */
  item: number
  /** Asset public key normalized to hex. */
  public_key: string
  /** Whether the asset is currently active for the item. */
  active: boolean
  /** Elliptic curve identifier used by the asset key. */
  elliptic_curve: number
  /** Purge heights tracked per challenge family. */
  purge_heights: {
    ils: number
    htls: number
  }
}

/**
 * Materialized manufacturing configuration record.
 */
export interface ConfigurationType {
  /** Internal local configuration id. */
  id: number
  /** Manufacturer local user id that owns the configuration. */
  manufacturer: number
}

/**
 * Decoded payload received from an ITEM NDEF interface.
 */
export interface NdefDecodeType {
  /** Whether the decoded proof verifies against the decoded message and public key. */
  validSignature: boolean
  /** URL-safe public key representation used in ITEM links. */
  uriPubKey: string
  /** Uncompressed public key as hex. */
  pubKeyUnencoded: string
  /** Compressed public key as hex. */
  pubKey: string
  /** Challenge message as hex. */
  message: string
  /** Authentication proof/signature as hex. */
  proof: string
}

/**
 * Challenge families supported by the ITEM authentication model.
 *
 * The permissive vs restrictive distinction and the ILS vs HTLS distinction are enforced by the underlying contract and
 * verifier logic. The enum values are serialized exactly as expected by the contract.
 */
export enum AuthChallenge {
  ILS_PERMISSIVE = '01',
  ILS_RESTRICTIVE = '02',
  HTLS_PERMISSIVE = '03',
  HTLS_RESTRICTIVE = '04',
}

/**
 * Authentication payload exchanged with ITEM challenge methods.
 */
export interface AuthPayload {
  /** Challenge message encoded as hex. */
  message: AuthMessage
  /** Proof/signature encoded as hex. */
  proof: AuthProof
  /** Contract challenge mode to evaluate. Optional; defaults to ILS_PERMISSIVE when omitted. */
  challenge?: AuthChallenge
  /**
   * Optional off-chain payload format/provenance marker.
   *
   * This metadata is retained for application-level processing only and is not serialized into ITEM or IS1 contract
   * invocations.
   */
  structure?: string
}

/**
 * Stateful authentication request submitted on-chain.
 */
export interface AuthItem {
  /** Local NFID to authenticate against. */
  localNfid: number
  /** Challenge payload captured from the item. */
  auth: AuthPayload
  /** Whether the proof should be burned to prevent replay. */
  burn: boolean
}

/**
 * IS1-level authentication request shape used when interacting directly with a tokenized asset contract.
 */
export interface IS1AuthItem {
  tokenId: string
  auth: AuthPayload
  burn: boolean
}

/**
 * Read-only authentication validation request.
 */
export interface IsAuthValid {
  /** Local NFID to validate against. */
  localNfid: number
  /** Challenge payload to simulate. */
  auth: AuthPayload
}

/**
 * Input for the canonical read-only authentication verification helper.
 *
 * This alias preserves compatibility with the original {@link IsAuthValid} request type while aligning the type name
 * with {@link Item.verifyAuth}.
 */
export type VerifyAuth = IsAuthValid

/**
 * Input for claiming ownership of a bound tokenized asset.
 */
export interface ClaimItem {
  /** Asset public key used to resolve the underlying item. */
  pubKey: string
  /** Authentication payload proving possession/control. */
  auth: AuthPayload
  /** Optional receiver account; if omitted, contract defaults apply. */
  receiverAccount?: string
}
