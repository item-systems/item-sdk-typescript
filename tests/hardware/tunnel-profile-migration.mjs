/** Hardware acceptance test, NOT a simulated firmware implementation.
 * Bootstrap installation is a prerequisite; this runner never invokes GP.
 * All writes are single attempts. An uncertain outcome requires inspection.
 */
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import {
  ItemSecureTunnel, MicrokernelClient, CryptoRegistryClient, InBandBytecodeLoader, unhex,
} from '@item-systems/item/mobile'

export const R1_APPLET = 'ff6974656d73797304000201'
const R1_PACKAGE = unhex('ff6974656d737973040002')
const PROFILE = agreement => ({ version: 1, agreement, cipher: 5, mac: 4 })
const hash = bytes => createHash('sha256').update(bytes).digest()

/**
 * transport must implement CardTransport and assertAbsent(aid): a read-only
 * SELECT that requires 6A82, not merely absence from CryptoRegistry. The PC/SC
 * adapter separately pins the physical UID. The SDK UID is pinned here too.
 *
 * preflight performs inspection/authentication only. Full execution generates
 * a random on-card master (or explicitly reuses one), derives a diagnostic ring,
 * seals lifecycle, streams the exact CAP, registers r1, and requests migration.
 * INS22 is the existing candidate selector. It is NOT assumed to change A8.
 */
