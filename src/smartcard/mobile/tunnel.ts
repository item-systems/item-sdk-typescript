import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256, sha512 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { cbc } from '@noble/ciphers/aes'
import { apdu, concat, Cursor, equal, hex, response, unhex, word } from './bytes'
import {
  Spake2Client,
  passwordSubject,
  passwordParameters,
  passwordScalar,
  passwordContext,
  exchangeDescriptor,
  SPAKE2_P256_SHA256,
  passwordSessionKeys,
  verifyPasswordConfirmation,
  type PasswordLogin,
} from './password'

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
export interface InitializationInfo {
  version: 2
  phase: 'unconfigured' | 'configured' | 'retired'
  cardAuthentication: 'unconfigured' | 'none' | 'pinned'
  algorithm: 0 | 1 | 2
}
export interface CardInfo {
  uid: string
  version: string
  paired: boolean
  lifecycle: number
  masterSlots: number
  publicKey: Uint8Array
  /** Explicit provider profile from FCI A8. Absent only on legacy P-256 cards. */
  tunnelProfile?: { version: 1; agreement: 1 | 2; cipher: 5; mac: 4 }
  /** Advisory SELECT metadata, not proof of card authenticity. */
  initialization?: InitializationInfo
}
export interface IdentityCredential {
  identityId: number
  /** Stored credential slot, not a CryptoRegistry engine slot. Defaults to 0. */
  credentialSlot?: number
  /** Credential signature curve, independent of the tunnel agreement curve. */
  algorithm?: 1 | 2
  privateKey: Uint8Array
}

