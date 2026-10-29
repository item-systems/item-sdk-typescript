import test from 'node:test'
import assert from 'node:assert/strict'
import { MicrokernelClient, CardError } from '@item-systems/item/mobile'

function report() {
  const data = new Uint8Array(36)
  data.set([0x53, 0x4d, 1, 36])
  const view = new DataView(data.buffer)
  ;[75, 2048, 2032, 5, 12, 63, 7, 1].forEach((value, i) => view.setUint16(4 + i * 2, value))
  view.setUint32(20, 100000)
  view.setUint32(24, 0x80000001)
  view.setUint32(28, 0xffffffff)
  view.setUint16(32, 900)
  view.setUint16(34, 1024)
  return data
}

test('Memory telemetry preserves unsigned 32-bit values, unknowns and separate pool counts', async () => {
  const calls = []
  const client = new MicrokernelClient({
    tunnel: async (...args) => {
      calls.push(args)
      return report()
    },
  })
  const result = await client.getMemoryDiagnostics()
  assert.deepEqual(calls, [[0x16, 1, 0, new Uint8Array()]])
  assert.deepEqual(result, {
    formatVersion: 1,
    totalBlocks: 75,
    blockSize: 2048,
    payloadSize: 2032,
    leasedBlocks: 5,
    materializedBlocks: 12,
    unmaterializedBlocks: 63,
    reusableBlocks: 7,
    quarantinedBlocks: 1,
    persistentFreeBytes: 100000,
    transientResetFreeBytes: 0x80000001,
    transientDeselectFreeBytes: null,
    unusedCommitBytes: 900,
    maxCommitBytes: 1024,
  })
})

test('Memory telemetry rejects legacy, truncated, extended, unknown-version and inconsistent reports', async () => {
  for (const data of [new Uint8Array(14), report().slice(0, 35), new Uint8Array(37)]) {
    await assert.rejects(new MicrokernelClient({ tunnel: async () => data }).getMemoryDiagnostics())
  }
  for (const [offset, value] of [
    [0, 0],
    [2, 2],
    [3, 35],
    [5, 74],
    [13, 11],
    [19, 6],
  ]) {
    const data = report()
    data[offset] = value
    await assert.rejects(new MicrokernelClient({ tunnel: async () => data }).getMemoryDiagnostics())
  }
})

test('Unsupported firmware is surfaced without a fallback request', async () => {
  let calls = 0
  const error = new CardError(0x6a86)
  const client = new MicrokernelClient({
    tunnel: async () => {
      calls++
      throw error
    },
  })
  await assert.rejects(client.getMemoryDiagnostics(), candidate => candidate === error)
  assert.equal(calls, 1)
})

test('Legacy diagnostics request is unchanged', async () => {
  const calls = []
  const client = new MicrokernelClient({
    tunnel: async (...args) => {
      calls.push(args)
      return new Uint8Array(14)
    },
  })
  await client.getDiagnostics()
  assert.deepEqual(calls, [[0x16, 0, 0, new Uint8Array()]])
})
