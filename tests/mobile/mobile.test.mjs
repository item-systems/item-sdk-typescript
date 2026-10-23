import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as sdk from '@item-systems/item/mobile'

const reference = JSON.parse(fs.readFileSync(new URL('./fixtures/python-reference.json', import.meta.url)))
for (const entry of reference.cases)
  test(`Python parity: ${entry.manager}.${entry.method}`, async () => {
    const calls = []
    const channel = {
      tunnel: async (ins, p1 = 0, p2 = 0, data = new Uint8Array()) => {
        calls.push({ ins, p1, p2, data: sdk.hex(data) })
        return sdk.unhex(entry.response)
      },
    }
    const manager = new sdk[entry.manager](channel)
    await manager[entry.method](
      ...entry.args.map(a => (a && typeof a === 'object' && 'hex' in a ? sdk.unhex(a.hex) : a))
    )
    assert.deepEqual(calls, entry.commands)
  })
function session(options = {}) {
  const frames = reference.wire.transcript
  let index = 0
  let randomCount = 0
  const transport = {
    connect: async () => true,
    disconnect: async () => {},
    transmit: async bytes => {
      const f = frames[index++]
      assert.equal(sdk.hex(bytes), f.request)
      const out = sdk.unhex(f.response)
      if (options.tamper && index === 4) out[0] ^= 1
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
  assert.equal(s.count(), 4)
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