/** Explicit host policy. Never infer a trust decision or a pin from unauthenticated SELECT. */
export type CardAuthentication = { mode: 'none' } | { mode: 'pinned'; algorithm: 1 | 2; publicKey: Uint8Array }
export function parseInitializationInfo(data: Uint8Array): InitializationInfo {
  if (
    data.length !== 4 ||
    data[0] !== 2 ||
    data[1] > 2 ||
    (data[1] === 0
      ? data[2] !== 255 || data[3] !== 0
      : data[2] === 0
        ? data[3] !== 0
        : data[2] !== 1 || (data[3] !== 1 && data[3] !== 2))
  )
    throw new Error('Invalid initialization metadata')
  return {
    version: 2,
    phase: (['unconfigured', 'configured', 'retired'] as const)[data[1]],
    cardAuthentication: data[2] === 255 ? 'unconfigured' : data[2] === 0 ? 'none' : 'pinned',
    algorithm: data[3] as 0 | 1 | 2,
  }
}
const ascii = (value: string) => Uint8Array.from(value, c => c.charCodeAt(0))
/** Full v2 transcript. Transport, signature and card-authentication algorithms are independent. */
export function operationalTranscript(info: CardInfo, hostPublic: Uint8Array, reply: Uint8Array): Uint8Array {
  const init = info.initialization
  const profile = info.tunnelProfile
  if (!init || init.phase === 'unconfigured' || !profile || reply.length < 48 || hostPublic.length !== 65)
    throw new Error('Operational initialization/profile is unavailable')
  return sha256(
    concat(
      ascii('ITEM_TUNNEL_V2'),
      unhex(info.uid),
      sha256(info.publicKey),
      hostPublic,
      Uint8Array.of(1, profile.agreement, 5, 4, 2, init.cardAuthentication === 'pinned' ? 1 : 0, init.algorithm),
      reply.slice(0, 48)
    )
  )
}
export function operationalSessionKeys(shared: Uint8Array, nonce: Uint8Array, transcript: Uint8Array): Uint8Array {
  if (shared.length !== 32 || nonce.length !== 32 || transcript.length !== 32)
    throw new Error('Invalid operational key schedule')
  return hkdf(sha256, shared, nonce, concat(ascii('ITEM_TUNNEL_KEYS_V2'), transcript), 64)
}
export function operationalIdentityProof(transcript: Uint8Array, identity: IdentityCredential): Uint8Array {
  validateIdentity(identity)
  if (identity.identityId === 0 || transcript.length !== 32)
    throw new Error('Operational login requires a non-bootstrap identity')
  const algorithm = identity.algorithm ?? 2
  const subject = concat(word(identity.identityId), Uint8Array.of(identity.credentialSlot ?? 0, algorithm))
  const digest = sha256(concat(ascii('ITEM_UAC_PROOF_V2'), transcript, subject))
  return concat(
    Uint8Array.of(2),
    subject,
    (algorithm === 1 ? secp256k1 : p256).sign(digest, identity.privateKey).toCompactRawBytes()
  )
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
  const initialization = tags.get(0xa9)
  const profile = tags.get(0xa8)
  if (
    profile &&
    (profile.length !== 4 ||
      profile[0] !== 1 ||
      (profile[1] !== 1 && profile[1] !== 2) ||
      profile[2] !== 5 ||
      profile[3] !== 4)
  )
    throw new Error('Unsupported tunnel provider profile')
  return {
    paired: take(1, 1)[0] === 1,
    uid: hex(take(0xa3, 16)),
    masterSlots: take(0xa5, 1)[0],
    publicKey: take(0xa4, 65),
    version: Array.from(take(0xa6, 3)).join('.'),
    lifecycle: take(0xa7, 1)[0],
    ...(initialization ? { initialization: parseInitializationInfo(initialization) } : {}),
    ...(profile
      ? { tunnelProfile: { version: 1 as const, agreement: profile[1] as 1 | 2, cipher: 5 as const, mac: 4 as const } }
      : {}),
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
/** @deprecated Legacy reference codec only; not used by open(). Not a verified firmware authentication path. */
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

function validateIdentity(identity: IdentityCredential): void {
  const slot = identity.credentialSlot ?? 0
  const algorithm = identity.algorithm ?? 2
  if (
    !Number.isInteger(identity.identityId) ||
    identity.identityId < 0 ||
    identity.identityId > 127 ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 3 ||
    (algorithm !== 1 && algorithm !== 2)
  )
    throw new Error('Invalid identity challenge parameters')
  const curve = algorithm === 1 ? secp256k1 : p256
  if (identity.privateKey.length !== 32 || !curve.utils.isValidPrivateKey(identity.privateKey))
    throw new Error('Invalid identity signing key')
}

/** Challenge-v1: signs the fresh OPEN nonce, host key, card UID and asserted
 * UID/slot/algorithm. PIN and composite policies are deliberately unsupported. */
export function identityChallengeProof(
  cardUid: Uint8Array,
  hostPublicKey: Uint8Array,
  cardNonce: Uint8Array,
  identity: IdentityCredential
): Uint8Array {
  validateIdentity(identity)
  if (cardUid.length !== 16 || hostPublicKey.length !== 65 || cardNonce.length !== 32)
    throw new Error('Invalid identity challenge lengths')
  const algorithm = identity.algorithm ?? 2
  const subject = concat(word(identity.identityId), Uint8Array.of(identity.credentialSlot ?? 0, algorithm))
  const domain = Uint8Array.from('ITEM_UAC_AUTH_V1', s => s.charCodeAt(0))
  const transcript = sha256(concat(domain, cardUid, hostPublicKey, cardNonce))
  const digest = sha256(concat(transcript, subject))
  const curve = algorithm === 1 ? secp256k1 : p256
  return concat(Uint8Array.of(1), subject, curve.sign(digest, identity.privateKey).toCompactRawBytes())
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
  private authenticatedUid: number | null = null
  private cardAuth: 'none' | 'pairing' | 'pinned' | 'password' | null = null
  private authenticatedMember: number | null = null
  info: CardInfo | null = null
  constructor(
    private transport: CardTransport,
    private random: RandomSource
  ) {}

  get isOpen(): boolean {
    return this.authenticated
  }

  /** Session principal confirmed by the card; null before authentication/after failure. */
  get authenticatedIdentityId(): number | null {
    return this.authenticatedUid
  }

  /** 'none' explicitly means the peer card has NOT been authenticated. */
  get cardAuthenticationStatus(): 'none' | 'pairing' | 'pinned' | 'password' | null {
    return this.cardAuth
  }

  get authenticatedCredentialIdentityId(): number | null {
    return this.authenticatedMember
  }

  private clear(): void {
    this.enc.fill(0)
    this.mac.fill(0)
    this.iv.fill(0)
    this.authenticated = false
    this.authenticatedUid = null
    this.authenticatedMember = null
    this.cardAuth = null
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

  /** Connect and SELECT without pairing or creating wallet keys. New firmware
   * may prepare an ephemeral tunnel key during SELECT. Compare identity after every reconnect. */
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

  /** Authenticate the same card using a fresh SELECT public key for every attempt.
   * SELECT uses the existing transport, not another physical tap. Optional
   * identity uses explicit challenge-v1 mode. Unsupported firmware fails closed;
   * there is no retry as pairing-only root or as the legacy identity codec. */
  open(pairingKey: Uint8Array, identity?: IdentityCredential): Promise<void> {
    return this.openSession(pairingKey, identity)
  }

  /** One user action: select an identity/group and enter its password.
   * Connects if needed; no pairing-key or pinned-key prompt. One attempt only,
   * including transport loss. Wrong/abandoned attempts consume card retry budget.
   * Card authentication here is possession of the enrolled PAKE credential, not
   * a manufacturer certificate or firmware attestation. */
  openWithPassword(input: PasswordLogin): Promise<void> {
    const login = { ...input }
    return this.serial(async g => {
      const expectedUid = this.info?.uid
      this.clear()
      let w: Uint8Array | undefined, keys: Uint8Array | undefined, client: Spake2Client | undefined
      let proofs: ReturnType<Spake2Client['finish']> | undefined
      try {
        const subject = passwordSubject(login)
        const member = login.credentialIdentityId ?? login.identityId
        if (!this.info && !(await this.transport.connect())) throw new Error('No NFC card connected')
        this.current(g)
        this.info = null
        const fresh = parseCardInfo(await this.transmit(apdu(0, 0xa4, 4, 0, unhex(KERNEL_AID)), g))
        if (expectedUid && fresh.uid !== expectedUid) throw new Error('Card changed before password login')
        if (!fresh.initialization || fresh.initialization.phase === 'unconfigured')
          throw new Error('Card initialization is not configured for operational login')
        this.info = fresh
        // Registry flags establish eligibility, not PAKE implementation. Probe
        // the exact configured provider; never silently substitute another curve.
        const provider = exchangeDescriptor(await this.transmit(apdu(0xa0, 0x25, 3, 0, subject), g))
        if (provider.mechanism !== SPAKE2_P256_SHA256 || provider.maxPeerBytes < 65 || provider.maxPublicBytes < 65)
          throw new Error('Selected exchange mechanism is not supported by this SDK')
        const parameters = passwordParameters(await this.transmit(apdu(0xa0, 0x25, 0, 0, subject), g))
        if (parameters.attemptsRemaining === 0) throw new Error('Password credential is locked')
        w = await passwordScalar(login.password, parameters.salt, fresh.uid, member)
        this.current(g)
        client = new Spake2Client(w, this.random)
        const peer = await this.transmit(apdu(0xa0, 0x25, 1, 0, concat(subject, client.share)), g)
        const context = passwordContext(subject, parameters)
        proofs = client.finish(peer, context.clientId, unhex(fresh.uid), context.aad)
        const confirmation = await this.transmit(apdu(0xa0, 0x25, 2, 0, proofs.clientConfirmation), g)
        verifyPasswordConfirmation(proofs.serverConfirmation, confirmation)
        keys = passwordSessionKeys(proofs.sharedSecret, proofs.transcriptHash)
        this.enc = keys.slice(0, 32)
        this.mac = keys.slice(32, 64)
        this.iv = keys.slice(64, 80)
        // Verify the real authenticated principal over the established record layer.
        const receipt = await this.exchange(0x30, apdu(0xa0, 0x81, 255, 255), g)
        if (receipt.length !== 7 || ((receipt[0] << 8) | receipt[1]) !== login.identityId)
          throw new Error('Password login returned the wrong authenticated identity')
        this.authenticatedUid = login.identityId
        this.authenticatedMember = member
        this.cardAuth = 'password'
        this.authenticated = true
      } catch (error) {
        this.clear()
        this.info = null
        await this.transport.disconnect().catch(() => undefined)
        throw error
      } finally {
        w?.fill(0)
        keys?.fill(0)
        client?.destroy()
        if (proofs) for (const bytes of Object.values(proofs)) bytes.fill(0)
        // JavaScript strings cannot be reliably zeroized; do not retain/log input.
        login.password = ''
      }
    })
  }

  /** Pairing-independent login. Policy/pin must come from configuration and
   * authenticated enrollment, not from a key advertised by this connection. */
  openOperational(identity: IdentityCredential, cardAuthentication: CardAuthentication): Promise<void> {
    if (!cardAuthentication || !['none', 'pinned'].includes(cardAuthentication.mode))
      return Promise.reject(new Error('An explicit card-authentication policy is required'))
    return this.openSession(
      null,
      identity,
      cardAuthentication.mode === 'pinned'
        ? { ...cardAuthentication, publicKey: cardAuthentication.publicKey.slice() }
        : { mode: 'none' }
    )
  }

  private openSession(
    pairingKey: Uint8Array | null,
    identity?: IdentityCredential,
    cardAuthentication?: CardAuthentication
  ): Promise<void> {
    const pairing = pairingKey?.slice() ?? new Uint8Array(0)
    const credential = identity ? { ...identity, privateKey: identity.privateKey.slice() } : undefined
    return this.serial(async g => {
      this.clear()
      if (!this.info) throw new Error('Connect a card first')
      if (!cardAuthentication && pairing.length !== 32) throw new Error('Pairing key must contain 32 bytes')
      if (credential) validateIdentity(credential)
      if (cardAuthentication && (!credential || credential.identityId === 0))
        throw new Error('Operational login requires a non-bootstrap identity')
      let priv: Uint8Array = new Uint8Array(0)
      let shared: Uint8Array = new Uint8Array(0)
      let keys: Uint8Array = new Uint8Array(0)
      try {
        // The card's ECDH key is single-use. Never retry OPEN using cached FCI.
        // Pin the previously inspected UID before sending a credential proof.
        const expectedUid = this.info.uid
        const expectedProfile = JSON.stringify(this.info.tunnelProfile)
        this.info = null
        const data = await this.transmit(apdu(0, 0xa4, 4, 0, unhex(KERNEL_AID)), g)
        const fresh = parseCardInfo(data)
        this.current(g)
        if (fresh.uid !== expectedUid)
          throw new Error('Card changed before authentication; connect the intended card again')
        if (JSON.stringify(fresh.tunnelProfile) !== expectedProfile)
          throw new Error('Tunnel profile changed before authentication; inspect the card again')
        this.info = fresh
        if (cardAuthentication) {
          const init = fresh.initialization
          if (
            !init ||
            init.phase === 'unconfigured' ||
            !fresh.tunnelProfile ||
            init.cardAuthentication !== cardAuthentication.mode ||
            init.algorithm !== (cardAuthentication.mode === 'pinned' ? cardAuthentication.algorithm : 0)
          )
            throw new Error('Card authentication policy does not match the configured template')
          if (cardAuthentication.mode === 'pinned') {
            if (
              (cardAuthentication.algorithm !== 1 && cardAuthentication.algorithm !== 2) ||
              cardAuthentication.publicKey.length !== 65
            )
              throw new Error('Invalid pinned card-authentication key')
            ;(cardAuthentication.algorithm === 1 ? secp256k1 : p256).ProjectivePoint.fromHex(
              cardAuthentication.publicKey
            ).assertValidity()
          }
        } else if (fresh.initialization?.phase === 'retired') {
          throw new Error('Bootstrap is retired; pairing authentication is unavailable')
        }
        // Algorithm IDs are protocol values, not allocated registry slots.
        // An omitted legacy profile means P-256; an unknown explicit profile
        // has already failed closed in parseCardInfo. Never try another curve.
        const curve = fresh.tunnelProfile?.agreement === 1 ? secp256k1 : p256
        for (let attempt = 0; attempt < 16; attempt++) {
          priv.fill(0)
          priv = this.random(32)
          if (priv.length !== 32) throw new Error('Random source returned invalid length')
          if (curve.utils.isValidPrivateKey(priv)) break
        }
        const pub = curve.getPublicKey(priv, false)
        shared = curve.getSharedSecret(priv, this.info.publicKey, true).slice(1)
        const reply = await this.transmit(apdu(0xa0, 0x20, cardAuthentication ? 2 : credential ? 1 : 0, 0, pub), g)
        const expectedReplyLength = cardAuthentication?.mode === 'pinned' ? 112 : 48
        if (reply.length !== expectedReplyLength) throw new Error('Invalid secure-channel handshake response')
        const transcript = cardAuthentication ? operationalTranscript(fresh, pub, reply) : undefined
        if (cardAuthentication?.mode === 'pinned') {
          const verifier = cardAuthentication.algorithm === 1 ? secp256k1 : p256
          if (!verifier.verify(reply.slice(48), transcript!, cardAuthentication.publicKey, { lowS: false }))
            throw new Error('Pinned card authentication failed')
        }
        keys = transcript
          ? operationalSessionKeys(shared, reply.slice(0, 32), transcript)
          : sessionKeys(shared, pairing, reply.slice(0, 32))
        this.enc = keys.slice(0, 32)
        this.mac = keys.slice(32)
        this.iv = reply.slice(32, 48)
        const auth = transcript
          ? operationalIdentityProof(transcript, credential!)
          : credential
            ? identityChallengeProof(unhex(this.info.uid), pub, reply.slice(0, 32), credential)
            : this.random(32)
        const proof = await this.exchange(0x21, auth, g)
        if (credential) {
          if (proof.length !== 4 || ((proof[0] << 8) | proof[1]) !== credential.identityId)
            throw new Error('Invalid authenticated identity receipt')
        } else if (proof.length !== 32) throw new Error('Invalid mutual-authentication response')
        this.authenticatedUid = credential?.identityId ?? 0
        this.authenticatedMember = this.authenticatedUid
        this.authenticated = true
        this.cardAuth = cardAuthentication?.mode ?? 'pairing'
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
    return this.serial(async g => {
      if (!this.isOpen) throw new Error('Authenticate the secure tunnel first')
      if (ins === 0x88) {
        // Finalization can intentionally remove the only login. Never retry after
        // a lost acknowledgement, and never keep a stale authenticated session.
        try {
          return await this.exchange(0x30, inner, g)
        } finally {
          this.clear()
          this.info = null
        }
      }
      const reply = await this.exchange(0x30, inner, g)
      // Firmware invalidates a session after changing its own principal. Do not
      // keep a misleading "open" state or send queued work using revoked keys.
      if (ins >= 0x82 && ins <= 0x85 && [this.authenticatedUid, this.authenticatedMember].includes((p1 << 8) | p2))
        this.clear()
      return reply
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
