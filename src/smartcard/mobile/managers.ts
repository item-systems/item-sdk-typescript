import { sha256 } from '@noble/hashes/sha2.js'
import { CardError, concat, Cursor, equal, hex, integer, word } from './bytes'
import { Tunnel } from './tunnel'

const empty = new Uint8Array(0)
const textBytes = (text: string) => new TextEncoder().encode(text)
function first(data: Uint8Array): number {
  return new Cursor(data).byte()
}
function sized(data: Uint8Array, length: number, name: string): Uint8Array {
  if (data.length !== length) throw new Error(`${name} must contain ${length} bytes`)
  return data
}
class Manager {
  constructor(protected channel: Tunnel) {}
  protected call(ins: number, p1 = 0, p2 = 0, data: Uint8Array = empty): Promise<Uint8Array> {
    return this.channel.tunnel(ins, integer(p1), integer(p2), data)
  }
}
export interface Diagnostics {
  freeBlocks: number
  leasedBlocks: number
  masterCount: number
  currentMaster: number
  ringCount: number
  currentRing: number
  pluginCount: number
  ndefSlot: number
  lifecycle: number
  version: string
}
export interface MasterKey {
  slot: number
  tunnelAnchor: boolean
  engine: number
  uid: number
  gid: number
  mode: number
  refCount: number
  flags: number
  deprecated: boolean
  rings: number[]
}
export interface Plugin {
  slot: number
  aid: string
  uid: number
  gid: number
  mode: number
  quota: number
  codeHash: string
}
export interface Resource {
  type: number
  id: number
  uid: number
  gid: number
  mode: number
  frozen: boolean
}
export interface Identity {
  uid: number
  capabilities: number
  policy: number
  threshold: number
  credentialCount: number
}
export interface CryptoSlot {
  slot: number
  active: boolean
  algorithm: number
  engineClass: number
  capabilities: number
  usage: number
  flags: number
  policy: number
  uid: number
  gid: number
  mode: number
  refCount: number
}
export interface CacheStatus {
  capacity: number
  unconsumed: number
  nextNonce: number
}

export class MasterKeyManager extends Manager {
  async generate(): Promise<number> {
    return first(await this.call(0x17))
  }

  async importSeed(seed: Uint8Array): Promise<number> {
    return first(await this.call(0x23, 0, 0, sized(seed, 64, 'Seed')))
  }

  async getStats(): Promise<MasterKey[]> {
    let data: Uint8Array
    try {
      data = await this.call(0x15)
    } catch (e) {
      if (e instanceof CardError && e.status === 0x6a10) return []
      throw e
    }
    if (!data.length) return []
    const c = new Cursor(data)
    const count = c.byte()
    const out: MasterKey[] = []
    for (let i = 0; i < count; i++) {
      const slot = c.byte()
      const tunnelAnchor = c.byte() !== 0
      const engine = c.byte()
      const uid = c.word()
      const gid = c.word()
      const mode = c.word()
      const refCount = c.word()
      const flags = c.word()
      out.push({
        slot,
        tunnelAnchor,
        engine,
        uid,
        gid,
        mode,
        refCount,
        flags,
        deprecated: !!(flags & 0x8000),
        rings: Array.from(c.take(c.byte())),
      })
    }
    c.end()
    return out
  }

  delete(slot: number): Promise<Uint8Array> {
    return this.call(0x19, slot)
  }

  setTunnelAnchor(slot: number, engine: number): Promise<Uint8Array> {
    return this.call(0x22, slot, engine)
  }

  setPolicy(slot: number, flags: number): Promise<Uint8Array> {
    return this.call(0x24, slot, 0, word(flags))
  }

  deprecate(slot: number): Promise<Uint8Array> {
    return this.setPolicy(slot, 0x8000)
  }
}
export class KeyRingManager extends Manager {
  derive(master: number, path: Uint8Array, engine = 1): Promise<Uint8Array> {
    if (path.length % 4 || path.length > 40) throw new Error('Derivation path must have at most ten 4-byte components')
    return this.call(0x13, engine, master, path)
  }

