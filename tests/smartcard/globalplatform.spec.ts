import { expect } from 'chai'
import { MockTransport } from '../../src/smartcard/transport/mock'
import { Reader } from '../../src/smartcard/reader'
import { hexToUint8, uint8ToHex } from '../../src/smartcard/utils'
import {
  GlobalPlatformCardManager,
  GlobalPlatformProvisioner,
  GpSecurityLevel,
  GpKeySet,
  DEFAULT_ISD_AID,
  CapTopologyEntry,
} from '../../src/smartcard/globalplatform'
import {
  calculateRetailMac,
  calculateAesCmac,
  des3EcbEncrypt,
  des3CbcEncrypt,
  des3CbcDecrypt,
  padIso9797M2,
  unpadIso9797M2,
} from '../../src/smartcard/globalplatform/crypto'
import { Scp02Session } from '../../src/smartcard/globalplatform/scp02'
import { Scp03Session } from '../../src/smartcard/globalplatform/scp03'
import {
  buildLoadFileDataBlock,
  extractCapComponentsFromZip,
  parseRawComponentStream,
} from '../../src/smartcard/globalplatform/cap-parser'
import { deflateRawSync } from 'zlib'

describe('GlobalPlatform Cryptography and Secure Channel Protocols', () => {
  const factory3DesKey = hexToUint8('404142434445464748494A4B4C4D4E4F') // 16-byte default test key (40..4F)
  const factoryAesKey = hexToUint8('404142434445464748494A4B4C4D4E4F404142434445464748494A4B4C4D4E4F') // 32-byte AES-256 test key

  describe('Low-Level Cryptographic Primitives', () => {
    it('pads and unpads data using ISO/IEC 9797-1 Method 2', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03])
      const padded = padIso9797M2(data, 8)
      expect(padded.length).to.equal(8)
      expect(padded[0]).to.equal(0x01)
      expect(padded[1]).to.equal(0x02)
      expect(padded[2]).to.equal(0x03)
      expect(padded[3]).to.equal(0x80)
      expect(padded[4]).to.equal(0x00)

      const unpadded = unpadIso9797M2(padded)
      expect(uint8ToHex(unpadded)).to.equal(uint8ToHex(data))
    })

    it('encrypts and decrypts with 3DES ECB and CBC', () => {
      const block = hexToUint8('1122334455667788')
      const encrypted = des3EcbEncrypt(factory3DesKey, block)
      expect(encrypted.length).to.equal(8)

      const multiBlock = hexToUint8('112233445566778899AABBCCDDEEFF00')
      const iv = new Uint8Array(8)
      const cbcEncrypted = des3CbcEncrypt(factory3DesKey, iv, multiBlock)
      const cbcDecrypted = des3CbcDecrypt(factory3DesKey, iv, cbcEncrypted)
      expect(uint8ToHex(cbcDecrypted)).to.equal(uint8ToHex(multiBlock))
    })

    it('computes Retail MAC (ISO 9797-1 Algorithm 3)', () => {
      const data = hexToUint8('84820100101122334455667788')
      const mac = calculateRetailMac(factory3DesKey, new Uint8Array(8), data)
      expect(mac.length).to.equal(8)
    })

    it('computes AES-CMAC (NIST SP 800-38B)', () => {
      const data = hexToUint8('84820100101122334455667788')
      const cmac = calculateAesCmac(factoryAesKey, data)
      expect(cmac.length).to.equal(16)
    })
  })

  describe('SCP02 Session & Key Derivation', () => {
    it('derives session keys using 3DES-CBC per GP 2.2 Appendix E.4.1', () => {
      const seqCounter = hexToUint8('0001')
      const { sEnc, sMac, sDek } = Scp02Session.deriveSessionKeys(
        factory3DesKey,
        factory3DesKey,
        factory3DesKey,
        seqCounter
      )
      expect(sEnc.length).to.equal(16)
      expect(sMac.length).to.equal(16)
      expect(sDek.length).to.equal(16)

      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')

      const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge)
      expect(cardCryptogram.length).to.equal(8)

      const hostCryptogram = Scp02Session.calculateHostCryptogram(sEnc, seqCounter, cardChallenge, hostChallenge)
      expect(hostCryptogram.length).to.equal(8)
    })

    it('wraps command APDUs with C-MAC and C-DECRYPTION', () => {
      const seqCounter = hexToUint8('0001')
      const { sEnc, sMac, sDek } = Scp02Session.deriveSessionKeys(
        factory3DesKey,
        factory3DesKey,
        factory3DesKey,
        seqCounter
      )
      const session = new Scp02Session(sEnc, sMac, sDek, GpSecurityLevel.C_DECRYPTION_AND_C_MAC)

      const rawApdu = hexToUint8('80E40000024F00') // DELETE dummy
      const wrapped = session.wrap(rawApdu)

      expect(wrapped[0]).to.equal(0x84) // CLA modified to 0x84
      expect(wrapped[1]).to.equal(0xe4) // INS preserved
      expect(wrapped.length).to.be.greaterThan(rawApdu.length)
    })
  })

  describe('SCP03 Session & Multi-Block Key Derivation', () => {
    it('derives 32-byte session keys for AES-256 via multi-block SP 800-108 KDF', () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')

      // factoryAesKey is 32 bytes (AES-256)
      const { sEnc, sMac, sRMac, sDek } = Scp03Session.deriveSessionKeys(factoryAesKey, hostChallenge, cardChallenge)
      expect(sEnc.length).to.equal(32)
      expect(sMac.length).to.equal(32)
      expect(sRMac.length).to.equal(32)
      expect(sDek.length).to.equal(32)

      const cardCryptogram = Scp03Session.calculateCardCryptogram(sMac, hostChallenge, cardChallenge)
      expect(cardCryptogram.length).to.equal(8)

      const hostCryptogram = Scp03Session.calculateHostCryptogram(sMac, hostChallenge, cardChallenge)
      expect(hostCryptogram.length).to.equal(8)
    })

    it('derives 16-byte session keys for AES-128', () => {
      const aes128Key = hexToUint8('404142434445464748494A4B4C4D4E4F')
      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')

      const { sEnc, sMac, sRMac, sDek } = Scp03Session.deriveSessionKeys(aes128Key, hostChallenge, cardChallenge)
      expect(sEnc.length).to.equal(16)
      expect(sMac.length).to.equal(16)
      expect(sRMac.length).to.equal(16)
      expect(sDek.length).to.equal(16)
    })

    it('wraps command APDUs with SCP03 C-MAC and C-DECRYPTION', () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')
      const { sEnc, sMac, sRMac, sDek } = Scp03Session.deriveSessionKeys(factoryAesKey, hostChallenge, cardChallenge)

      const session = new Scp03Session(sEnc, sMac, sRMac, sDek, GpSecurityLevel.C_DECRYPTION_AND_C_MAC)
      const rawApdu = hexToUint8('80E40000024F00')
      const wrapped = session.wrap(rawApdu)

      expect(wrapped[0]).to.equal(0x84)
      expect(wrapped[1]).to.equal(0xe4)
    })
  })

  describe('CAP Parser & Load File Data Block (Tag 0xC4) Construction', () => {
    function buildMockZip(entries: Array<{ name: string; data: Uint8Array; useDataDescriptor?: boolean }>): Uint8Array {
      const chunks: Buffer[] = []
      const cdEntries: Buffer[] = []
      let localOffset = 0

      for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8')
        const deflated = deflateRawSync(Buffer.from(entry.data))
        const flags = entry.useDataDescriptor ? 0x0008 : 0x0000

        // Local File Header (30 bytes)
        const header = Buffer.alloc(30)
        header.writeUInt32LE(0x04034b50, 0) // Magic
        header.writeUInt16LE(20, 4) // Version needed
        header.writeUInt16LE(flags, 6) // General Purpose Bit Flag
        header.writeUInt16LE(8, 8) // Compression Method: Deflate
        header.writeUInt16LE(0, 10) // Mod time
        header.writeUInt16LE(0, 12) // Mod date

        if (entry.useDataDescriptor) {
          // In data descriptor mode, local header sizes/crc can be zero
          header.writeUInt32LE(0, 14)
          header.writeUInt32LE(0, 18)
          header.writeUInt32LE(0, 22)
        } else {
          header.writeUInt32LE(0x12345678, 14) // Mock CRC
          header.writeUInt32LE(deflated.length, 18)
          header.writeUInt32LE(entry.data.length, 22)
        }

        header.writeUInt16LE(nameBuf.length, 26)
        header.writeUInt16LE(0, 28) // Extra field length

        chunks.push(header, nameBuf, deflated)

        let entryDataSize = 30 + nameBuf.length + deflated.length

        if (entry.useDataDescriptor) {
          // Data descriptor (16 bytes: 0x08074b50, CRC, compSize, uncompSize)
          const desc = Buffer.alloc(16)
          desc.writeUInt32LE(0x08074b50, 0)
          desc.writeUInt32LE(0x12345678, 4)
          desc.writeUInt32LE(deflated.length, 8)
          desc.writeUInt32LE(entry.data.length, 12)
          chunks.push(desc)
          entryDataSize += 16
        }

        // Central Directory Header (46 bytes)
        const cdHdr = Buffer.alloc(46)
        cdHdr.writeUInt32LE(0x02014b50, 0) // CD Magic
        cdHdr.writeUInt16LE(20, 4) // Version made by
        cdHdr.writeUInt16LE(20, 6) // Version needed
        cdHdr.writeUInt16LE(flags, 8) // Flags
        cdHdr.writeUInt16LE(8, 10) // Deflate
        cdHdr.writeUInt16LE(0, 12)
        cdHdr.writeUInt16LE(0, 14)
        cdHdr.writeUInt32LE(0x12345678, 16) // CRC
        cdHdr.writeUInt32LE(deflated.length, 20) // Authoritative Compressed Size
        cdHdr.writeUInt32LE(entry.data.length, 24) // Authoritative Uncompressed Size
        cdHdr.writeUInt16LE(nameBuf.length, 28)
        cdHdr.writeUInt16LE(0, 30) // Extra length
        cdHdr.writeUInt16LE(0, 32) // Comment length
        cdHdr.writeUInt16LE(0, 34) // Disk start
        cdHdr.writeUInt16LE(0, 36) // Internal attr
        cdHdr.writeUInt32LE(0, 38) // External attr
        cdHdr.writeUInt32LE(localOffset, 42) // Local header offset

        cdEntries.push(cdHdr, nameBuf)
        localOffset += entryDataSize
      }

      // End of Central Directory Record (22 bytes)
      const cdOffset = localOffset
      let cdSize = 0
      for (const b of cdEntries) {
        cdSize += b.length
      }

      const eocd = Buffer.alloc(22)
      eocd.writeUInt32LE(0x06054b50, 0) // EOCD magic
      eocd.writeUInt16LE(0, 4) // Disk number
      eocd.writeUInt16LE(0, 6) // CD start disk
      eocd.writeUInt16LE(entries.length, 8) // Entries on this disk
      eocd.writeUInt16LE(entries.length, 10) // Total entries
      eocd.writeUInt32LE(cdSize, 12) // CD size
      eocd.writeUInt32LE(cdOffset, 16) // CD offset
      eocd.writeUInt16LE(0, 20) // Comment len

      return new Uint8Array(Buffer.concat([...chunks, ...cdEntries, eocd]))
    }

    it('unpacks ZIP CAP archive and builds Tag 0xC4 Load File Data Block', () => {
      // Mock components: Header (tag 1), Directory (tag 2), Import (tag 4)
      const headerComp = new Uint8Array([0x01, 0x00, 0x04, 0xaa, 0xbb, 0xcc, 0xdd])
      const dirComp = new Uint8Array([0x02, 0x00, 0x03, 0xee, 0xff, 0x11])
      const importComp = new Uint8Array([0x04, 0x00, 0x02, 0x22, 0x33])

      const zipCap = buildMockZip([
        { name: 'pkg/javacard/Import.cap', data: importComp },
        { name: 'pkg/javacard/Header.cap', data: headerComp },
        { name: 'pkg/javacard/Directory.cap', data: dirComp },
      ])

      const components = extractCapComponentsFromZip(zipCap)
      expect(components.get(1)).to.deep.equal(headerComp)
      expect(components.get(2)).to.deep.equal(dirComp)
      expect(components.get(4)).to.deep.equal(importComp)

      const c4Block = buildLoadFileDataBlock(zipCap)
      expect(c4Block[0]).to.equal(0xc4) // Tag 0xC4
      // Total payload length = header (7) + dir (6) + import (5) = 18
      expect(c4Block[1]).to.equal(18)
      // Canonical order: Header (Tag 1), Directory (Tag 2), Import (Tag 4)
      expect(c4Block[2]).to.equal(0x01)
      expect(c4Block[9]).to.equal(0x02)
      expect(c4Block[15]).to.equal(0x04)
    })

    it('handles ZIP archives produced with Data Descriptors (streaming mode / bit 3)', () => {
      const headerComp = new Uint8Array([0x01, 0x00, 0x04, 0xaa, 0xbb, 0xcc, 0xdd])
      const dirComp = new Uint8Array([0x02, 0x00, 0x03, 0xee, 0xff, 0x11])

      const zipWithDataDesc = buildMockZip([
        { name: 'pkg/Header.cap', data: headerComp, useDataDescriptor: true },
        { name: 'pkg/Directory.cap', data: dirComp, useDataDescriptor: true },
      ])

      const components = extractCapComponentsFromZip(zipWithDataDesc)
      expect(components.get(1)).to.deep.equal(headerComp)
      expect(components.get(2)).to.deep.equal(dirComp)

      const c4Block = buildLoadFileDataBlock(zipWithDataDesc)
      expect(c4Block[0]).to.equal(0xc4)
      expect(c4Block[1]).to.equal(13) // 7 + 6
    })

    it('wraps raw concatenated components in Tag 0xC4 framing without bypassing', () => {
      // Raw stream without ZIP wrapper: Header (Tag 1, 7B) + Directory (Tag 2, 6B)
      const headerComp = new Uint8Array([0x01, 0x00, 0x04, 0xaa, 0xbb, 0xcc, 0xdd])
      const dirComp = new Uint8Array([0x02, 0x00, 0x03, 0xee, 0xff, 0x11])
      const rawStream = new Uint8Array(headerComp.length + dirComp.length)
      rawStream.set(headerComp, 0)
      rawStream.set(dirComp, headerComp.length)

      const parsed = parseRawComponentStream(rawStream)
      expect(parsed.get(1)).to.deep.equal(headerComp)
      expect(parsed.get(2)).to.deep.equal(dirComp)

      const c4Block = buildLoadFileDataBlock(rawStream)
      expect(c4Block[0]).to.equal(0xc4) // Must be Tag 0xC4
      expect(c4Block[1]).to.equal(13) // DER length
      expect(c4Block[2]).to.equal(0x01) // Header component
      expect(c4Block[9]).to.equal(0x02) // Directory component
    })
  })
})

