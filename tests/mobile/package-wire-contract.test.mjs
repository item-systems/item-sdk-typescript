import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { InBandBytecodeLoader } from '@item-systems/item/mobile'

test('Mobile package wire contract uses uint32 size, P1 session and exact SHA-256 receipt', async () => {
  const data = new Uint8Array(5000).fill(0xaa)
  const aid = Uint8Array.of(1, 2, 3, 4, 5)
  const expected = new Uint8Array(createHash('sha256').update(data).digest())
  const streamed = []
  const progress = []
  let phase = 0
  const loader = new InBandBytecodeLoader({ tunnel: async (ins, p1, p2, payload) => {
    if (ins === 0x55) {
      assert.equal(phase++, 0)
      assert.equal(p1, 0); assert.equal(p2, 0)
      assert.deepEqual(payload, Uint8Array.of(0, 0, 0x13, 0x88, 5, ...aid))
      return Uint8Array.of(2)
    }
    assert.equal(p1, 2); assert.equal(p2, 0)
    if (ins === 0x56) {
      assert.equal(phase, 1)
      assert.ok(payload.length > 0 && payload.length <= 218)
      streamed.push(...payload)
      return Uint8Array.of(streamed.length >>> 8, streamed.length & 255)
    }
    assert.equal(ins, 0x57); assert.equal(phase++, 1)
    assert.equal(payload.length, 0)
    return expected
  } })
  assert.deepEqual(await loader.streamCap(data, aid, (sent, total) => progress.push([sent, total])), expected)
  assert.equal(phase, 2)
  assert.deepEqual(Uint8Array.from(streamed), data)
  assert.deepEqual(progress.at(-1), [5000, 5000])
})
