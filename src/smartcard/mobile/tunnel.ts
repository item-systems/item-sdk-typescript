import { p256 } from '@noble/curves/nist.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { cbc } from '@noble/ciphers/aes'
import { apdu, concat, Cursor, equal, hex, response, unhex, word } from './bytes'

export const PYTHON_REFERENCE = 'cd4c319cabbd2040699bb1ebb28c68bd379f64b3'
export const KERNEL_AID = 'ff6974656d73797303000000'
export const CACHE_AID = 'd2760000850101'
/** Host-owned NFC transport. transmit returns data plus SW1/SW2; no automatic mutation replay. */
export interface CardTransport {
  connect(): Promise<boolean>
  transmit(command: Uint8Array): Promise<Uint8Array>
  disconnect(): Promise<void>
}
/** Platform CSPRNG returning exactly length bytes. Never use Math.random or deterministic fixtures in production. */
export type RandomSource = (length: number) => Uint8Array
export interface Tunnel {
  tunnel(ins: number, p1?: number, p2?: number, data?: Uint8Array): Promise<Uint8Array>
}
export interface CardInfo {
  uid: string
  version: string
  paired: boolean
  lifecycle: number
  masterSlots: number
  publicKey: Uint8Array
}
export interface IdentityCredential {
  identityId: number
  privateKey: Uint8Array
}
export function parseCardInfo(data: Uint8Array): CardInfo {
  if (data[0] !== 0xa1 || (data[1] !== data.length && data[1] !== data.length - 2))
    throw new Error('Not an ITEM application response')
  const c = new Cursor(data.slice(2))
  const tags = new Map<number, Uint8Array>()
  while (c.offset < c.data.length) {
    const tag = c.byte()
    const len = c.byte()
    if (tags.has(tag)) throw new Error('Duplicate application metadata')
    tags.set(tag, c.take(len))
  }
  const take = (tag: number, n: number) => {
    const b = tags.get(tag)
    if (!b || b.length !== n) throw new Error('Incomplete ITEM application metadata')
    return b
  }
  return {
    paired: take(1, 1)[0] === 1,
    uid: hex(take(0xa3, 16)),
    masterSlots: take(0xa5, 1)[0],
    publicKey: take(0xa4, 65),
    version: Array.from(take(0xa6, 3)).join('.'),
    lifecycle: take(0xa7, 1)[0],
  }
}
export function pad(data: Uint8Array): Uint8Array {
  const out = new Uint8Array((Math.floor(data.length / 16) + 1) * 16)
  out.set(data)
  out[data.length] = 0x80
  return out
}
export function unpad(data: Uint8Array): Uint8Array {
  let i = data.length - 1
  while (i >= 0 && data[i] === 0) i--
  if (i < 0 || data[i] !== 0x80) throw new Error('Invalid tunnel padding')
  return data.slice(0, i)
}
export function cbcMac(key: Uint8Array, data: Uint8Array): Uint8Array {
  if (!data.length || data.length % 16 !== 0) throw new Error('CBC-MAC input must be block aligned')
  return cbc(key, new Uint8Array(16), { disablePadding: true }).encrypt(data).slice(-16)
}
export function sessionKeys(shared: Uint8Array, pairing: Uint8Array, cardRandom: Uint8Array): Uint8Array {
  return sha512(concat(shared, pairing, cardRandom))
}
/** Reference-compatible identity block. Inputs stay on-device; no Python dependency. */
export function identityPayload(
  shared: Uint8Array,
  pairing: Uint8Array,
  uid: Uint8Array,
  hostPublicKey: Uint8Array,
  identity: IdentityCredential,
  iv: Uint8Array
): Uint8Array {
  const domain = Uint8Array.from('ITEM_HANDSHAKE_INIT_V3', s => s.charCodeAt(0))
  const keys = sha512(concat(shared, pairing, domain))
  const id = word(identity.identityId)
  const proof = p256
    .sign(sha256(concat(uid, hostPublicKey, id)), identity.privateKey, { lowS: false })
    .toCompactRawBytes()
  const plain = concat(id, proof, new Uint8Array(14).fill(14))
  try {
    const encrypted = cbc(keys.slice(0, 32), iv, { disablePadding: true }).encrypt(plain)
    const input = concat(hostPublicKey, iv, encrypted)
    // Python's Cipher.update() emits complete blocks without finalize(). Preserve
    // its existing identity-handshake wire format; ordinary MAC inputs are aligned.
    const tag = cbcMac(keys.slice(32), input.slice(0, input.length - (input.length % 16)))
    return concat(input, tag)
  } finally {
    keys.fill(0)
    plain.fill(0)
    proof.fill(0)
  }
}

/**
 * Serialized, on-device application tunnel; distinct from GlobalPlatform SCP02/03.
 * connect selects/inspects; open authenticates; pair permanently changes pairing state.
 * A cached CardInfo is an observation, not proof that the card is still present.
 */
export class ItemSecureTunnel implements Tunnel {
  private enc: Uint8Array = new Uint8Array(0)
  private mac: Uint8Array = new Uint8Array(0)
  private iv: Uint8Array = new Uint8Array(0)
  private queue: Promise<unknown> = Promise.resolve()
  private generation = 0
  private authenticated = false
  info: CardInfo | null = null
  constructor(
    private transport: CardTransport,
    private random: RandomSource
  ) {}

  get isOpen(): boolean {
    return this.authenticated
  }

  private clear(): void {
    this.enc.fill(0)
    this.mac.fill(0)
    this.iv.fill(0)
    this.authenticated = false
  }

  private current(generation: number): void {
    if (generation !== this.generation) throw new Error('Card session was cancelled')
  }