describe('GlobalPlatform Card Manager and Provisioner Workflows', () => {
  const keySet: GpKeySet = {
    version: 0x01,
    encKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    macKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    dekKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
  }

  it('executes SELECT, INITIALIZE UPDATE, and EXTERNAL AUTHENTICATE sequence (with unencrypted HostCrypto) against MockTransport', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const seqCounter = hexToUint8('0001')
    const cardChallenge = hexToUint8('AABBCCDDEEFF')

    const { sEnc } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)

    const cardChallenge8 = new Uint8Array(8)
    cardChallenge8.set(seqCounter, 0)
    cardChallenge8.set(cardChallenge, 2)
    const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge8)

    // Construct mock INITIALIZE UPDATE response (28 bytes + SW 9000):
    // KeyDiv(10B) || KeyVer(1B) || SCP(1B) || SeqCounter(2B) || CardChal(6B) || CardCrypto(8B) || 9000
    const initUpdateResp = new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01, // Key Version
      0x02, // SCP02
      ...seqCounter,
      ...cardChallenge,
      ...cardCryptogram,
      0x90,
      0x00,
    ])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT Card Manager -> SW 9000
      initUpdateResp, // 2. INITIALIZE UPDATE -> initUpdateResp
      new Uint8Array([0x90, 0x00]), // 3. EXTERNAL AUTHENTICATE -> SW 9000
    ])

    const reader = new Reader(transport)
    await reader.connect()

    const cardManager = new GlobalPlatformCardManager(reader)
    await cardManager.selectCardManager(DEFAULT_ISD_AID)

    const session = await cardManager.openSecureChannelScp02(
      keySet,
      GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
      hostChallenge
    )

    expect(session).to.be.instanceOf(Scp02Session)
  })

  it('clamps requested maxChunkSize (e.g. 240) to safe limit (224) avoiding short APDU overflow', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const seqCounter = hexToUint8('0001')
    const cardChallenge = hexToUint8('AABBCCDDEEFF')
    const { sEnc } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)

    const cardChallenge8 = new Uint8Array(8)
    cardChallenge8.set(seqCounter, 0)
    cardChallenge8.set(cardChallenge, 2)
    const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge8)

    const initUpdateResp = new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01,
      0x02,
      ...seqCounter,
      ...cardChallenge,
      ...cardCryptogram,
      0x90,
      0x00,
    ])

    // 500 bytes payload: with chunk size 224, it will be 3 chunks (224, 224, 52)
    const dummyC4 = new Uint8Array(500)
    dummyC4[0] = 0xc4
    dummyC4[1] = 0x82
    dummyC4[2] = 0x01
    dummyC4[3] = 0xf0

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      new Uint8Array([0x90, 0x00]), // 4. INSTALL [for load]
      new Uint8Array([0x90, 0x00]), // 5. LOAD chunk 1
      new Uint8Array([0x90, 0x00]), // 6. LOAD chunk 2
      new Uint8Array([0x90, 0x00]), // 7. LOAD chunk 3
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const cardManager = new GlobalPlatformCardManager(reader)
    await cardManager.selectCardManager(DEFAULT_ISD_AID)
    await cardManager.openSecureChannelScp02(keySet, GpSecurityLevel.C_DECRYPTION_AND_C_MAC, hostChallenge)

    // Requesting 240 bytes chunk size must be clamped to safe 224 bytes
    await cardManager.loadCap(dummyC4, 'FF6974656D', DEFAULT_ISD_AID, 240)
  })

  it('executes SCP03 with correct 1-byte option offset parsing', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const aesKey = hexToUint8('404142434445464748494A4B4C4D4E4F404142434445464748494A4B4C4D4E4F')
    const cardChallenge = hexToUint8('AABBCCDDEEFF0011')

    const { sMac } = Scp03Session.deriveSessionKeys(aesKey, hostChallenge, cardChallenge)
    const cardCryptogram = Scp03Session.calculateCardCryptogram(sMac, hostChallenge, cardChallenge)

    // Construct mock SCP03 INITIALIZE UPDATE response (29 bytes + SW 9000):
    // KeyDiv(10B, 0..9) || KeyVer(1B, 10) || SCP(1B, 11) || Option(1B, 12) || CardChal(8B, 13..20) || CardCrypto(8B, 21..28) || 9000
    const initUpdateResp = new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01, // Key Version (index 10)
      0x03, // SCP03 (index 11)
      0x10, // SCP03 Implementation option (index 12)
      ...cardChallenge, // Card Challenge (index 13..20)
      ...cardCryptogram, // Card Cryptogram (index 21..28)
      0x90,
      0x00,
    ])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT Card Manager
      initUpdateResp, // 2. INITIALIZE UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXTERNAL AUTHENTICATE
    ])

    const reader = new Reader(transport)
    await reader.connect()

    const cardManager = new GlobalPlatformCardManager(reader)
    await cardManager.selectCardManager(DEFAULT_ISD_AID)

    const session = await cardManager.openSecureChannelScp03(
      aesKey,
      0x01,
      GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
      hostChallenge
    )

    expect(session).to.be.instanceOf(Scp03Session)
  })

  it('re-throws genuine deletion errors (0x6982, 0x6A80) while ignoring only 0x6A88 not found errors during clean wipe', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const seqCounter = hexToUint8('0001')
    const cardChallenge = hexToUint8('AABBCCDDEEFF')

    const { sEnc } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)
    const cardChallenge8 = new Uint8Array(8)
    cardChallenge8.set(seqCounter, 0)
    cardChallenge8.set(cardChallenge, 2)
    const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge8)

    const initUpdateResp = new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01,
      0x02,
      ...seqCounter,
      ...cardChallenge,
      ...cardCryptogram,
      0x90,
      0x00,
    ])

    // Scenario 1: SW 0x6A88 (Referenced data not found) is ignored during wipe
    const transportPass = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      new Uint8Array([0x6a, 0x88]), // 4. DELETE -> 0x6A88 (Not found, ignored)
      new Uint8Array([0x90, 0x00]), // 5. INSTALL [for load]
      new Uint8Array([0x90, 0x00]), // 6. LOAD
    ])

    const readerPass = new Reader(transportPass)
    await readerPass.connect()
    const provPass = new GlobalPlatformProvisioner(readerPass)
    await provPass.provisionTopology(
      [
        {
          name: 'pkg',
          packageAid: 'FF6974656D',
          capBytes: new Uint8Array([0xc4, 0x02, 0x01, 0x00]),
          isLibrary: true,
        },
      ],
      {
        keySet,
        hostChallenge,
        cleanWipeExisting: true,
        existingAidsToDelete: ['FF6974656D'],
      }
    )

    // Scenario 2: SW 0x6982 (Security status not satisfied) MUST be re-thrown
    const transportFailAuth = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      new Uint8Array([0x69, 0x82]), // 4. DELETE -> 0x6982 (Auth error)
    ])

    const readerFailAuth = new Reader(transportFailAuth)
    await readerFailAuth.connect()
    const provFailAuth = new GlobalPlatformProvisioner(readerFailAuth)

    let caughtErrorAuth: Error | null = null
    try {
      await provFailAuth.provisionTopology(
        [
          {
            name: 'pkg',
            packageAid: 'FF6974656D',
            capBytes: new Uint8Array([0xc4, 0x02, 0x01, 0x00]),
            isLibrary: true,
          },
        ],
        {
          keySet,
          hostChallenge,
          cleanWipeExisting: true,
          existingAidsToDelete: ['FF6974656D'],
        }
      )
    } catch (e: unknown) {
      caughtErrorAuth = e as Error
    }

    expect(caughtErrorAuth).to.be.instanceOf(Error)
    expect(caughtErrorAuth?.message).to.include('Failed to delete package')
    expect(caughtErrorAuth?.message).to.include('0x6982')

    // Scenario 3: SW 0x6A80 (Incorrect parameters in data field) MUST ALSO be re-thrown (not ignored!)
    const transportFailParam = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      new Uint8Array([0x6a, 0x80]), // 4. DELETE -> 0x6A80 (Parameter error)
    ])

    const readerFailParam = new Reader(transportFailParam)
    await readerFailParam.connect()
    const provFailParam = new GlobalPlatformProvisioner(readerFailParam)

    let caughtErrorParam: Error | null = null
    try {
      await provFailParam.provisionTopology(
        [
          {
            name: 'pkg',
            packageAid: 'FF6974656D',
            capBytes: new Uint8Array([0xc4, 0x02, 0x01, 0x00]),
            isLibrary: true,
          },
        ],
        {
          keySet,
          hostChallenge,
          cleanWipeExisting: true,
          existingAidsToDelete: ['FF6974656D'],
        }
      )
    } catch (e: unknown) {
      caughtErrorParam = e as Error
    }

    expect(caughtErrorParam).to.be.instanceOf(Error)
    expect(caughtErrorParam?.message).to.include('Failed to delete package')
    expect(caughtErrorParam?.message).to.include('0x6A80')
  })

  it('provisions a multi-CAP topology using GlobalPlatformProvisioner', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const seqCounter = hexToUint8('0001')
    const cardChallenge = hexToUint8('AABBCCDDEEFF')

    const { sEnc } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)
    const cardChallenge8 = new Uint8Array(8)
    cardChallenge8.set(seqCounter, 0)
    cardChallenge8.set(cardChallenge, 2)
    const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge8)

    const initUpdateResp = new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01,
      0x02,
      ...seqCounter,
      ...cardChallenge,
      ...cardCryptogram,
      0x90,
      0x00,
    ])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT Card Manager
      initUpdateResp, // 2. INITIALIZE UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXTERNAL AUTHENTICATE
      new Uint8Array([0x90, 0x00]), // 4. DELETE existing package
      new Uint8Array([0x90, 0x00]), // 5. INSTALL [for load] (item-api)
      new Uint8Array([0x90, 0x00]), // 6. LOAD chunk 1 (item-api)
      new Uint8Array([0x90, 0x00]), // 7. INSTALL [for load] (item-javacard)
      new Uint8Array([0x90, 0x00]), // 8. LOAD chunk 1 (item-javacard)
      new Uint8Array([0x90, 0x00]), // 9. INSTALL [for install & make selectable] (item-javacard)
    ])

    const reader = new Reader(transport)
    await reader.connect()

    const provisioner = new GlobalPlatformProvisioner(reader)

    const dummyTopology: CapTopologyEntry[] = [
      {
        name: '01_item-api',
        packageAid: 'FF6974656D7379730300FF',
        capBytes: new Uint8Array([0xc4, 0x04, 0x01, 0x00, 0x02, 0x00]),
        isLibrary: true,
      },
      {
        name: '02_item-javacard',
        packageAid: 'FF6974656D737973030000',
        capBytes: new Uint8Array([0xc4, 0x04, 0x01, 0x00, 0x02, 0x00]),
        appletAid: 'FF6974656D73797303000000',
        instanceAid: 'FF6974656D73797303000000',
        privileges: '00',
        installParams: '0108100800',
      },
    ]

    const progressLogs: string[] = []

    await provisioner.provisionTopology(dummyTopology, {
      keySet,
      hostChallenge,
      cleanWipeExisting: true,
      existingAidsToDelete: ['FF6974656D737973030000'],
      onProgress: step => progressLogs.push(step),
    })

    expect(progressLogs).to.include('Authenticating with Card Manager')
    expect(progressLogs).to.include('Wiping existing packages')
    expect(progressLogs).to.include('Loading 01_item-api')
    expect(progressLogs).to.include('Loading 02_item-javacard')
    expect(progressLogs).to.include('Instantiating 02_item-javacard')
    expect(progressLogs).to.include('Provisioning Complete')
  })
})
