import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createHash, createPublicKey, verify } from 'node:crypto'
import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { cbc } from '@noble/ciphers/aes'
import * as sdk from '@item-systems/item/mobile'

const pairing = new Uint8Array(32).fill(1)
const identityKey = new Uint8Array(32).fill(2)
const uid = new Uint8Array(16).fill(3)
const hash = b => new Uint8Array(createHash('sha256').update(b).digest())
const scalar = n => { const b = new Uint8Array(32); b[31] = n; return b }

// Independent OpenSSL verification of the SDK's P-256 signature, including all
// binding fields. This does not reuse the SDK's proof builder to make an expected proof.
function verifyR1(proof, hostPublic, nonce, cardUid = uid) {
  const publicKey = p256.getPublicKey(identityKey, false)
  const key = createPublicKey({ format: 'jwk', key: {
    kty: 'EC', crv: 'P-256', x: Buffer.from(publicKey.slice(1, 33)).toString('base64url'),
    y: Buffer.from(publicKey.slice(33)).toString('base64url'),
  } })
  const transcript = hash(sdk.concat(new TextEncoder().encode('ITEM_UAC_AUTH_V1'), cardUid, hostPublic, nonce))
  return verify('sha256', sdk.concat(transcript, proof.slice(1, 5)),
    { key, dsaEncoding: 'ieee-p1363' }, proof.slice(5))
}

function peer({ agreement = 2, algorithm = 2, reject = false, wrongReceipt = false, legacyOnly = false } = {}) {
  const curve = agreement === 1 ? secp256k1 : p256
  let cardPrivate, enc, mac, iv, hostPublic, nonce, selects = 0, authenticated = false
  const opens = [], proofs = [], commands = []
  const transport = {
    connect: async () => true,
    disconnect: async () => { authenticated = false },
    transmit: async request => {
      const ins = request[1]
      if (ins === 0xa4) {
        cardPrivate = scalar(++selects + 10)
        authenticated = false
        const tlv = (tag, value) => sdk.concat(Uint8Array.of(tag, value.length), value)
        const body = sdk.concat(tlv(1, Uint8Array.of(1)), tlv(0xa3, uid),
          tlv(0xa4, curve.getPublicKey(cardPrivate, false)), tlv(0xa5, Uint8Array.of(2)),
          tlv(0xa6, Uint8Array.of(3, 5, 0)), tlv(0xa7, Uint8Array.of(1)),
          tlv(0xa8, Uint8Array.of(1, agreement, 5, 4)))
        return sdk.concat(Uint8Array.of(0xa1, body.length), body, sdk.unhex('9000'))
      }
      if (ins === 0x20) {
        opens.push(request.slice())
        assert.equal(request[2], 1, 'identity login must not fall back to root mode')
        assert.equal(request.length, 70)
        if (legacyOnly) return sdk.unhex('6a86')
        hostPublic = request.slice(5)
        nonce = new Uint8Array(32).fill(selects)
        const shared = curve.getSharedSecret(cardPrivate, hostPublic, true).slice(1)
        const keys = sdk.sessionKeys(shared, pairing, nonce)
        enc = keys.slice(0, 32); mac = keys.slice(32); iv = new Uint8Array(16).fill(selects + 1)
        return sdk.concat(nonce, iv, sdk.unhex('9000'))
      }
      const ciphertext = request.slice(21)
      const expected = sdk.cbcMac(mac, sdk.concat(request.slice(0, 5), new Uint8Array(11), ciphertext))
      assert.deepEqual(request.slice(5, 21), expected)
      const plain = sdk.unpad(cbc(enc, iv, { disablePadding: true }).decrypt(ciphertext))
      let payload
      if (ins === 0x21) {
        proofs.push(plain.slice())
        assert.equal(plain.length, 69)
        assert.deepEqual(plain.slice(0, 5), Uint8Array.of(1, 0, 7, 0, algorithm))
        if (algorithm === 2) assert.ok(verifyR1(plain, hostPublic, nonce))
        else {
          const transcript = hash(sdk.concat(new TextEncoder().encode('ITEM_UAC_AUTH_V1'), uid, hostPublic, nonce))
          assert.ok(secp256k1.verify(plain.slice(5), hash(sdk.concat(transcript, plain.slice(1, 5))),
            secp256k1.getPublicKey(identityKey, false)))
        }
        if (reject) return sdk.unhex('6982')
        authenticated = true
        payload = Uint8Array.of(0, wrongReceipt ? 8 : 7, 0, 1)
      } else {
        assert.equal(ins, 0x30); assert.ok(authenticated)
        commands.push(plain.slice())
        if (plain[1] === 0x81) {
          assert.deepEqual(plain, Uint8Array.of(0xa0, 0x81, 255, 255, 0))
          payload = Uint8Array.of(0, 7, 0, 1, 1, 1, 1)
        } else {
          assert.deepEqual(plain, Uint8Array.of(0xa0, 0x82, 0, 7, 4, 0, 0, 1, 1))
          payload = new Uint8Array()
        }
      }
      const encrypted = cbc(enc, expected, { disablePadding: true }).encrypt(sdk.pad(sdk.concat(payload, sdk.unhex('9000'))))
      const tag = sdk.cbcMac(mac, sdk.concat(Uint8Array.of(encrypted.length + 16), new Uint8Array(15), encrypted))
      iv = tag
      return sdk.concat(tag, encrypted, sdk.unhex('9000'))
    },
  }
  return { tunnel: new sdk.ItemSecureTunnel(transport, n => new Uint8Array(randomBytes(n))), opens, proofs, commands }
}

