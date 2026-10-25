import assert from 'assert'
import { sha256 } from '@noble/hashes/sha2.js'
import {
  PluginRegisterCommand,
  PluginQueryCommand,
  PluginUpdateCommand,
  PluginDeleteCommand,
  PluginSetActiveNdefProviderCommand,
  PackageBeginCommand,
  PackageStreamCommand,
  PackageCommitCommand,
  PluginQueryResponse,
  PackageCommitResponse,
  PluginManager,
  InBandBytecodeLoader,
  CardReader,
  CommandApdu,
  ResponseAPDU,
  StatusWord,
  Uint8,
} from '../../src/smartcard'

describe('Smartcard Plugin Management and In-Band Bytecode Loader APDUs', () => {
  const mockAid = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00, 0x02])

  describe('Plugin Command APDU Serialization', () => {
    it('constructs PluginRegisterCommand correctly', () => {
      const cmd = new PluginRegisterCommand(mockAid, 1000, 1001, 0x01ed, 15)
      const data = cmd.getData()
      assert.strictEqual(data[0], mockAid.length)
      assert.deepStrictEqual(data.slice(1, 1 + mockAid.length), mockAid)

      const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
      let off = 1 + mockAid.length
      assert.strictEqual(view.getUint16(off), 1000)
      off += 2
      assert.strictEqual(view.getUint16(off), 1001)
      off += 2
      assert.strictEqual(view.getUint16(off), 0x01ed)
      off += 2
      assert.strictEqual(view.getUint16(off), 15)

      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x40)
      assert.strictEqual(raw[2], 0x00)
      assert.strictEqual(raw[3], 0x00)
      assert.strictEqual(raw[4], data.length)
    })

    it('constructs PluginQueryCommand correctly', () => {
      const cmd = new PluginQueryCommand(3)
      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x41)
      assert.strictEqual(raw[2], 3)
      assert.strictEqual(raw[3], 0x00)
      assert.strictEqual(raw[4], 0)
    })

    it('constructs PluginUpdateCommand correctly', () => {
      const cmd = new PluginUpdateCommand(2, 0x01ff, 25)
      const data = cmd.getData()
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
      assert.strictEqual(view.getUint16(0), 0x01ff)
      assert.strictEqual(view.getUint16(2), 25)

      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x42)
      assert.strictEqual(raw[2], 2)
      assert.strictEqual(raw[4], 4)
    })

    it('constructs PluginDeleteCommand correctly', () => {
      const cmd = new PluginDeleteCommand(1)
      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x43)
      assert.strictEqual(raw[2], 1)
      assert.strictEqual(raw[4], 0)
    })

    it('constructs PluginSetActiveNdefProviderCommand correctly', () => {
      const cmd = new PluginSetActiveNdefProviderCommand(2)
      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x44)
      assert.strictEqual(raw[2], 2)
      assert.strictEqual(raw[4], 0)
    })
  })

  describe('Bytecode Loader Command APDU Serialization', () => {
    const pkgAid = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00])

    it('constructs PackageBeginCommand correctly', () => {
      const cmd = new PackageBeginCommand(1024, pkgAid)
      const data = cmd.getData()
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
      assert.strictEqual(view.getUint32(0), 1024)
      assert.strictEqual(data[4], pkgAid.length)
      assert.deepStrictEqual(data.slice(5), pkgAid)

      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x55)
    })

    it('constructs PackageStreamCommand correctly', () => {
      const chunk = new Uint8Array([1, 2, 3, 4, 5])
      const cmd = new PackageStreamCommand(1, chunk)
      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x56)
      assert.strictEqual(raw[2], 1)
      assert.strictEqual(raw[4], 5)
      assert.deepStrictEqual(cmd.getData(), chunk)
    })

    it('constructs PackageCommitCommand correctly', () => {
      const cmd = new PackageCommitCommand(1)
      const raw = cmd.toArray()
      assert.strictEqual(raw[0], 0x80)
      assert.strictEqual(raw[1], 0x57)
      assert.strictEqual(raw[2], 1)
      assert.strictEqual(raw[4], 0)
    })
  })

  describe('Response APDU Parsers', () => {
    it('parses PluginQueryResponse with populated plugin metadata', () => {
      const hCode = sha256(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
      const payload = new Uint8Array(1 + 1 + mockAid.length + 2 + 2 + 2 + 2 + 32 + 2)
      payload[0] = 0x01 // status: allocated
      payload[1] = mockAid.length
      payload.set(mockAid, 2)
      let off = 2 + mockAid.length
      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength)
      view.setUint16(off, 1000) // uid
      off += 2
      view.setUint16(off, 1001) // gid
      off += 2
      view.setUint16(off, 0x01ed) // mode
      off += 2
      view.setUint16(off, 10) // quota
      off += 2
      payload.set(hCode, off)
      off += 32
      view.setUint16(off, StatusWord.OK)

      const resp = new PluginQueryResponse(payload, 2)
      const info = resp.getPluginInfo()
      assert.ok(info)
      assert.strictEqual(info.slotId, 2)
      assert.deepStrictEqual(info.aid, mockAid)
      assert.strictEqual(info.uid, 1000)
      assert.strictEqual(info.gid, 1001)
      assert.strictEqual(info.posixMode, 0x01ed)
      assert.strictEqual(info.quotaBlocks, 10)
      assert.deepStrictEqual(info.hCode, hCode)
    })

    it('parses PluginQueryResponse for unallocated slot', () => {
      const payload = new Uint8Array([0x00, 0x90, 0x00])
      const resp = new PluginQueryResponse(payload, 0)
      assert.strictEqual(resp.getPluginInfo(), null)
    })

    it('parses PackageCommitResponse with computed H_code', () => {
      const expectedHCode = sha256(new Uint8Array([1, 2, 3, 4]))
      const payload = new Uint8Array(34)
      payload.set(expectedHCode, 0)
      payload[32] = 0x90
      payload[33] = 0x00

      const resp = new PackageCommitResponse(payload)
      assert.deepStrictEqual(resp.getCodeHash(), expectedHCode)
    })

    it('rejects missing, truncated and oversized package hash receipts', () => {
      for (const size of [0, 1, 31, 33]) {
        const response = new Uint8Array(size + 2)
        response.set([0x90, 0], size)
        assert.throws(() => new PackageCommitResponse(response), /exactly 32/)
      }
    })
  })

  describe('High-Level PluginManager and InBandBytecodeLoader Clients', () => {
    class MockTunneledReader implements CardReader {
      public responses: Map<number, (inner: CommandApdu) => ResponseAPDU> = new Map()

      async connect(): Promise<boolean> {
        return true
      }

      async disconnect(): Promise<void> {}
      connected(): boolean {
        return true
      }

      async transmit(apdu: Uint8Array): Promise<Uint8Array> {
        return apdu
      }

      async send(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array): Promise<Uint8Array> {
        if (cla === 0 && ins === 0 && p1 === 0 && p2 === 0 && lc === 0 && data.length === 0) {
          return new Uint8Array([0x90, 0x00])
        }
        return new Uint8Array([0x90, 0x00])
      }

      async sendCommand(apdu: CommandApdu): Promise<ResponseAPDU> {
        // Outer tunnel command is INS 0x30
        const innerRaw = apdu.getData()
        const innerCmd = CommandApdu.fromArray(innerRaw)
        const handler = this.responses.get(innerCmd.getHeader()[1])
        if (!handler) {
          throw new Error(`Unhandled inner INS: 0x${innerCmd.getHeader()[1].toString(16)}`)
        }
        const innerResp = handler(innerCmd)
        // Wrap inner response in outer SW_NO_ERROR response
        const outerData = new Uint8Array(innerResp.toArray().length + 2)
        outerData.set(innerResp.toArray(), 0)
        outerData[outerData.length - 2] = 0x90
        outerData[outerData.length - 1] = 0x00
        return new ResponseAPDU(outerData)
      }
    }

    it('PluginManager registers, queries, updates, sets NDEF provider, and deletes plugins', async () => {
      const reader = new MockTunneledReader()
      const manager = new PluginManager(reader)

      // 1. Register handler (INS 0x40) -> returns slot 2
      reader.responses.set(0x40, () => new ResponseAPDU(new Uint8Array([2, 0x90, 0x00])))

      // 2. Query handler (INS 0x41)
      reader.responses.set(0x41, cmd => {
        const slot = cmd.getHeader()[2]
        if (slot === 2) {
          const payload = new Uint8Array(1 + 1 + mockAid.length + 2 + 2 + 2 + 2 + 32 + 2)
          payload[0] = 1
          payload[1] = mockAid.length
          payload.set(mockAid, 2)
          const view = new DataView(payload.buffer)
          view.setUint16(2 + mockAid.length, 1000)
          view.setUint16(2 + mockAid.length + 2, 1001)
          view.setUint16(2 + mockAid.length + 4, 0x01ed)
          view.setUint16(2 + mockAid.length + 6, 10)
          view.setUint16(payload.length - 2, 0x9000)
          return new ResponseAPDU(payload)
        }
        return new ResponseAPDU(new Uint8Array([0x00, 0x90, 0x00]))
      })

      // 3. Update handler (INS 0x42)
      reader.responses.set(0x42, () => new ResponseAPDU(new Uint8Array([0x90, 0x00])))

      // 4. Set NDEF provider handler (INS 0x44)
      reader.responses.set(0x44, () => new ResponseAPDU(new Uint8Array([0x90, 0x00])))

      // 5. Delete handler (INS 0x43)
      reader.responses.set(0x43, () => new ResponseAPDU(new Uint8Array([0x90, 0x00])))

      const allocatedSlot = await manager.register(mockAid, 1000, 1001, 0x01ed, 10)
      assert.strictEqual(allocatedSlot, 2)

      const info = await manager.query(2)
      assert.ok(info)
      assert.strictEqual(info.slotId, 2)
      assert.strictEqual(info.uid, 1000)

      await manager.update(2, 0x01ff, 20)
      await manager.setActiveNdefProvider(2)
      await manager.delete(2)
    })

    it('rejects invalid chunk sizes before transmitting', () => {
      const reader = new MockTunneledReader()
      for (const size of [0, -1, 1.5, 221, NaN]) {
        assert.throws(() => new InBandBytecodeLoader(reader, size), /Chunk size/)
      }
    })

    it('rejects an absent session slot instead of streaming to slot zero', async () => {
      const reader = new MockTunneledReader()
      reader.responses.set(0x55, () => new ResponseAPDU(new Uint8Array([0x90, 0])))
      const loader = new InBandBytecodeLoader(reader)
      await assert.rejects(loader.streamCap(new Uint8Array([1]), new Uint8Array(5)), /session-slot/)
    })

    it('InBandBytecodeLoader streams and commits CAP binary chunks', async () => {
      const reader = new MockTunneledReader()
      const loader = new InBandBytecodeLoader(reader, 100)

      const dummyCap = new Uint8Array(250)
      dummyCap.fill(0xaa)
      const expectedHash = sha256(dummyCap)
      const pkgAid = new Uint8Array([0xff, 0x69, 0x74, 0x65, 0x6d, 0x73, 0x79, 0x73, 0x03, 0x00])

      let streamChunksReceived = 0

      // 1. Begin handler (INS 0x55) -> returns session slot 0
      reader.responses.set(0x55, () => new ResponseAPDU(new Uint8Array([0, 0x90, 0x00])))

      // 2. Stream handler (INS 0x56)
      reader.responses.set(0x56, () => {
        streamChunksReceived++
        const receivedLen = dummyCap.length
        return new ResponseAPDU(new Uint8Array([(receivedLen >> 8) & 0xff, receivedLen & 0xff, 0x90, 0x00]))
      })

      // 3. Commit handler (INS 0x57) -> returns card H_code
      reader.responses.set(0x57, () => {
        const payload = new Uint8Array(34)
        payload.set(expectedHash, 0)
        payload[32] = 0x90
        payload[33] = 0x00
        return new ResponseAPDU(payload)
      })

      let progressReports = 0
      const onProgress = (streamed: number, total: number) => {
        if (streamed > 0 && total > 0) {
          progressReports++
        }
      }

      const hCode = await loader.streamCap(dummyCap, pkgAid, onProgress)
      assert.deepStrictEqual(hCode, expectedHash)
      assert.strictEqual(streamChunksReceived, 3) // 100 + 100 + 50
      assert.strictEqual(progressReports, 3)
    })
  })
})
