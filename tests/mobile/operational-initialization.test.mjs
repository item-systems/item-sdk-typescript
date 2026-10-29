import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createHash, hkdfSync } from 'node:crypto'
import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { cbc } from '@noble/ciphers/aes'
import * as sdk from '@item-systems/item/mobile'

const scalar = n => { const a = new Uint8Array(32); a[31] = n; return a }
const uid = new Uint8Array(16).fill(3), credential = { identityId: 7, privateKey: scalar(19) }
const ascii = x => new TextEncoder().encode(x)
const hash = x => new Uint8Array(createHash('sha256').update(x).digest())
const curve = x => x === 1 ? secp256k1 : p256

// Independent transcript construction and Node/OpenSSL HKDF. The peer does not
// call the SDK's operational proof, transcript, or key-schedule helpers.
function peer(options = {}) {
  const agreement = options.agreement ?? 2, cardAlgo = options.cardAlgo ?? 0
  const signing = curve(cardAlgo), cardKey = scalar(29)
  const pin = cardAlgo ? { mode: 'pinned', algorithm: cardAlgo, publicKey: signing.getPublicKey(cardKey, false) }
    : { mode: 'none' }
  let selects = 0, ephemeral, pub, enc, mac, iv, transcript, authenticated = false
  const opens = [], proofs = [], commands = []
  let connected = false, disconnects = 0
  const transport = {
    connect: async () => { assert.equal(connected, false, 'Old transport must be released'); connected = true; return true },
    disconnect: async () => {
      if (options.disconnectDelay) await new Promise(resolve => setTimeout(resolve, options.disconnectDelay))
      authenticated = false; connected = false; disconnects++
    },
    transmit: async request => {
      if (request[1] === 0xa4) {
        ephemeral = scalar(++selects + 10); pub = curve(agreement).getPublicKey(ephemeral, false)
        authenticated = false
        const tlv = (tag, data) => sdk.concat(Uint8Array.of(tag, data.length), data)
        const body = sdk.concat(tlv(1, Uint8Array.of(0)), tlv(0xa3, uid), tlv(0xa4, pub),
          tlv(0xa5, Uint8Array.of(2)), tlv(0xa6, Uint8Array.of(3, 5, 0)), tlv(0xa7, Uint8Array.of(2)),
          tlv(0xa8, Uint8Array.of(1, agreement, 5, 4)),
          tlv(0xa9, Uint8Array.of(2, 2, cardAlgo ? 1 : 0, cardAlgo)))
        return sdk.concat(Uint8Array.of(0xa1, body.length), body, sdk.unhex('9000'))
      }
      if (request[1] === 0x20) {
        opens.push(request.slice()); assert.equal(request[2], 2)
        const host = request.slice(5), nonce = new Uint8Array(32).fill(selects)
        iv = new Uint8Array(16).fill(selects + 1)
        transcript = hash(sdk.concat(ascii('ITEM_TUNNEL_V2'), uid, hash(pub), host,
          Uint8Array.of(1, agreement, 5, 4, 2, cardAlgo ? 1 : 0, cardAlgo), nonce, iv))
        const shared = curve(agreement).getSharedSecret(ephemeral, host, true).slice(1)
        const keys = new Uint8Array(hkdfSync('sha256', shared, nonce,
          sdk.concat(ascii('ITEM_TUNNEL_KEYS_V2'), transcript), 64))
        enc = keys.slice(0, 32); mac = keys.slice(32)
        let signature = new Uint8Array()
        if (cardAlgo) {
          const raw = signing.sign(transcript, cardKey, { lowS: false })
          // Java Card can return high-S ECDSA. Accept either valid representation.
          const high = raw.s > signing.CURVE.n / 2n ? raw.s : signing.CURVE.n - raw.s
          signature = new signing.Signature(raw.r, high).toCompactRawBytes()
          if (options.badSignature) signature[0] ^= 1
        }
        const reply = sdk.concat(nonce, iv, signature)
        if (options.tamperNonce) reply[0] ^= 1
        return sdk.concat(options.truncated ? reply.slice(0, -1) : reply, sdk.unhex('9000'))
      }
      const ct = request.slice(21)
      const tag = sdk.cbcMac(mac, sdk.concat(request.slice(0, 5), new Uint8Array(11), ct))
      assert.deepEqual(request.slice(5, 21), tag)
      const plain = sdk.unpad(cbc(enc, iv, { disablePadding: true }).decrypt(ct))
      let payload = new Uint8Array()
      if (request[1] === 0x21) {
        proofs.push(plain.slice())
        assert.deepEqual(plain.slice(0, 5), Uint8Array.of(2, 0, 7, 0, options.identityAlgo ?? 2))
        const digest = hash(sdk.concat(ascii('ITEM_UAC_PROOF_V2'), transcript, plain.slice(1, 5)))
        assert.ok(curve(options.identityAlgo ?? 2).verify(plain.slice(5), digest,
          curve(options.identityAlgo ?? 2).getPublicKey(credential.privateKey, false)))
        authenticated = true; payload = Uint8Array.of(0, 7, 1, 0)
      } else {
        assert.equal(request[1], 0x30); assert.ok(authenticated); commands.push(plain)
        if (plain[1] === 0x88 && options.lostFinalization) throw new Error('RF response lost after commit')
        if (plain[1] === 0x87) payload = sdk.concat(Uint8Array.of(2, 2, cardAlgo ? 1 : 0, cardAlgo),
          cardAlgo ? pin.publicKey : new Uint8Array())
      }
      const encrypted = cbc(enc, tag, { disablePadding: true }).encrypt(sdk.pad(sdk.concat(payload, sdk.unhex('9000'))))
      const responseTag = sdk.cbcMac(mac, sdk.concat(Uint8Array.of(encrypted.length + 16), new Uint8Array(15), encrypted))
      iv = responseTag
      return sdk.concat(responseTag, encrypted, sdk.unhex('9000'))
    },
  }
  return { tunnel: new sdk.ItemSecureTunnel(transport, n => new Uint8Array(randomBytes(n))), pin, opens, proofs, commands,
    disconnectCount: () => disconnects }
}

