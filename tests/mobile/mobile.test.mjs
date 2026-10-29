import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as sdk from '@item-systems/item/mobile'
import { p256 } from '@noble/curves/nist.js'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { cbc } from '@noble/ciphers/aes'

test('Cache managers reject diagnostic and malformed success responses', async () => {
  let response = new Uint8Array(23)
  const calls = []
  const cache = new sdk.KeyRingCacheClient({ tunnel: async (...args) => { calls.push(args); return response } })
  await assert.rejects(cache.setBaseUrl('itm.st/ob/1cf8?d='), /configuration is not confirmed/)
  calls.length = 0
  await assert.rejects(cache.setBaseUrl('é'.repeat(51)), /1–100/)
  await assert.rejects(cache.setBaseUrl(''), /1–100/)
  assert.equal(calls.length, 0)
  response = new Uint8Array()
  await cache.setBaseUrl('é'.repeat(50))
  await assert.rejects(cache.refillCache(0, 1), /response length/)
  response = new Uint8Array(11)
  await assert.rejects(cache.getCacheStatus(0), /response length/)
  response = sdk.unhex('000100020000000006')
  await assert.rejects(cache.getCacheStatus(0), /exceeds capacity/)
  response = sdk.unhex('002000030000000006')
  assert.deepEqual(await cache.getCacheStatus(0), { capacity: 32, unconsumed: 3, nextNonce: 6 })
  response = sdk.unhex('0003')
  assert.equal(await cache.refillCache(0, 255), 3)
})

const reference = JSON.parse(fs.readFileSync(new URL('./fixtures/python-reference.json', import.meta.url)))
// Historical Python POSIX vectors use obsolete 65/66/67 and omit STAT's target
// prefix. Preserve the fixture as historical evidence; current firmware vectors
// and strict response validation live in posix-wire.test.mjs.
for (const entry of reference.cases.filter(entry => entry.manager !== 'PosixManager'))
  test(`${entry.manager === 'UacManager' ? 'Firmware UAC range supersedes historical Python fixture' : 'Python parity'}: ${entry.manager}.${entry.method}`, async () => {
    const calls = []
    const channel = {
      tunnel: async (ins, p1 = 0, p2 = 0, data = new Uint8Array()) => {
        calls.push({ ins, p1, p2, data: sdk.hex(data) })
        return sdk.unhex(entry.response)
      },
    }
    const manager = new sdk[entry.manager](channel)
    if (entry.manager === 'UacManager') {
      // Preserve the pinned historical fixture, but do not perpetuate its invalid
      // UID 258: firmware has 128 identities. Valid wire vectors live in uac-query.
      assert.equal(entry.args[0], 258)
      await assert.rejects(async () => manager[entry.method](
        ...entry.args.map(a => (a && typeof a === 'object' && 'hex' in a ? sdk.unhex(a.hex) : a))
      ), /Identity ID/)
      assert.equal(calls.length, 0)
      return
    }
    await manager[entry.method](
      ...entry.args.map(a => (a && typeof a === 'object' && 'hex' in a ? sdk.unhex(a.hex) : a))
    )
    assert.deepEqual(calls, entry.commands)
  })