export async function runMigration({ transport, cap, pairing, preflight = false,
  reuseMaster = false, blockSize = 2048, log = () => {},
  // Injectable ONLY for runner unit tests; CLI always uses the actual SDK.
  makeTunnel = t => new ItemSecureTunnel(t, n => new Uint8Array(randomBytes(n))),
}) {
  assert.ok(cap.length > 0 && cap.length <= 30720, 'CAP must fit the current 15-block loader limit')
  assert.equal(pairing.length, 32)
  assert.equal(blockSize, 2048, 'This qualification is for the 2 KB block install profile')
  let stage = 'bootstrap_preflight'
  let tunnel = makeTunnel(transport)
  let cardUid
  const seen = new Set()
  const checkedInfo = (algorithm, lifecycle) => {
    const info = tunnel.info
    assert.equal(info.uid, cardUid, 'Card changed')
    assert.deepEqual(info.tunnelProfile, PROFILE(algorithm), 'Actual tunnel profile did not migrate')
    assert.equal(info.lifecycle, lifecycle, 'Unexpected SELECT lifecycle')
    const curve = algorithm === 1 ? secp256k1 : p256
    curve.ProjectivePoint.fromHex(info.publicKey).assertValidity()
    const fingerprint = hash(info.publicKey).toString('hex')
    assert.ok(!seen.has(fingerprint), 'Reused ephemeral public key')
    seen.add(fingerprint)
    log('handshake_observation', { stage, algorithm, lifecycle, fingerprint })
  }
  const reopen = async (algorithm, lifecycle) => {
    await tunnel.close() // physical power-down in the supplied PC/SC adapter
    tunnel = makeTunnel(transport) // explicit reinspection permits an intended profile change
    await tunnel.connect()
    checkedInfo(algorithm, lifecycle)
    await tunnel.open(pairing)
    checkedInfo(algorithm, lifecycle)
    assert.equal(tunnel.isOpen, true)
    const d = await new MicrokernelClient(tunnel).getDiagnostics()
    assert.equal(d.lifecycle, lifecycle, 'Authenticated lifecycle disagrees with SELECT')
    return d
  }
  const signCheck = async (ring, publicKey, label) => {
    const keys = new MicrokernelClient(tunnel).keyrings
    assert.deepEqual(await keys.exportPublicKey(ring), publicKey, 'Wallet key changed during migration')
    const digest = new Uint8Array(hash(Buffer.from(`ITEM tunnel migration/${label}/${ring}`)))
    const signature = await keys.sign(ring, digest)
    assert.equal(signature.length, 64)
    assert.equal(secp256k1.verify(signature, digest, publicKey, { lowS: false }), true,
      'Independent k1 signature verification failed')
    log('signature_verified', { stage, ring, label })
  }
  try {
    await tunnel.connect()
    cardUid = tunnel.info.uid
    checkedInfo(1, 1)
    assert.equal(tunnel.info.paired, true, 'Pair the disposable bootstrap card explicitly first')
    await transport.assertAbsent(R1_APPLET)
    await tunnel.open(pairing) // fresh kernel SELECT after probing the absent applet
    checkedInfo(1, 1)
    assert.equal(tunnel.isOpen, true)
    let client = new MicrokernelClient(tunnel)
    const before = await client.getDiagnostics()
    assert.equal(before.lifecycle, 1)
    const registry = new CryptoRegistryClient(tunnel)
    const engines = await Promise.all([0, 1, 2].map(slot => registry.querySlot(slot)))
    assert.deepEqual(engines.map(e => e.algorithm), [1, 5, 4])
    assert.ok(engines.every(e => e.active && (e.policy & 4) && e.refCount >= 1))
    const roots = await client.masterkeys.getStats()
    assert.ok(roots.length === 0 || (reuseMaster && roots.length === 1),
      'Expected empty wallet; --reuse-master explicitly permits the one diagnostic root')
    const requiredBlocks = Math.ceil(cap.length / blockSize)
    log('preflight', { cardUid, capBytes: cap.length, capSha256: hash(cap).toString('hex'),
      requiredBlocks, freeBlocks: before.freeBlocks, existingMasters: roots.length,
      lifecycle: before.lifecycle, engines, r1AppletAbsent: true })
    assert.ok(before.freeBlocks >= requiredBlocks,
      `Insufficient staging capacity: need ${requiredBlocks} blocks, have ${before.freeBlocks}`)
    if (preflight) {
      log('preflight_only', { writesPerformed: false, migrationQualified: false })
      return { preflight: true, migrationQualified: false }
    }

    stage = 'bootstrap_wallet'
    const master = roots.length ? roots[0].slot : await client.masterkeys.generate()
    const prior = await client.masterkeys.getStats()
    assert.equal(prior.length, 1)
    const priorRings = new Set(prior[0].rings)
    const publicKey = await client.keyrings.derive(master,
      unhex('8000002c8000003c800000000000000000000010'), engines[0].slot)
    const afterDerive = await client.masterkeys.getStats()
    const newRings = afterDerive[0].rings.filter(id => !priorRings.has(id))
    assert.equal(newRings.length, 1, 'Discover ring ID from metadata, not derive response')
    const ring = newRings[0]
    const walletCount = (await client.getDiagnostics()).ringCount
    await signCheck(ring, publicKey, 'bootstrap_k1')

    stage = 'secure_k1'
    await client.masterkeys.setTunnelAnchor(master, engines[0].slot)
    assert.equal((await client.getDiagnostics()).lifecycle, 2)
    await reopen(1, 2)
    await signCheck(ring, publicKey, 'secured_k1')
    log('stage_passed', { stage, master, ring })

    stage = 'stream_r1'
    const receipt = await new InBandBytecodeLoader(tunnel).streamCap(cap, R1_PACKAGE,
      (sent, total) => log('stream_progress', { sent, total }))
    assert.deepEqual(Buffer.from(receipt), hash(cap))
    log('stage_passed', { stage, meaning: 'hash receipt only; installation not yet proven' })

    stage = 'register_r1'
    const migratedRegistry = new CryptoRegistryClient(tunnel)
    const r1Slot = await migratedRegistry.createSlot(2, 7)
    const descriptor = await migratedRegistry.querySlot(r1Slot)
    assert.equal(descriptor.active, true)
    assert.equal(descriptor.algorithm, 2)
    assert.ok(descriptor.capabilities & 4, 'r1 has no ECDH capability')
    assert.ok(descriptor.policy & 4, 'r1 is not allowed for tunnels')
    assert.equal(descriptor.policy & 0x8000, 0, 'r1 is deprecated')

    stage = 'switch_r1'
    await new MicrokernelClient(tunnel).masterkeys.setTunnelAnchor(master, r1Slot)
    // A 9000 response or updated master.engine is insufficient. A8, real ECDH,
    // mutual authentication and a protected command must all use r1 after reset.
    for (let cycle = 0; cycle < 3; cycle++) {
      const state = await reopen(2, 2)
      assert.equal(state.masterCount, 1)
      assert.equal(state.ringCount, walletCount)
      await signCheck(ring, publicKey, `r1_tunnel_cycle_${cycle}`)
    }
    log('complete', { migrationQualified: true, cardUid, master, ring, r1Slot,
      uniqueEphemeralKeys: seen.size, gpOperations: 0 })
    return { migrationQualified: true, master, ring, r1Slot }
  } catch (error) {
    log('failed', { stage, message: error.message, migrationQualified: false,
      nextAction: 'Inspect card state before retrying; no mutations are automatically replayed' })
    throw error
  } finally {
    await tunnel.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    transport: { type: 'string' }, cap: { type: 'string' }, log: { type: 'string' },
    execute: { type: 'boolean', default: false }, 'reuse-master': { type: 'boolean', default: false },
  } })
  assert.ok(values.transport && values.cap && values.log,
    'Required: --transport adapter.mjs --cap r1.cap --log result.jsonl; default is preflight-only')
  const { createTransport } = await import(pathToFileURL(resolve(values.transport)))
  const transport = await createTransport()
  const log = (event, fields) => {
    const line = JSON.stringify({ time: new Date().toISOString(), event, ...fields })
    console.log(line)
    appendFileSync(values.log, line + '\n')
  }
  try {
    await runMigration({ transport, cap: new Uint8Array(readFileSync(values.cap)),
      pairing: Uint8Array.from({ length: 32 }, (_, i) => i),
      preflight: !values.execute, reuseMaster: values['reuse-master'], log })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