  sign(ring: number, digest: Uint8Array): Promise<Uint8Array> {
    return this.call(0x12, ring, 0, sized(digest, 32, 'Digest'))
  }

  exportPublicKey(ring: number): Promise<Uint8Array> {
    return this.call(0x14, ring)
  }

  async generate(engine = 1): Promise<number> {
    return first(await this.call(0x68, engine))
  }

  async importSecret(secret: Uint8Array, engine = 1): Promise<number> {
    return first(await this.call(0x69, engine, 0, sized(secret, 32, 'Private key')))
  }

  delete(ring: number): Promise<Uint8Array> {
    return this.call(0x6a, ring)
  }

  setPolicy(ring: number, flags: number): Promise<Uint8Array> {
    return this.call(0x6b, ring, 0, word(flags))
  }

  deprecate(ring: number): Promise<Uint8Array> {
    return this.setPolicy(ring, 0x8000)
  }
}
export class PosixManager extends Manager {
  async stat(type: number, id: number): Promise<Resource> {
    const c = new Cursor(await this.call(0x65, type, id))
    const uid = c.word()
    const gid = c.word()
    const mode = c.word()
    return { type, id, uid, gid, mode, frozen: !!(mode & 0x4000) }
  }

  chmod(type: number, id: number, mode: number): Promise<Uint8Array> {
    return this.call(0x66, type, id, word(mode))
  }

  chown(type: number, id: number, uid: number, gid: number): Promise<Uint8Array> {
    return this.call(0x67, type, id, concat(word(uid), word(gid)))
  }
}
export class PluginManager extends Manager {
  async register(aid: Uint8Array, uid: number, gid = 1, mode = 0x1ed, quota = 10): Promise<number> {
    if (aid.length < 5 || aid.length > 16) throw new Error('Applet AID must contain 5–16 bytes')
    return first(
      await this.call(0x40, 0, 0, concat(Uint8Array.of(aid.length), aid, word(uid), word(gid), word(mode), word(quota)))
    )
  }

  async query(slot: number): Promise<Plugin | null> {
    const data = await this.call(0x41, slot)
    if (!data.length || data[0] === 0) return null
    const c = new Cursor(data)
    c.byte()
    const aid = hex(c.take(c.byte()))
    const uid = c.word()
    const gid = c.word()
    const mode = c.word()
    const quota = c.word()
    return { slot, aid, uid, gid, mode, quota, codeHash: hex(c.take(32)) }
  }

  update(slot: number, mode: number, quota: number): Promise<Uint8Array> {
    return this.call(0x42, slot, 0, concat(word(mode), word(quota)))
  }

  delete(slot: number): Promise<Uint8Array> {
    return this.call(0x43, slot)
  }

  setActiveNdefProvider(slot: number): Promise<Uint8Array> {
    return this.call(0x44, slot)
  }
}
export class KeyRingCacheClient extends Manager {
  setBaseUrl(url: string): Promise<Uint8Array> {
    const bytes = textBytes(url)
    if (!bytes.length || bytes.length > 218) throw new Error('URL must contain 1–218 UTF-8 bytes')
    return this.call(0x16, 0, 0, bytes)
  }

  async refillCache(ring: number, count: number): Promise<number> {
    if (count < 1) throw new Error('Refill count must be 1–255 per request')
    return new Cursor(await this.call(0x1a, ring, integer(count))).word()
  }

  async getCacheStatus(ring: number): Promise<CacheStatus> {
    const c = new Cursor(await this.call(0x1b, ring))
    const capacity = c.word()
    const unconsumed = c.word()
    const nextNonce = Array.from(c.take(5)).reduce((n, b) => n * 256 + b, 0)
    return { capacity, unconsumed, nextNonce }
  }

