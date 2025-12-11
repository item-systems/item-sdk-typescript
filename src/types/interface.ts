import { Neo3EventListener, Neo3Invoker, Neo3Parser } from '@cityofzion/neon-dappkit-types'
import { wallet } from '@cityofzion/neon-js'
import { NeoN3EllipticCurves } from '../constants'

type WalletAccount = InstanceType<typeof wallet.Account>

export interface ConstructorOptions {
  node?: string
  scriptHash?: string
  invoker?: Neo3Invoker
  listener?: Neo3EventListener
  parser?: Neo3Parser
  account?: WalletAccount | undefined
}

/**
 * Defines optional settings for polling methods. Typically, this is used when waiting for a transaction to be
 * minted to a block in synchronous workflows.
 *
 * @property period - The period at which to poll the node for a result
 * @property timeout - The period to search for a result before timing out
 * @property node - The node to poll against
 *
 * @example
 * const options: pollingOptions = {
 *   period: 1000, //once per second
 *   timeout: 60000, //1 minute timeout
 *   node: NeoN3NetworkOptions.MainNet //Neo N3 mainnet
 * }
 * */
export type pollingOptions = {
  period: number
  timeout: number
  node: string
}

export type ContractUpdate = {
  script: string
  manifest: string
  data: any
}

export type SetUserProperty = {
  localUid: number
  globalPid: string
  state: string
}

export type SetItemProperty = {
  localNfid: number
  globalPid: string
  state: string
}

export type BindItem = {
  localNfid: number
  localCid: number
  pubKey: string
  assetEllipticCurve: NeoN3EllipticCurves
}

export type PurgeItem = {
  localNfid: number
  message: string
  signature: string
}

export type SetEpochProperty = {
  localEid: number
  globalPid: string
  state: string
}

export type ConfigurationStub = {
  localCid: number
}

export type UserStub = {
  localUid: number
}

export type AddressStub = {
  address: string
}

export type ItemStub = {
  localNfid: number
}

export type EpochStub = {
  localEid: number
}

export type KeyStub = {
  pubKey: string
}

export type AssetStub = {
  localAsid: number
}

export type SetConfigurationProperty = {
  localCid: number
  globalPid: string
  state: string
}

export interface UserType {
  id: number
  address: WalletAccount
}

export interface EpochType {
  id: number
  vendor: number
  binding_script_hash: string
}

export interface RemoteToken {
  scriptHash: string
  tokenId: string
}

export interface ItemType {
  id: number
  epoch: EpochType
  seed: string
  state: string
  binding_token_id: string
  assets: number[]
}

export interface AssetType {
  id: number
  configuration: number
  item: number
  public_key: string
  active: boolean
  elliptic_curve: number
  purge_heights: {
    ils: number
    htls: number
  }
}

/**
 * An NFI configuration type
 *
 *
 */
export interface ConfigurationType {
  id: number
  manufacturer: number
}

/**
 * Outlines the format for a decoded payload received from the NDEF interface of an NFI.
 *
 * @property validSignature - Is the signature of the NFI valid? This test only applies to ECDSA challenges.
 * @property uriPubKey - The URI formatted public key that the NFI is currently using to authenticate.
 * @property pubKeyUnencoded - the unencoded public key that the NFI is currently using to authenticate.
 * @property pubKey - the encoded (default) public key that the NFI is currently using to authenticate.
 * @property message - the message that the NFI was challenged with
 * @property proof - the proof that the NFI is asserting in response to the challenge
 *
 * @example
 * const fuu: NdefDecodeType = {
 *   validSignature: true,
 *   uriPubKey: 'BG9c75Iv3vGxeBshtdWKs5SOwZEH4rMSQmWnepL.v4YZReaoeOb3qb5PuZgj.YzqqT61XbYzUmw.G1SapwLunR8-',
 *   pubKeyUnencoded: '046f5cef922fdef1b1781b21b5d58ab3948ec19107e2b3124265a77a92febf861945e6a878e6f7a9be4fb99823f98ceaa93eb55db633526c3e1b549aa702ee9d1f',
 *   pubKey: '036f5cef922fdef1b1781b21b5d58ab3948ec19107e2b3124265a77a92febf8619',
 *   message: '0000000015',
 *   proof: 'd0f1d268b829af308271cac97176893fa8b69a33660591026f72c066d0fd2cad90b2072ec6179d238083ed9697a9c0dc2ca181fa5ba3e0de4a83d3203b3e43e5'
 * }
 */
export interface NdefDecodeType {
  validSignature: boolean
  uriPubKey: string
  pubKeyUnencoded: string
  pubKey: string
  message: string
  proof: string
}

/**
 * Defines an authentication payload in the ITEM ecosystem. It contains a challenge class, a message relevant to the scope of the challenge, and a proof against the challenge.
 * This payload is parsed directly from the interface bus with the NFI when interacting with it and is a primary output of Utils.decodeNDEF().
 *
 * @property message - the message used in the challenge. Refer to the challenge enum for relevant details on what this field should contain.
 * @property proof - the proof provided by the NFI that it has been interfaced with using the message
 * @property challenge - the system-level challenge type that transaction relayer is attempting
 *
 * @example
 * const auth: AuthPayload = {
 *          message: '0000000008', // The challenge message
 *         proof: '7a811313f7de6c2a00c16716a99ed53b0c0208813fb8e65c6166a5f45012512edf6e7535cb54bfc01e4dea5c671005a7b069aa1ef621efd34b7a4dcbef3303f6',
 *         challenge: '01', // Light Integer-Locked Signature authentication mode
 *  }
 */
export interface AuthPayload {
  message: string
  proof: string
  challenge: string
}

/**
 * Defines an api call to assert authentication against an NFI using an associated challenge.
 *
 * @property localNfid - The nfid to run the challenge with
 * @property auth - The authenticate challenge payload
 * @property burn - Should the challenge attempt be burned so it cannot be replayed? If true, all future attempts will fail.
 *
 * * @example
 *  * const fu: AuthItem = {
 *  *   localNfid: 100,
 *  *   auth: {
 *  *           message: '0000000008', // The challenge message
 *  *           proof: '7a811313f7de6c2a00c16716a99ed53b0c0208813fb8e65c6166a5f45012512edf6e7535cb54bfc01e4dea5c671005a7b069aa1ef621efd34b7a4dcbef3303f6',
 *  *           challenge: '01', // Light Integer-Locked Signature authentication mode
 *  *   },
 *      burn: true
 *  * }
 *  */
export interface AuthItem {
  localNfid: number
  auth: AuthPayload
  burn: boolean
}

export interface IS1AuthItem {
  tokenId: string
  auth: AuthPayload
  burn: boolean
}

/**
 * Defines an api call to check if an assert authentication request will pass for an nfi. To execute a relayed version that is
 * minted to a block, use AuthItem.
 *
 * @property localNfid - The nfid to run the challenge with
 * @property auth - The authenticate challenge payload
 *
 * @example
 * const fu: IsAuthValid = {
 *   localNfid: 100,
 *   auth: {
 *           message: '0000000008', // The challenge message
 *           proof: '7a811313f7de6c2a00c16716a99ed53b0c0208813fb8e65c6166a5f45012512edf6e7535cb54bfc01e4dea5c671005a7b069aa1ef621efd34b7a4dcbef3303f6',
 *           challenge: '01', // Light Integer-Locked Signature authentication mode
 *   }
 * }
 */
export interface IsAuthValid {
  localNfid: number
  auth: AuthPayload
}

export interface ClaimItem {
  pubKey: string
  auth: AuthPayload
  receiverAccount?: string
}
