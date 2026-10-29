import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { concat, equal, unhex, word } from './bytes'
import type { RandomSource, Tunnel } from './tunnel'

const text = (s: string) => new TextEncoder().encode(s)
const DOMAIN = text('ITEM_PASSWORD_V1')
const KEY_DOMAIN = text('ITEM_PASSWORD_TUNNEL_V1')
const M = p256.ProjectivePoint.fromHex('02886e2f97ace46e55ba9dd7242579f2993b64e16ef3dcab95afd497333d8fa12f')
const N = p256.ProjectivePoint.fromHex('03d8bbd6c639c62937b04d997f38c3770719c629d7014d49a24b4f98baa1292b49')
// RFC 9382 section 3.2: RFC 9380 hash_to_curve over the secp256k1 OID seeds.
// Never replace these with hash(seed)*G: that reveals their discrete logarithms.
const K1_M = secp256k1.ProjectivePoint.fromHex(
  '04ee43df9dc974e2d3e0918943141fd984fbee3b8c25c5583c058774d10200e82049f0bc76a7c2429b95872752a9e3cec23c0204d2fa30450eac7e798216e3b17c'
)
const K1_N = secp256k1.ProjectivePoint.fromHex(
  '04b122e318f0b0aef72254960bc7377b36654d6b15ad8f35deccc38c19ef3e1b34e95ec204e5986646e2a712ec5abbe1291fcf89d2d990d091573dbe4e95fa12fd'
)
const integer = (bytes: Uint8Array) => bytes.reduce((n, b) => (n << 8n) | BigInt(b), 0n)
const scalar = (n: bigint) => {
  const out = new Uint8Array(32)
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 255n)
    n >>= 8n
  }
  return out
}
const field = (bytes: Uint8Array) => {
  const size = new Uint8Array(8)
  new DataView(size.buffer).setUint32(0, bytes.length, true)
  return concat(size, bytes)
}

/** Complete protocol identifier, not a curve ID or an allocated registry slot. */
export const SPAKE2_P256_SHA256 = 0x0001
/** ITEM-specific RFC 9382 construction, not an RFC-assigned ciphersuite. */
export const SPAKE2_SECP256K1_SHA256 = 0x0002
function suite(mechanism: number) {
  if (mechanism === SPAKE2_P256_SHA256) return { curve: p256, M, N, domain: DOMAIN, keys: KEY_DOMAIN, credential: 1 }
  if (mechanism === SPAKE2_SECP256K1_SHA256)
    return {
      curve: secp256k1,
      M: K1_M,
      N: K1_N,
      domain: text('ITEM_PASSWORD_K1_V1'),
      keys: text('ITEM_PASSWORD_TUNNEL_K1_V1'),
      credential: 2,
    }
  throw new Error('Unsupported password exchange mechanism')
}
export interface ExchangeDescriptor {
  version: 1
  mechanism: number
  maxPeerBytes: number
  maxPublicBytes: number
}
export function exchangeDescriptor(bytes: Uint8Array): ExchangeDescriptor {
  if (bytes.length !== 7 || bytes[0] !== 1) throw new Error('Unsupported exchange-provider descriptor')
  const mechanism = (bytes[1] << 8) | bytes[2]
  const maxPeerBytes = (bytes[3] << 8) | bytes[4]
  const maxPublicBytes = (bytes[5] << 8) | bytes[6]
  if (!mechanism || maxPeerBytes < 1 || maxPeerBytes > 192 || maxPublicBytes < 1 || maxPublicBytes > 192)
    throw new Error('Invalid exchange-provider bounds')
  return { version: 1, mechanism, maxPeerBytes, maxPublicBytes }
}