for (const agreement of [1, 2]) for (const identityAlgo of [1, 2]) for (const cardAlgo of [0, 1, 2])
  test(`operational ${agreement}/${identityAlgo}/${cardAlgo}: no pairing dependency, explicit card policy`, async () => {
    const p = peer({ agreement, identityAlgo, cardAlgo }); await p.tunnel.connect()
    const identity = { ...credential, algorithm: identityAlgo }
    await p.tunnel.openOperational(identity, p.pin)
    assert.equal(p.tunnel.authenticatedIdentityId, 7)
    assert.equal(p.tunnel.cardAuthenticationStatus, cardAlgo ? 'pinned' : 'none')
    const receipt = await new sdk.InitializationManager(p.tunnel).query()
    assert.equal(receipt.info.phase, 'retired')
    await p.tunnel.openOperational(identity, p.pin)
    assert.notDeepEqual(p.proofs[0], p.proofs[1])
    assert.deepEqual(credential.privateKey, scalar(19))
  })

for (const option of ['badSignature', 'tamperNonce', 'truncated'])
  test(`pinned card ${option} rejects before sending the identity proof; no downgrade`, async () => {
    const p = peer({ cardAlgo: 2, [option]: true }); await p.tunnel.connect()
    await assert.rejects(p.tunnel.openOperational(credential, p.pin))
    assert.equal(p.proofs.length, 0); assert.equal(p.opens.length, 1)
    assert.equal(p.tunnel.isOpen, false); assert.equal(p.tunnel.cardAuthenticationStatus, null)
  })

test('missing policy, wrong pin, different policy and UID0 all fail closed', async () => {
  const p = peer({ cardAlgo: 2 }); await p.tunnel.connect()
  await assert.rejects(p.tunnel.openOperational(credential, undefined))
  await assert.rejects(p.tunnel.openOperational(credential, { mode: 'none' }))
  await assert.rejects(p.tunnel.openOperational({ ...credential, identityId: 0 }, p.pin))
  assert.equal(p.opens.length, 0)
  await assert.rejects(p.tunnel.openOperational(credential, { ...p.pin, publicKey: p256.getPublicKey(scalar(30), false) }))
  assert.equal(p.proofs.length, 0)
  await assert.rejects(p.tunnel.open(new Uint8Array(32)), /retired/)
})

for (const lostFinalization of [false, true])
  test(`retirement clears session and queued work, including unknown outcome=${lostFinalization}`, async () => {
    const p = peer({ lostFinalization, disconnectDelay: 10 }); await p.tunnel.connect(); await p.tunnel.openOperational(credential, p.pin)
    const manager = new sdk.InitializationManager(p.tunnel)
    const retirement = manager.retireBootstrap(), queued = manager.query()
    const results = await Promise.allSettled([retirement, queued])
    assert.equal(results[0].status, lostFinalization ? 'rejected' : 'fulfilled')
    assert.equal(results[1].status, 'rejected'); assert.equal(p.commands.length, 1)
    assert.equal(p.tunnel.isOpen, false); assert.equal(p.tunnel.info, null)
    assert.equal(p.disconnectCount(), 1)
    await p.tunnel.connect() // must not race the previous connection's cleanup
  })

test('configuration API does not create an identity or silently choose a card key', async () => {
  const calls = []
  const manager = new sdk.InitializationManager({ tunnel: async (...args) => {
    calls.push(args); return Uint8Array.of(2, 1, 0, 0)
  } })
  await assert.rejects(manager.configureCardAuthentication({ mode: 'pinned', algorithm: 3 }))
  assert.equal(calls.length, 0)
  assert.deepEqual((await manager.configureCardAuthentication({ mode: 'none' })).cardAuthentication, { mode: 'none' })
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 0x86)
  assert.deepEqual(calls[0][3], Uint8Array.of(2, 0, 0))
  for (const bad of [Uint8Array.of(2, 0, 0, 0), Uint8Array.of(2, 2, 255, 0), Uint8Array.of(2, 1, 0, 2),
    Uint8Array.of(2, 1, 0, 0, 0), Uint8Array.of(2, 1, 1, 2)])
    assert.throws(() => sdk.parseInitializationReceipt(bad))
})