  setWatermarkNonce(ring: number, nonce: number): Promise<Uint8Array> {
    integer(nonce, 0xffffffffff)
    const bytes = new Uint8Array(5)
    for (let i = 4; i >= 0; i--) {
      bytes[i] = nonce % 256
      nonce = Math.floor(nonce / 256)
    }
    return this.call(0x1f, ring, 0, bytes)
  }
}
export class CryptoRegistryClient extends Manager {
  async createSlot(algorithm: number, policy = 0): Promise<number> {
    return first(await this.call(0x50, 0, algorithm, word(policy)))
  }

  async querySlot(slot: number): Promise<CryptoSlot> {
    const c = new Cursor(await this.call(0x51, slot))
    const out = {
      slot,
      active: c.byte() !== 0,
      algorithm: c.byte(),
      engineClass: c.byte(),
      capabilities: c.word(),
      usage: c.word(),
      flags: c.word(),
      policy: c.word(),
      uid: c.word(),
      gid: c.word(),
      mode: c.word(),
      refCount: 0,
    }
    if (c.data.length >= 19) out.refCount = c.word()
    return out
  }

  updatePolicy(slot: number, policy: number): Promise<Uint8Array> {
    return this.call(0x52, slot, 0, word(policy))
  }

  deleteSlot(slot: number): Promise<Uint8Array> {
    return this.call(0x53, slot)
  }
}
export class EnclaveClient extends Manager {
  async create(blocks = 1): Promise<number> {
    if (blocks < 1) throw new Error('Allocate at least one block')
    return first(await this.call(0x60, blocks))
  }

  write(id: number, offset: number, data: Uint8Array): Promise<Uint8Array> {
    return this.call(0x61, id, 0, concat(word(offset), data))
  }

  read(id: number, offset: number, length: number): Promise<Uint8Array> {
    return this.call(0x62, id, 0, concat(word(offset), word(length)))
  }

  deprovision(id: number): Promise<Uint8Array> {
    return this.call(0x64, id)
  }
}
export class UacManager extends Manager {
  private id(uid: number): [number, number] {
    integer(uid, 65535)
    return [uid >>> 8, uid & 255]
  }

  create(uid: number, capabilities = 0, policy = 1, threshold = 1): Promise<Uint8Array> {
    return this.call(0x80, 0, policy, concat(word(uid), word(capabilities), Uint8Array.of(integer(threshold))))
  }

  async query(uid: number): Promise<Identity | null> {
    let data: Uint8Array
    try {
      data = await this.call(0x81, ...this.id(uid))
    } catch (e) {
      if (e instanceof CardError && e.status === 0x6a88) return null
      throw e
    }
    if (!data.length) return null
    const c = new Cursor(data)
    const info = { uid: c.word(), capabilities: c.word(), policy: c.byte(), threshold: c.byte(), credentialCount: 0 }
    if (c.offset < data.length) info.credentialCount = c.byte()
    return info
  }

  update(uid: number, capabilities: number, policy: number, threshold: number): Promise<Uint8Array> {
    return this.call(
      0x82,
      ...this.id(uid),
      concat(word(capabilities), Uint8Array.of(integer(policy), integer(threshold)))
    )
  }

  delete(uid: number): Promise<Uint8Array> {
    if (!uid) throw new Error('Root identity cannot be deleted')
    return this.call(0x83, ...this.id(uid))
  }

  async addCredential(uid: number, type: number, data: Uint8Array): Promise<number> {
    return first(await this.call(0x84, ...this.id(uid), concat(Uint8Array.of(integer(type)), data)))
  }

  removeCredential(uid: number, index: number): Promise<Uint8Array> {
    return this.call(0x85, ...this.id(uid), Uint8Array.of(integer(index, 3)))
  }
}
export class VfsManager extends Manager {
  async open(type: number, slot: number, rights: number): Promise<{ handle: number; maxPayload: number }> {
    const c = new Cursor(await this.call(0x82, type, 0, concat(Uint8Array.of(integer(slot)), word(rights))))
    return { handle: c.word(), maxPayload: c.word() }
  }