function session(options = {}) {
  // Inspection SELECT plus the reference authentication SELECT/OPEN sequence.
  const frames = [reference.wire.transcript[0], ...reference.wire.transcript]
  let index = 0
  let randomCount = 0
  const transport = {
    connect: async () => true,
    disconnect: async () => {},
    transmit: async bytes => {
      const f = frames[index++]
      assert.equal(sdk.hex(bytes), f.request)
      const out = sdk.unhex(f.response)
      if (options.tamper && index === 5) out[0] ^= 1
      return out
    },
  }
  const tunnel = new sdk.ItemSecureTunnel(transport, () =>
    sdk.unhex(randomCount++ === 0 ? reference.wire.hostPrivate : reference.wire.challenge)
  )
  return { tunnel, transport, count: () => index }
}
test('Full Python wire parity: SELECT, ECDH open, mutual authentication and tunneled diagnostics', async () => {
  const s = session()
  const info = await s.tunnel.connect()
  assert.equal(info.version, '3.5.0')
  await s.tunnel.open(sdk.unhex(reference.wire.pairing))
  assert.equal(s.tunnel.isOpen, true)
  const d = await new sdk.MicrokernelClient(s.tunnel).getDiagnostics()
  assert.equal(d.freeBlocks, 64)
  assert.equal(d.leasedBlocks, 11)
  assert.equal(s.count(), 5)
  await s.tunnel.close()
  assert.equal(s.tunnel.isOpen, false)
})
test('Corrupt response MAC invalidates session', async () => {
  const { tunnel } = session({ tamper: true })
  await tunnel.connect()
  await tunnel.open(sdk.unhex(reference.wire.pairing))
  await assert.rejects(tunnel.tunnel(0x16), /authentication failed/)
  assert.equal(tunnel.isOpen, false)
  await assert.rejects(tunnel.tunnel(0x16), /Authenticate/)
})
test('Cancel during NFC connection cannot restore a stale session', async () => {
  let resolve
  const connected = new Promise(_resolve => {
    resolve = _resolve
  })
  let sent = 0
  const tunnel = new sdk.ItemSecureTunnel(
    {
      connect: () => connected,
      disconnect: async () => {},
      transmit: async () => {
        sent++
        return new Uint8Array()
      },
    },
    () => new Uint8Array(32)
  )
  const pending = tunnel.connect()
  await Promise.resolve()
  await tunnel.close()
  resolve(true)
  await assert.rejects(pending, /cancelled/)
  assert.equal(sent, 0)
  assert.equal(tunnel.info, null)
})
test('Malformed data and out-of-range inputs fail before card I/O', async () => {
  const calls = []
  const channel = {
    tunnel: async (...a) => {
      calls.push(a)
      return new Uint8Array()
    },
  }
  assert.throws(() => new sdk.KeyRingManager(channel).sign(0, new Uint8Array(31)), /32 bytes/)
  await assert.rejects(new sdk.KeyRingCacheClient(channel).refillCache(0, 256), /integer/)
  assert.throws(() => sdk.unhex('abc'), /hexadecimal/)
  assert.throws(() => sdk.derivationPath("m/2147483648'"), /integer/)
  assert.throws(() => sdk.unpad(new Uint8Array(16)), /padding/)
  assert.deepEqual(calls, [])
})
test('Master metadata preserves references, flags and ring mapping', async () => {
  const data = reference.cases.find(x => x.method === 'getStats').response
  const [m] = await new sdk.MasterKeyManager({ tunnel: async () => sdk.unhex(data) }).getStats()
  assert.equal(m.refCount, 2)
  assert.equal(m.deprecated, true)
  assert.deepEqual(m.rings, [0])
})
test('CAP loader respects short tunnel capacity and validates completion hash', async () => {
  let sent = 0
  const loader = new sdk.InBandBytecodeLoader({
    tunnel: async (ins, p1, p2, bytes) => {
      if (ins === 0x55) return Uint8Array.of(2)
      if (ins === 0x56) {
        assert.ok(bytes.length <= 218)
        sent += bytes.length
        return new Uint8Array()
      }
      return new Uint8Array(32)
    },
  })
  await assert.rejects(loader.streamCap(new Uint8Array(440), sdk.unhex('0102030405')), /hash/)
  assert.equal(sent, 440)
})

test('Card initialization / pair command sets paired status', async () => {
  const pairingKey = new Uint8Array(32).fill(0xaa)
  let transmittedApdu = null
  const transport = {
    connect: async () => true,
    disconnect: async () => {},
    transmit: async bytes => {
      transmittedApdu = sdk.hex(bytes)
      if (transmittedApdu.startsWith('00a40400')) {
        // SELECT response returning Tag 0xA1 with paired=0 (010100)
        return sdk.unhex(
          'a165010100a310000102030405060708090a0b0c0d0e0fa50108a441045ecbe4d1a6330a44c8f7ef951d4bf165e6c6b721efada985fb41661bc6e7fd6c8734640c4998ff7e374b06ce1a64a2ecd82ab036384fb83d9a79b127a27d5032a603030500a701029000'
        )
      }
      if (transmittedApdu.startsWith('a011000020')) {
        return sdk.unhex('9000')
      }
      return sdk.unhex('6d00')
    },
  }
  const tunnel = new sdk.ItemSecureTunnel(transport, () => new Uint8Array(32))
  const info = await tunnel.connect()
  assert.equal(info.paired, false)
  await tunnel.pair(pairingKey)
  assert.equal(tunnel.info.paired, true)
  assert.equal(transmittedApdu, 'a011000020' + sdk.hex(pairingKey))
  await tunnel.close()
})

