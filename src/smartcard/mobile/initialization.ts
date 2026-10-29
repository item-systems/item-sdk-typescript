import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import type { Tunnel, CardAuthentication, InitializationInfo } from './tunnel'
import { parseInitializationInfo } from './tunnel'

export type CardAuthenticationConfiguration = { mode: 'none' } | { mode: 'pinned'; algorithm: 1 | 2 }

/** A template's identity-enrollment section may be empty. Existing identities
 * need not be recreated. Credentials/secrets are supplied separately, never
 * embedded in a shared template. Setting this policy does not enroll identities. */
export interface InitializationTemplate {
  version: 2
  cardAuthentication: CardAuthenticationConfiguration
  identities: ReadonlyArray<{ uid: number; capabilities: number; credentialAlgorithm: 1 | 2 }>
  retireBootstrap: true
}

/** Validate configuration before performing any enrollment or mutation. Empty
 * enrollment is allowed; it neither creates UID0 nor preserves a recovery login. */
export function validateInitializationTemplate(value: InitializationTemplate): void {
  const exactKeys = (object: object, allowed: string[]) => Object.keys(object).every(key => allowed.includes(key))
  if (
    !value ||
    value.version !== 2 ||
    value.retireBootstrap !== true ||
    !Array.isArray(value.identities) ||
    !exactKeys(value, ['version', 'cardAuthentication', 'identities', 'retireBootstrap'])
  )
    throw new Error('Invalid initialization template')
  const auth = value.cardAuthentication
  if (
    !auth ||
    (auth.mode !== 'none' && auth.mode !== 'pinned') ||
    !exactKeys(auth, auth.mode === 'none' ? ['mode'] : ['mode', 'algorithm']) ||
    (auth.mode === 'pinned' && auth.algorithm !== 1 && auth.algorithm !== 2)
  )
    throw new Error('Invalid template card-authentication policy')
  const seen = new Set<number>()
  for (const identity of value.identities) {
    if (
      !identity ||
      !exactKeys(identity, ['uid', 'capabilities', 'credentialAlgorithm']) ||
      !Number.isInteger(identity.uid) ||
      identity.uid < 1 ||
      identity.uid > 127 ||
      seen.has(identity.uid) ||
      !Number.isInteger(identity.capabilities) ||
      identity.capabilities < 0 ||
      identity.capabilities > 65535 ||
      (identity.credentialAlgorithm !== 1 && identity.credentialAlgorithm !== 2)
    )
      throw new Error('Invalid template identity enrollment')
    seen.add(identity.uid)
  }
}

export interface InitializationReceipt {
  info: InitializationInfo
  /** Pin this only when read through an already authenticated bootstrap channel.
   * A receipt is not a manufacturer certificate or firmware attestation. */
  cardAuthentication: CardAuthentication | null
}

export function parseInitializationReceipt(data: Uint8Array): InitializationReceipt {
  const info = parseInitializationInfo(data.slice(0, 4))
  const expected = info.cardAuthentication === 'pinned' ? 69 : 4
  if (data.length !== expected) throw new Error('Invalid initialization receipt length')
  if (info.cardAuthentication === 'unconfigured') return { info, cardAuthentication: null }
  if (info.cardAuthentication === 'none') return { info, cardAuthentication: { mode: 'none' } }
  const publicKey = data.slice(4)
  if (publicKey[0] !== 4) throw new Error('Invalid card-authentication public key')
  const algorithm = info.algorithm as 1 | 2
  ;(algorithm === 1 ? secp256k1 : p256).ProjectivePoint.fromHex(publicKey).assertValidity()
  return { info, cardAuthentication: { mode: 'pinned', algorithm, publicKey } }
}

/** Explicit initialization actions. No automatic identity enrollment, key
 * replacement, bootstrap retirement, fallback, or mutation retries. */
export class InitializationManager {
  constructor(private tunnel: Tunnel) {}

  async configureCardAuthentication(configuration: CardAuthenticationConfiguration): Promise<InitializationReceipt> {
    if (
      !configuration ||
      (configuration.mode !== 'none' && configuration.mode !== 'pinned') ||
      (configuration.mode === 'pinned' && configuration.algorithm !== 1 && configuration.algorithm !== 2)
    )
      throw new Error('Invalid card-authentication configuration')
    const reply = await this.tunnel.tunnel(
      0x86,
      0,
      0,
      Uint8Array.of(
        2,
        configuration.mode === 'pinned' ? 1 : 0,
        configuration.mode === 'pinned' ? configuration.algorithm : 0
      )
    )
    const receipt = parseInitializationReceipt(reply)
    if (
      receipt.info.phase !== 'configured' ||
      receipt.info.cardAuthentication !== configuration.mode ||
      receipt.info.algorithm !== (configuration.mode === 'pinned' ? configuration.algorithm : 0)
    )
      throw new Error('Initialization configuration receipt mismatch')
    return receipt
  }

  async query(): Promise<InitializationReceipt> {
    return parseInitializationReceipt(await this.tunnel.tunnel(0x87))
  }

  /** IRREVERSIBLE within this installed kernel. Erases pairing/UID0 and closes
   * the session. An empty remaining identity set intentionally locks management;
   * separately authorized public interfaces retain their existing policies.
   * On transport failure the outcome is UNKNOWN: inspect, never blindly replay. */
  async retireBootstrap(): Promise<void> {
    const response = await this.tunnel.tunnel(0x88)
    if (response.length !== 0) throw new Error('Unexpected bootstrap-retirement acknowledgement')
  }
}