  close(handle: number): Promise<Uint8Array> {
    integer(handle, 65535)
    return this.call(0x83, handle >>> 8, handle & 255)
  }

  async write(handle: number, offset: number, data: Uint8Array): Promise<number> {
    integer(handle, 65535)
    const c = new Cursor(
      await this.call(0x81, handle >>> 8, handle & 255, concat(word(offset), word(data.length), data))
    )
    return c.word()
  }

  read(handle: number, offset: number, length: number): Promise<Uint8Array> {
    integer(handle, 65535)
    return this.call(0x81, handle >>> 8, handle & 255, concat(word(offset), word(length)))
  }

  async stat(type: number, slot: number): Promise<{ allocated: boolean; uid: number; gid: number; mode: number }> {
    const c = new Cursor(await this.call(0x80, type, 1, Uint8Array.of(integer(slot))))
    return { allocated: !!c.byte(), uid: c.word(), gid: c.word(), mode: c.word() }
  }

  zeroize(type: number, slot: number): Promise<Uint8Array> {
    return this.call(0x80, type, 6, Uint8Array.of(integer(slot)))
  }
}
export class AuditClient extends Manager {
  async latest(): Promise<{ sequence: number; digest: string }> {
    const c = new Cursor(await this.call(0x78))
    return { sequence: c.word(), digest: hex(c.take(16)) }
  }

  static nextDigest(
    previous: Uint8Array,
    sequence: number,
    uid: number,
    event: number,
    context: Uint8Array = empty
  ): Uint8Array {
    const entry = new Uint8Array(16)
    entry.set(concat(word(sequence), word(uid), word(event)))
    entry.set(context.slice(0, 10), 6)
    return sha256(concat(previous, entry))
  }
}
export class InBandBytecodeLoader extends Manager {
  async streamCap(
    cap: Uint8Array,
    aid: Uint8Array,
    progress?: (sent: number, total: number) => void
  ): Promise<Uint8Array> {
    if (!cap.length || cap.length > 0xffffffff || aid.length < 5 || aid.length > 16)
      throw new Error('Invalid CAP or package AID')
    const size = new Uint8Array(4)
    new DataView(size.buffer).setUint32(0, cap.length)
    const slot = first(await this.call(0x55, 0, 0, concat(size, Uint8Array.of(aid.length), aid)))
    // 218-byte data + 5-byte inner header fits the 223-byte secure plaintext budget.
    for (let off = 0; off < cap.length; off += 218) {
      await this.call(0x56, slot, 0, cap.slice(off, off + 218))
      progress?.(Math.min(off + 218, cap.length), cap.length)
    }
    const hash = await this.call(0x57, slot)
    if (hash.length !== 32 || !equal(hash, sha256(cap)))
      throw new Error('Card package hash does not match uploaded CAP')
    return hash
  }
}
export class MicrokernelClient extends Manager {
  readonly masterkeys: MasterKeyManager
  readonly keyrings: KeyRingManager
  readonly plugins: PluginManager
  readonly posix: PosixManager
  readonly uac: UacManager
  readonly vfs: VfsManager
  readonly audit: AuditClient
  constructor(channel: Tunnel) {
    super(channel)
    this.masterkeys = new MasterKeyManager(channel)
    this.keyrings = new KeyRingManager(channel)
    this.plugins = new PluginManager(channel)
    this.posix = new PosixManager(channel)
    this.uac = new UacManager(channel)
    this.vfs = new VfsManager(channel)
    this.audit = new AuditClient(channel)
  }

  async getDiagnostics(): Promise<Diagnostics> {
    const c = new Cursor(await this.call(0x16))
    return {
      freeBlocks: c.word(),
      leasedBlocks: c.word(),
      masterCount: c.byte(),
      currentMaster: c.byte(),
      ringCount: c.byte(),
      currentRing: c.byte(),
      pluginCount: c.byte(),
      ndefSlot: c.byte(),
      lifecycle: c.byte(),
      version: Array.from(c.take(3)).join('.'),
    }
  }
}