export interface PasswordLogin {
  /** The challenged identity or group. Its policy and capabilities are authoritative. */
  identityId: number
  /** Optional member identity whose credential satisfies a direct ANY_OF group. */
  credentialIdentityId?: number
  credentialSlot?: number
  password: string
}
export interface PasswordParameters {
  salt: Uint8Array
  attemptLimit: number
  attemptsRemaining: number
}
export function passwordSubject(login: PasswordLogin): Uint8Array {
  const target = login.identityId
  const member = login.credentialIdentityId ?? target
  const slot = login.credentialSlot ?? 0
  if (
    ![target, member].every(id => Number.isInteger(id) && id >= 1 && id <= 127) ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 3
  )
    throw new Error('Invalid password identity/group')
  return concat(Uint8Array.of(1), word(target), word(member), Uint8Array.of(slot))
}
export function passwordParameters(bytes: Uint8Array, mechanism = SPAKE2_P256_SHA256): PasswordParameters {
  if (
    bytes.length !== 19 ||
    bytes[0] !== suite(mechanism).credential ||
    bytes[17] < 1 ||
    bytes[17] > 10 ||
    bytes[18] > bytes[17]
  )
    throw new Error('Unsupported password credential parameters')
  return { salt: bytes.slice(1, 17), attemptLimit: bytes[17], attemptsRemaining: bytes[18] }
}

/** Fixed local profile: NFC normalization, no trimming, scrypt N=32768,r=8,p=1,
 * 40-byte output reduced mod n. Card cannot request an unbounded work factor.
 * Returns a password-equivalent SECRET; erase after use and never log/persist it. */
export async function passwordScalar(
  password: string,
  salt: Uint8Array,
  cardUid: string,
  member: number,
  mechanism = SPAKE2_P256_SHA256
): Promise<Uint8Array> {
  const profile = suite(mechanism)
  if (
    typeof password !== 'string' ||
    !Number.isInteger(member) ||
    member < 1 ||
    member > 127 ||
    salt.length !== 16 ||
    !/^[0-9a-f]{32}$/i.test(cardUid)
  )
    throw new Error('Invalid password enrollment')
  // Reject lone surrogates instead of silently aliasing distinct passwords.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(password))
    throw new Error('Invalid password text')
  const encoded = text(password.normalize('NFC'))
  let stretched: Uint8Array | undefined
  try {
    if (encoded.length < 4 || encoded.length > 256) throw new Error('Password must contain 4–256 UTF-8 bytes')
    stretched = await scryptAsync(encoded, concat(profile.domain, salt, unhex(cardUid), word(member)), {
      N: 32768,
      r: 8,
      p: 1,
      dkLen: 40,
      maxmem: 40 * 1024 * 1024,
    })
    const w = integer(stretched) % profile.curve.CURVE.n
    if (w === 0n) throw new Error('Invalid derived password scalar')
    return scalar(w)
  } finally {
    encoded.fill(0)
    stretched?.fill(0)
  }
}

/** RFC 9382 client core. Separate from APDU transport for published-vector tests.
 * No password-derived signature/public key is exposed as an offline PIN oracle. */
export class Spake2Client {
  private readonly profile: ReturnType<typeof suite>
  private w: Uint8Array
  private x: Uint8Array
  readonly share: Uint8Array
  constructor(w: Uint8Array, random: RandomSource, mechanism = SPAKE2_P256_SHA256) {
    this.profile = suite(mechanism)
    const { curve, M } = this.profile
    if (w.length !== 32 || !curve.utils.isValidPrivateKey(w)) throw new Error('Invalid password scalar')
    this.w = w.slice()
    this.x = new Uint8Array(0)
    try {
      for (let attempt = 0; attempt < 16; attempt++) {
        this.x.fill(0)
        this.x = random(32)
        if (this.x.length !== 32) throw new Error('Invalid random-source length')
        if (curve.utils.isValidPrivateKey(this.x)) break
      }
      if (!curve.utils.isValidPrivateKey(this.x)) throw new Error('Invalid random scalar')
      const point = curve.ProjectivePoint.BASE.multiply(integer(this.x)).add(M.multiply(integer(this.w)))
      point.assertValidity()
      this.share = point.toRawBytes(false)
    } catch (error) {
      this.destroy()
      throw error
    }
  }