test('self-update clears SDK authentication before queued commands can use revoked keys', async () => {
  const p = peer(); await p.tunnel.connect()
  await p.tunnel.open(pairing, { identityId: 7, privateKey: identityKey })
  const manager = new sdk.UacManager(p.tunnel)
  const update = manager.update(7, 0, 1, 1)
  const query = manager.current()
  await update
  await assert.rejects(query, /Authenticate/)
  assert.equal(p.tunnel.isOpen, false)
  assert.equal(p.tunnel.authenticatedIdentityId, null)
  assert.equal(p.commands.length, 1)
})

for (const agreement of [1, 2]) for (const algorithm of [1, 2])
  test(`identity signature ${algorithm} works independently of tunnel curve ${agreement}`, async () => {
    const p = peer({ agreement, algorithm })
    await p.tunnel.connect()
    assert.equal(p.tunnel.authenticatedIdentityId, null)
    await p.tunnel.open(pairing, { identityId: 7, algorithm, privateKey: identityKey })
    assert.equal(p.tunnel.authenticatedIdentityId, 7)
    assert.equal(p.tunnel.isOpen, true)
    assert.deepEqual(await new sdk.UacManager(p.tunnel).current(), {
      uid: 7, capabilities: 1, policy: 1, threshold: 1, credentialCount: 1,
    })
    await p.tunnel.open(pairing, { identityId: 7, algorithm, privateKey: identityKey })
    assert.notDeepEqual(p.proofs[0], p.proofs[1])
    assert.deepEqual(identityKey, new Uint8Array(32).fill(2), 'caller key is not mutated')
    await p.tunnel.close(); assert.equal(p.tunnel.authenticatedIdentityId, null)
  })

for (const option of ['reject', 'wrongReceipt', 'legacyOnly'])
  test(`identity ${option} fails closed without pairing-only fallback`, async () => {
    const p = peer({ [option]: true }); await p.tunnel.connect()
    await assert.rejects(p.tunnel.open(pairing, { identityId: 7, privateKey: identityKey }))
    assert.equal(p.tunnel.isOpen, false); assert.equal(p.tunnel.authenticatedIdentityId, null)
    assert.equal(p.opens.length, 1)
  })

test('all identity/challenge binding fields are covered by the signature', () => {
  const host = p256.getPublicKey(scalar(7), false), nonce = new Uint8Array(32).fill(9)
  const proof = sdk.identityChallengeProof(uid, host, nonce, { identityId: 7, privateKey: identityKey })
  assert.ok(verifyR1(proof, host, nonce))
  for (const offset of [1, 2, 3, 4, 5, 68]) {
    const changed = proof.slice(); changed[offset] ^= 1
    assert.equal(verifyR1(changed, host, nonce), false)
  }
  assert.equal(verifyR1(proof, host, new Uint8Array(32).fill(8)), false)
  assert.equal(verifyR1(proof, p256.getPublicKey(scalar(8), false), nonce), false)
  assert.equal(verifyR1(proof, host, nonce, new Uint8Array(16).fill(4)), false)
})

test('invalid identity parameters stop before sending OPEN', async () => {
  const p = peer(); await p.tunnel.connect()
  for (const changes of [{ identityId: -1 }, { identityId: 128 }, { credentialSlot: 4 },
    { algorithm: 3 }, { privateKey: new Uint8Array(32) }]) {
    await assert.rejects(p.tunnel.open(pairing, { identityId: 7, privateKey: identityKey, ...changes }))
    assert.equal(p.opens.length, 0)
  }
})
