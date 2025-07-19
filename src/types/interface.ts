import Neon from '@cityofzion/neon-core'
import { Neo3EventListener, Neo3Invoker, Neo3Parser } from '@cityofzion/neon-dappkit-types'

export interface ConstructorOptions {
  node?: string
  scriptHash?: string
  invoker?: Neo3Invoker
  listener?: Neo3EventListener
  parser?: Neo3Parser
  account?: Neon.wallet.Account | undefined
}

export type pollingOptions = {
  period: number
  timeout: number
  node: string
}

export interface AccountITEMPermissions {
  contract_upgrade: boolean
  set_mint_fee: boolean
  create_epoch: boolean
  set_permissions: boolean
}

export interface AccountQuestPermissions {
  contract_upgrade: boolean
  set_permissions: boolean
  create_quest: boolean
}

export interface UserType {
  id: number
  address: Neon.wallet.Account
}

export interface EpochType {
  id: number
  vendor: number
  binding_script_hash: string
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

export interface ConfigurationType {
  id: number
  manufacturer: number
}

export interface NdefDecodeType {
  validSignature: boolean
  uriPubKey: string
  pubKeyUnencoded: string
  pubKey: string
  msg: string
  proof: string
}