  finish(serverShare: Uint8Array, clientId: Uint8Array, serverId: Uint8Array, aad: Uint8Array) {
    if (this.x.length !== 32 || integer(this.x) === 0n) throw new Error('Password attempt already consumed')
    let transcript: Uint8Array | undefined, digest: Uint8Array | undefined, confirmationKeys: Uint8Array | undefined
    let pointBytes: Uint8Array | undefined
    try {
      if (serverShare.length !== 65 || serverShare[0] !== 4) throw new Error('Invalid password peer share')
      const peer = this.profile.curve.ProjectivePoint.fromHex(serverShare)
      peer.assertValidity()
      const unmasked = peer.subtract(this.profile.N.multiply(integer(this.w)))
      unmasked.assertValidity()
      pointBytes = unmasked.multiply(integer(this.x)).toRawBytes(false)
      transcript = concat(
        field(clientId),
        field(serverId),
        field(this.share),
        field(serverShare),
        field(pointBytes),
        field(this.w)
      )
      digest = sha256(transcript)
      confirmationKeys = hkdf(sha256, digest.subarray(16), new Uint8Array(0), concat(text('ConfirmationKeys'), aad), 32)
      return {
        clientConfirmation: hmac(sha256, confirmationKeys.subarray(0, 16), transcript),
        serverConfirmation: hmac(sha256, confirmationKeys.subarray(16), transcript),
        sharedSecret: digest.slice(0, 16),
        transcriptHash: digest.slice(),
      }
    } finally {
      this.destroy()
      transcript?.fill(0)
      digest?.fill(0)
      confirmationKeys?.fill(0)
      pointBytes?.fill(0)
    }
  }

  destroy(): void {
    this.w?.fill(0)
    this.x?.fill(0)
  }
}
export function passwordContext(subject: Uint8Array, parameters: PasswordParameters, mechanism = SPAKE2_P256_SHA256) {
  const profile = suite(mechanism)
  return {
    clientId: concat(profile.domain, subject),
    aad: concat(Uint8Array.of(1, 5, 4, profile.credential), parameters.salt, Uint8Array.of(parameters.attemptLimit)),
  }
}
export function passwordSessionKeys(
  shared: Uint8Array,
  transcriptHash: Uint8Array,
  mechanism = SPAKE2_P256_SHA256
): Uint8Array {
  return hkdf(sha256, shared, transcriptHash, suite(mechanism).keys, 96)
}
export function verifyPasswordConfirmation(expected: Uint8Array, received: Uint8Array): void {
  if (received.length !== 32 || !equal(expected, received)) throw new Error('Password/card authentication failed')
}

/** Enroll only over an authenticated tunnel. A successful response is the slot,
 * not evidence that login was tested. No retries: an interrupted enrollment has
 * unknown outcome. The password-equivalent record is erased from SDK buffers.
 * Select the configured provider's mechanism explicitly for K1; the compatibility
 * default is P-256. Changing providers requires deliberate credential enrollment,
 * never reinterpretation of an existing suite's record. */
export async function enrollPassword(
  tunnel: Tunnel,
  identityId: number,
  password: string,
  cardUid: string,
  random: RandomSource,
  attemptLimit = 5,
  mechanism = SPAKE2_P256_SHA256
): Promise<number> {
  const profile = suite(mechanism)
  if (!Number.isInteger(attemptLimit) || attemptLimit < 1 || attemptLimit > 10)
    throw new Error('Password attempt limit must be 1–10')
  passwordSubject({ identityId, password })
  const salt = random(16)
  if (salt.length !== 16) throw new Error('Invalid random-source length')
  let w: Uint8Array | undefined, record: Uint8Array | undefined
  try {
    w = await passwordScalar(password, salt, cardUid, identityId, mechanism)
    record = concat(Uint8Array.of(5, profile.credential), salt, w, Uint8Array.of(attemptLimit))
    const reply = await tunnel.tunnel(0x84, identityId >> 8, identityId & 255, record)
    if (reply.length !== 1 || reply[0] > 3) throw new Error('Invalid password-enrollment receipt')
    return reply[0]
  } finally {
    salt.fill(0)
    w?.fill(0)
    record?.fill(0)
  }
}