// Software reference card with one ECDH key per SELECT, real AES/CBC-MAC frames,
// and public test credentials only. No physical NFC reader is used by this test.
function rotatingCard(options = {}) {
  const curve = options.k1 ? secp256k1 : p256
  let selects = 0, connects = 0, opens = 0, pending = false
  let cardPrivate, enc, mac, iv
  const publicKeys = []
  const transport = {
    connect: async () => { connects++; return true },
    disconnect: async () => {},
    transmit: async bytes => {
      if (bytes[1] === 0xa4) {
        selects++
        if (options.selectFailure && selects === 2) throw new Error('NFC lost during SELECT')
        cardPrivate = new Uint8Array(32); cardPrivate[31] = selects + 2
        pending = true
        const reply = sdk.unhex(reference.wire.transcript[0].response)
        for (let offset = 2; offset < reply.length - 2;) {
          const tag = reply[offset++], length = reply[offset++]
          if (tag === 0xa4) reply.set(curve.getPublicKey(cardPrivate, false), offset)
          if (tag === 0xa3 && options.swapCard && selects === 2) reply[offset] ^= 1
          offset += length
        }
        let profile = options.profile
        if (selects === 2 && options.dropProfile) profile = undefined
        if (selects === 2 && options.changeProfile) profile = [1, 2, 5, 4]
        if (!profile) return reply
        const framed = sdk.concat(reply.slice(0, -2), Uint8Array.of(0xa8, profile.length, ...profile), reply.slice(-2))
        framed[1] += 2 + profile.length
        return framed
      }
      if (bytes[1] === 0x20) {
        opens++
        assert.equal(pending, true, 'Each OPEN must have a fresh SELECT')
        pending = false
        if (options.rejectFirst && opens === 1) return sdk.unhex('6982')
        const pub = bytes.slice(5)
        publicKeys.push(sdk.hex(pub))
        const shared = curve.getSharedSecret(cardPrivate, pub, true).slice(1)
        cardPrivate.fill(0)
        const random = new Uint8Array(32).fill(selects)
        iv = new Uint8Array(16).fill(selects + 10)
        const keys = sdk.sessionKeys(shared, sdk.unhex(reference.wire.pairing), random)
        enc = keys.slice(0, 32); mac = keys.slice(32)
        shared.fill(0); keys.fill(0)
        return sdk.concat(random, iv, sdk.unhex('9000'))
      }
      assert.equal(bytes[1], 0x21)
      const tag = bytes.slice(5, 21), encrypted = bytes.slice(21)
      const meta = sdk.concat(bytes.slice(0, 5), new Uint8Array(11))
      assert.deepEqual(tag, sdk.cbcMac(mac, sdk.concat(meta, encrypted)))
      const challenge = sdk.unpad(cbc(enc, iv, { disablePadding: true }).decrypt(encrypted))
      assert.equal(challenge.length, 32)
      const result = sdk.pad(sdk.concat(new Uint8Array(32).fill(0x42), sdk.unhex('9000')))
      const ciphertext = cbc(enc, tag, { disablePadding: true }).encrypt(result)
      const responseMeta = new Uint8Array(16); responseMeta[0] = 16 + ciphertext.length
      const responseTag = sdk.cbcMac(mac, sdk.concat(responseMeta, ciphertext))
      return sdk.concat(responseTag, ciphertext, sdk.unhex('9000'))
    },
  }
  let randomCounter = 0
  const tunnel = new sdk.ItemSecureTunnel(transport, length => {
    const bytes = new Uint8Array(length)
    bytes[length - 1] = ++randomCounter
    return bytes
  })
  return { tunnel, counts: () => ({ selects, connects, opens }), publicKeys }
}

for (const agreement of [1, 2]) test(`Explicit curve profile ${agreement} opens fresh ephemeral tunnels`, async () => {
  const card = rotatingCard({ k1: agreement === 1, profile: [1, agreement, 5, 4] })
  const first = await card.tunnel.connect()
  assert.equal(first.tunnelProfile.agreement, agreement)
  await card.tunnel.open(sdk.unhex(reference.wire.pairing))
  const previous = card.tunnel.info.publicKey.slice()
  await card.tunnel.open(sdk.unhex(reference.wire.pairing))
  assert.equal(card.tunnel.isOpen, true)
  assert.notDeepEqual(previous, card.tunnel.info.publicKey)
  assert.notEqual(card.publicKeys[0], card.publicKeys[1])
  assert.deepEqual(card.counts(), { selects: 3, connects: 1, opens: 2 })
})

