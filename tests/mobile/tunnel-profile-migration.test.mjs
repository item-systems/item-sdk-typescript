/** Runner/orchestration tests ONLY. Fake card responses do not qualify firmware,
 * SIO installation, physical ECDH or Java Card firewall behavior. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { p256 } from '@noble/curves/nist.js'
import { runMigration } from '../hardware/tunnel-profile-migration.mjs'

const cap = new Uint8Array(500).fill(42) // not a CAP: orchestration fixture only
const pairing = Uint8Array.from({ length: 32 }, (_, i) => i)
const word = n => [n >>> 8, n & 255]
const fixturePrivate = new Uint8Array(32).fill(7) // public test fixture; never sent to hardware
const fixturePublic = secp256k1.getPublicKey(fixturePrivate, false)

function fixture(options = {}) {
  let algorithm = 1, lifecycle = 1, sample = 0, root = !!options.existingRoot, derived = false
  let r1Registered = false, connected = false, bytes = []
  const calls = [], logs = []
  const transport = { assertAbsent: async () => {
    assert.ok(!options.preinstalled, 'r1 must not already be installed')
  } }
  const info = () => ({ uid: options.changedUid && algorithm === 2 ? 'other' : 'same-card',
    paired: true, lifecycle,
    tunnelProfile: { version: 1, agreement: algorithm, cipher: 5, mac: 4 },
    publicKey: (algorithm === 1 ? secp256k1 : p256).getPublicKey(
      new Uint8Array(32).fill(++sample), false) })
  function makeTunnel() {
    return {
      info: null, isOpen: false,
      async connect() { assert.equal(connected, false); connected = true; this.info = info(); return this.info },
      async open() { this.info = info(); this.isOpen = true },
      async close() { connected = false; this.isOpen = false },
      async tunnel(ins, p1 = 0, p2 = 0, data = new Uint8Array()) {
        assert.equal(this.isOpen, true)
        calls.push({ ins, p1, p2, data: Array.from(data) })
        if (ins === 0x16) return Uint8Array.from([
          ...word(options.freeBlocks ?? 15), ...word(5), +root, root ? 0 : 255,
          +derived, derived ? 9 : 0, 1, 255, lifecycle, 3, 0, 0])
        if (ins === 0x51) {
          const algo = [1, 5, 4, ...(r1Registered ? [2] : [])][p1]
          return Uint8Array.from([+!!algo, algo || 0, 1, ...word(4), ...word(1), ...word(0),
            ...word(7), ...word(0), ...word(1), ...word(493), ...word(1)])
        }
        if (ins === 0x15) return root ? Uint8Array.from([
          1, 0, 1, 0, ...word(0), ...word(1), ...word(448), ...word(1), ...word(0),
          +derived, ...(derived ? [9] : [])]) : new Uint8Array()
        if (ins === 0x17) { root = true; return Uint8Array.of(0) }
        if (ins === 0x13) { derived = true; return fixturePublic }
        if (ins === 0x14) return options.changedKey && algorithm === 2 ? new Uint8Array(65) : fixturePublic
        if (ins === 0x12) return secp256k1.sign(data, fixturePrivate, { lowS: false }).toCompactRawBytes()
        if (ins === 0x22) {
          lifecycle = 2
          if (p2 === 3 && !options.metadataOnly) algorithm = 2
          return new Uint8Array()
        }
        if (ins === 0x55) {
          if (options.beginFailure) throw new Error('Package begin rejected: 6a80')
          assert.equal(new DataView(data.buffer, data.byteOffset).getUint32(0), cap.length)
          return Uint8Array.of(1)
        }
        if (ins === 0x56) { assert.equal(p1, 1); bytes.push(...data); return new Uint8Array() }
        if (ins === 0x57) return options.emptyReceipt ? new Uint8Array() :
          new Uint8Array(createHash('sha256').update(Uint8Array.from(bytes)).digest())
        if (ins === 0x50) {
          if (options.activationFailure) throw new Error('Engine applet not found: 6a82')
          assert.equal(p2, 2); r1Registered = true; return Uint8Array.of(3)
        }
        throw new Error(`Unimplemented fixture INS ${ins}`)
      },
    }
  }
  return { calls, logs, run: overrides => runMigration({ transport, cap, pairing, makeTunnel,
    log: (event, fields) => logs.push({ event, ...fields }), ...overrides }) }
}

test('migration runner exercises all stages, discovered slots and preserved wallet signatures', async () => {
  const f = fixture()
  const result = await f.run()
  assert.deepEqual(result, { migrationQualified: true, master: 0, ring: 9, r1Slot: 3 })
  assert.deepEqual(f.calls.filter(c => c.ins === 0x22).map(c => c.p2), [0, 3])
  assert.equal(f.calls.filter(c => c.ins === 0x12).length, 5)
  assert.equal(f.calls.filter(c => c.ins === 0x56).length, 3)
  assert.ok(f.calls.findIndex(c => c.ins === 0x55) > f.calls.findIndex(c => c.ins === 0x22))
})

test('preflight authenticates/inspects without persistent writes or claiming migration', async () => {
  const f = fixture()
  assert.deepEqual(await f.run({ preflight: true }), { preflight: true, migrationQualified: false })
  assert.ok(f.calls.every(c => [0x16, 0x51, 0x15].includes(c.ins)))
})

test('capacity gate fails before generating keys, sealing state or starting a stream', async () => {
  const f = fixture({ freeBlocks: 0 })
  await assert.rejects(f.run(), /Insufficient staging capacity/)
  assert.ok(f.calls.every(c => [0x16, 0x51, 0x15].includes(c.ins)))
})

test('preinstalled r1 cannot masquerade as tunnel-installed r1', async () => {
  const f = fixture({ preinstalled: true })
  await assert.rejects(f.run(), /already be installed/)
  assert.equal(f.calls.length, 0)
})

test('existing master requires explicit opt-in and is never replaced', async () => {
  const f = fixture({ existingRoot: true })
  await assert.rejects(f.run(), /empty wallet/)
  const opted = fixture({ existingRoot: true })
  await opted.run({ reuseMaster: true })
  assert.equal(opted.calls.filter(c => c.ins === 0x17).length, 0)
})

for (const [name, option, pattern, stage] of [
  ['SDK/firmware BEGIN mismatch', 'beginFailure', /6a80/, 'stream_r1'],
  ['empty commit receipt', 'emptyReceipt', /hash does not match/, 'stream_r1'],
  ['hash-only upload without an applet', 'activationFailure', /6a82/, 'register_r1'],
  ['metadata-only switch', 'metadataOnly', /profile did not migrate/, 'switch_r1'],
  ['changed physical/application identity', 'changedUid', /Card changed/, 'switch_r1'],
  ['changed wallet public key', 'changedKey', /Wallet key changed/, 'switch_r1'],
]) test(`migration runner rejects ${name} and does not replay writes`, async () => {
  const f = fixture({ [option]: true })
  await assert.rejects(f.run(), pattern)
  assert.equal(f.logs.findLast(x => x.event === 'failed').stage, stage)
  assert.equal(f.logs.some(x => x.event === 'complete'), false)
  for (const ins of [0x17, 0x55, 0x57, 0x50]) assert.ok(f.calls.filter(c => c.ins === ins).length <= 1)
})