  private serial<T>(fn: (generation: number) => Promise<T>): Promise<T> {
    const generation = this.generation
    const result = this.queue.then(() => {
      this.current(generation)
      return fn(generation)
    })
    this.queue = result.catch(() => undefined)
    return result
  }

  private async transmit(command: Uint8Array, generation: number): Promise<Uint8Array> {
    this.current(generation)
    const result = await this.transport.transmit(command)
    this.current(generation)
    return response(result)
  }

  /** Connect and SELECT without pairing or creating keys. Compare identity after every reconnect. */
  connect(): Promise<CardInfo> {
    return this.serial(async g => {
      this.clear()
      this.info = null
      try {
        if (!(await this.transport.connect())) throw new Error('No NFC card connected')
        this.current(g)
        const data = await this.transmit(apdu(0, 0xa4, 4, 0, unhex(KERNEL_AID)), g)
        this.info = parseCardInfo(data)
        return this.info
      } catch (e) {
        await this.transport.disconnect().catch(() => undefined)
        throw e
      }
    })
  }

  /** Initialize an explicitly authorized unpaired card with a 32-byte application secret, not GP factory keys. */
  pair(pairingKey: Uint8Array): Promise<void> {
    const pairing = pairingKey.slice()
    return this.serial(async g => {
      if (!this.info) throw new Error('Connect a card first')
      if (pairing.length !== 32) throw new Error('Pairing key must contain 32 bytes')
      try {
        await this.transmit(apdu(0xa0, 0x11, 0, 0, pairing), g)
        this.info.paired = true
      } finally {
        pairing.fill(0)
      }
    })
  }

  /** Authenticate a selected card. Optional identity proof binds the requested UID; a UID alone grants no authority. */
  open(pairingKey: Uint8Array, identity?: IdentityCredential): Promise<void> {
    const pairing = pairingKey.slice()
    const credential = identity
      ? { identityId: identity.identityId, privateKey: identity.privateKey.slice() }
      : undefined
    return this.serial(async g => {
      this.clear()
      if (!this.info) throw new Error('Connect a card first')
      if (pairing.length !== 32) throw new Error('Pairing key must contain 32 bytes')
      let priv: Uint8Array = new Uint8Array(0)
      let shared: Uint8Array = new Uint8Array(0)
      let keys: Uint8Array = new Uint8Array(0)
      try {
        for (let attempt = 0; attempt < 16; attempt++) {
          priv.fill(0)
          priv = this.random(32)
          if (priv.length !== 32) throw new Error('Random source returned invalid length')
          if (p256.utils.isValidPrivateKey(priv)) break
        }
        const pub = p256.getPublicKey(priv, false)
        shared = p256.getSharedSecret(priv, this.info.publicKey, true).slice(1)
        const payload = credential
          ? identityPayload(shared, pairing, unhex(this.info.uid), pub, credential, this.random(16))
          : pub
        const reply = await this.transmit(apdu(0xa0, 0x20, 0, 0, payload), g)
        if (reply.length !== 48) throw new Error('Invalid secure-channel handshake response')
        keys = sessionKeys(shared, pairing, reply.slice(0, 32))
        this.enc = keys.slice(0, 32)
        this.mac = keys.slice(32)
        this.iv = reply.slice(32)
        const proof = await this.exchange(0x21, this.random(32), g)
        if (proof.length !== 32) throw new Error('Invalid mutual-authentication response')
        this.authenticated = true
      } catch (e) {
        this.clear()
        throw e
      } finally {
        priv.fill(0)
        shared.fill(0)
        keys.fill(0)
      }
    }).finally(() => {
      pairing.fill(0)
      credential?.privateKey.fill(0)
    })
  }

  /** Cancel queued work, clear owned session buffers and disconnect; cannot undo an APDU already accepted by the card. */
  close(): Promise<void> {
    this.generation++
    this.clear()
    this.info = null
    return this.transport.disconnect()
  }

  tunnel(ins: number, p1 = 0, p2 = 0, data: Uint8Array = new Uint8Array(0)): Promise<Uint8Array> {
    const inner = apdu(0xa0, ins, p1, p2, data)
    if (inner.length > 223)
      return Promise.reject(new Error('Command data exceeds 218 bytes; split the operation into chunks'))
    return this.serial(g => {
      if (!this.isOpen) throw new Error('Authenticate the secure tunnel first')
      return this.exchange(0x30, inner, g)
    })
  }

  private async exchange(ins: number, plain: Uint8Array, g: number): Promise<Uint8Array> {
    let decoded: Uint8Array
    try {
      const encrypted = cbc(this.enc, this.iv, { disablePadding: true }).encrypt(pad(plain))
      const header = Uint8Array.of(0xa0, ins, 0, 0, encrypted.length + 16)
      const tag = cbcMac(this.mac, concat(header, new Uint8Array(11), encrypted))
      const raw = await this.transmit(concat(header, tag, encrypted), g)
      if (raw.length < 32 || raw.length > 256 || raw.length % 16 !== 0)
        throw new Error('Invalid tunnel response length')
      const ciphertext = raw.slice(16)
      const expected = cbcMac(this.mac, concat(Uint8Array.of(raw.length & 255), new Uint8Array(15), ciphertext))
      if (!equal(expected, raw.slice(0, 16))) throw new Error('Tunnel response authentication failed')
      decoded = unpad(cbc(this.enc, tag, { disablePadding: true }).decrypt(ciphertext))
      if (decoded.length < 2) throw new Error('Missing authenticated status word')
      this.iv.fill(0)
      this.iv = expected
    } catch (e) {
      this.clear()
      throw e
    }
    return response(decoded)
  }
}