for (const profile of [[1, 3, 5, 4], [2, 1, 5, 4], [1, 1, 4, 4], [1, 1, 5, 5], [1, 1, 5]])
  test(`Unknown or malformed profile ${profile} fails before OPEN`, async () => {
    const card = rotatingCard({ k1: true, profile })
    await assert.rejects(card.tunnel.connect(), /Unsupported tunnel/)
    assert.equal(card.counts().opens, 0)
    assert.equal(card.tunnel.isOpen, false)
  })

for (const option of ['dropProfile', 'changeProfile']) test(`Reject profile ${option} between inspection and OPEN`, async () => {
  const card = rotatingCard({ k1: true, profile: [1, 1, 5, 4], [option]: true })
  await card.tunnel.connect()
  await assert.rejects(card.tunnel.open(sdk.unhex(reference.wire.pairing)), /profile changed/)
  assert.equal(card.counts().opens, 0)
  assert.equal(card.tunnel.info, null)
})

test('A P-256 public key advertised as k1 fails without trying another curve', async () => {
  const card = rotatingCard({ profile: [1, 1, 5, 4] })
  await card.tunnel.connect()
  await assert.rejects(card.tunnel.open(sdk.unhex(reference.wire.pairing)))
  assert.equal(card.counts().opens, 0)
  assert.equal(card.tunnel.isOpen, false)
})

test('Authentication refreshes both ephemeral keys without another NFC connection', async () => {
  const card = rotatingCard()
  const first = await card.tunnel.connect()
  await card.tunnel.open(sdk.unhex(reference.wire.pairing))
  const second = card.tunnel.info.publicKey.slice()
  assert.equal(card.tunnel.isOpen, true)
  assert.notDeepEqual(first.publicKey, second)
  await card.tunnel.open(sdk.unhex(reference.wire.pairing))
  assert.equal(card.tunnel.isOpen, true)
  assert.notDeepEqual(second, card.tunnel.info.publicKey)
  assert.notEqual(card.publicKeys[0], card.publicKeys[1])
  assert.deepEqual(card.counts(), { selects: 3, connects: 1, opens: 2 })
})

test('Rejected authentication retries with a new SELECT on the same NFC connection', async () => {
  const card = rotatingCard({ rejectFirst: true })
  await card.tunnel.connect()
  await assert.rejects(card.tunnel.open(sdk.unhex(reference.wire.pairing)))
  assert.equal(card.tunnel.isOpen, false)
  await card.tunnel.open(sdk.unhex(reference.wire.pairing))
  assert.equal(card.tunnel.isOpen, true)
  assert.deepEqual(card.counts(), { selects: 3, connects: 1, opens: 2 })
})

test('Changed card identity stops before OPEN or credential proof', async () => {
  const card = rotatingCard({ swapCard: true })
  await card.tunnel.connect()
  await assert.rejects(card.tunnel.open(sdk.unhex(reference.wire.pairing)), /Card changed/)
  assert.equal(card.tunnel.isOpen, false)
  assert.equal(card.tunnel.info, null)
  assert.equal(card.counts().opens, 0)
})

test('Failed SELECT clears cached public key and cannot continue authentication', async () => {
  const card = rotatingCard({ selectFailure: true })
  await card.tunnel.connect()
  await assert.rejects(card.tunnel.open(sdk.unhex(reference.wire.pairing)), /NFC lost/)
  assert.equal(card.tunnel.isOpen, false)
  assert.equal(card.tunnel.info, null)
  assert.equal(card.counts().opens, 0)
})

test('Cancellation during authentication SELECT cannot restore metadata or send OPEN', async () => {
  let selects = 0, opens = 0, release
  const pendingSelect = new Promise(resolve => { release = resolve })
  let started
  const selectStarted = new Promise(resolve => { started = resolve })
  const tunnel = new sdk.ItemSecureTunnel({
    connect: async () => true,
    disconnect: async () => {},
    transmit: async bytes => {
      if (bytes[1] === 0xa4) {
        if (++selects === 2) { started(); await pendingSelect }
        return sdk.unhex(reference.wire.transcript[0].response)
      }
      opens++
      return sdk.unhex('6982')
    },
  }, length => new Uint8Array(length).fill(1))
  await tunnel.connect()
  const attempt = tunnel.open(sdk.unhex(reference.wire.pairing))
  const rejected = assert.rejects(attempt, /cancelled/)
  await selectStarted
  await tunnel.close()
  release()
  await rejected
  assert.equal(tunnel.info, null)
  assert.equal(tunnel.isOpen, false)
  assert.equal(opens, 0)
})
