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
  validateCap,
  preflightTopology,
  extractCapComponentsFromZip,
  parseRawComponentStream,
  ProvisioningProgressEvent,
} from '../../src/smartcard/globalplatform'
import {
  calculateRetailMac,
  calculateAesCmac,
  des3EcbEncrypt,
  des3CbcEncrypt,
  des3CbcDecrypt,
  padIso9797M2,
  unpadIso9797M2,
  getRandomBytes,
} from '../../src/smartcard/globalplatform/crypto'
import { Scp02Session } from '../../src/smartcard/globalplatform/scp02'
import { Scp03Session } from '../../src/smartcard/globalplatform/scp03'
import { buildLoadFileDataBlock } from '../../src/smartcard/globalplatform/cap-parser'
import { deflateRawSync } from 'zlib'

// Helper to build a valid minimal CAP component set for testing
function buildValidMockCap(pkgAidHex: string, importedAids: string[] = [], appletAids: string[] = []): Uint8Array {
  const aidBytes = hexToUint8(pkgAidHex)
  // 1. Header.cap (Tag 1): tag(1B) size(2B) magic(4B: 0xDECAFFED) cap_ver(2B) flags(1B) pkg_ver(2B) pkg_aid_len(1B) pkg_aid
  const headerPayload = new Uint8Array([
    0xde,
    0xca,
    0xff,
    0xed, // Magic
    0x01,
    0x02, // Cap version 2.1
    0x04, // Flags
    0x01,
    0x00, // Package version 1.0
    aidBytes.length,
    ...aidBytes,
  ])
  const headerComp = new Uint8Array([
    0x01,
    (headerPayload.length >> 8) & 0xff,
    headerPayload.length & 0xff,
    ...headerPayload,
  ])

  // 4. Import.cap (Tag 4): tag(1B) size(2B) count(1B) [pkg_ver(2B) aid_len(1B) aid]*
  let importPayloadLen = 1
  for (const impAid of importedAids) {
    importPayloadLen += 2 + 1 + hexToUint8(impAid).length
  }
  const importPayload = new Uint8Array(importPayloadLen)
  importPayload[0] = importedAids.length
  let impOff = 1
  for (const impAid of importedAids) {
    const impBytes = hexToUint8(impAid)
    importPayload[impOff++] = 0x01 // Minor
    importPayload[impOff++] = 0x01 // Major
    importPayload[impOff++] = impBytes.length
    importPayload.set(impBytes, impOff)
    impOff += impBytes.length
  }
  const importComp = new Uint8Array([
    0x04,
    (importPayload.length >> 8) & 0xff,
    importPayload.length & 0xff,
    ...importPayload,
  ])

  // 3. Applet.cap (Tag 3): tag(1B) size(2B) count(1B) [aid_len(1B) aid install_method_offset(2B)]*
  let appletComp = new Uint8Array(0)
  let appletPayloadLen = 0
  if (appletAids.length > 0) {
    appletPayloadLen = 1
    for (const aAid of appletAids) {
      appletPayloadLen += 1 + hexToUint8(aAid).length + 2
    }
    const appletPayload = new Uint8Array(appletPayloadLen)
    appletPayload[0] = appletAids.length
    let aOff = 1
    for (const aAid of appletAids) {
      const aBytes = hexToUint8(aAid)
      appletPayload[aOff++] = aBytes.length
      appletPayload.set(aBytes, aOff)
      aOff += aBytes.length
      appletPayload[aOff++] = 0x00 // install_method_offset MSB
      appletPayload[aOff++] = 0x00 // install_method_offset LSB
    }
    appletComp = new Uint8Array([0x03, (appletPayloadLen >> 8) & 0xff, appletPayloadLen & 0xff, ...appletPayload])
  }

  // Other required dummy components:
  // 5. ConstantPool, 6. Class, 7. Method, 8. StaticField, 9. RefLocation
  const cpComp = new Uint8Array([0x05, 0x00, 0x02, 0x00, 0x00])
  const classComp = new Uint8Array([0x06, 0x00, 0x02, 0x00, 0x00])
  const methodComp = new Uint8Array([0x07, 0x00, 0x02, 0x00, 0x00])
  const sfComp = new Uint8Array([0x08, 0x00, 0x02, 0x00, 0x00])
  const refComp = new Uint8Array([0x09, 0x00, 0x02, 0x00, 0x00])

  // 2. Directory.cap (Tag 2): 12 shorts declared sizes
  const dirPayload = new Uint8Array(24)
  // tag 1 (Header): headerPayload.length
  dirPayload[0] = (headerPayload.length >> 8) & 0xff
  dirPayload[1] = headerPayload.length & 0xff
  // tag 2 (Directory): 24
  dirPayload[2] = 0x00
  dirPayload[3] = 24
  // tag 3 (Applet): appletPayloadLen
  dirPayload[4] = (appletPayloadLen >> 8) & 0xff
  dirPayload[5] = appletPayloadLen & 0xff
  // tag 4 (Import): importPayload.length
  dirPayload[6] = (importPayload.length >> 8) & 0xff
  dirPayload[7] = importPayload.length & 0xff
  // tag 5 (ConstantPool): 2
  dirPayload[8] = 0x00
  dirPayload[9] = 2
  // tag 6 (Class): 2
  dirPayload[10] = 0x00
  dirPayload[11] = 2
  // tag 7 (Method): 2
  dirPayload[12] = 0x00
  dirPayload[13] = 2
  // tag 8 (StaticField): 2
  dirPayload[14] = 0x00
  dirPayload[15] = 2
  // tag 9 (RefLocation): 2
  dirPayload[16] = 0x00
  dirPayload[17] = 2

  const dirComp = new Uint8Array([0x02, 0x00, 24, ...dirPayload])

  const totalLen =
    headerComp.length +
    dirComp.length +
    importComp.length +
    appletComp.length +
    cpComp.length +
    classComp.length +
    methodComp.length +
    sfComp.length +
    refComp.length

  const rawStream = new Uint8Array(totalLen)
  let wOff = 0
  rawStream.set(headerComp, wOff)
  wOff += headerComp.length
  rawStream.set(dirComp, wOff)
  wOff += dirComp.length
  rawStream.set(importComp, wOff)
  wOff += importComp.length
  if (appletComp.length > 0) {
    rawStream.set(appletComp, wOff)
    wOff += appletComp.length
  }
  rawStream.set(cpComp, wOff)
  wOff += cpComp.length
  rawStream.set(classComp, wOff)
  wOff += classComp.length
  rawStream.set(methodComp, wOff)
  wOff += methodComp.length
  rawStream.set(sfComp, wOff)
  wOff += sfComp.length
  rawStream.set(refComp, wOff)
  wOff += refComp.length

  return rawStream
}

// Helper to build a mock CAP packed as a real ZIP archive
function buildMockZipCap(pkgAidHex: string, importedAids: string[] = [], appletAids: string[] = []): Uint8Array {
  const rawComponents = buildValidMockCap(pkgAidHex, importedAids, appletAids)
  const components = parseRawComponentStream(rawComponents)

  const tagNames: Record<number, string> = {
    1: 'Header.cap',
    2: 'Directory.cap',
    3: 'Applet.cap',
    4: 'Import.cap',
    5: 'ConstantPool.cap',
    6: 'Class.cap',
    7: 'Method.cap',
    8: 'StaticField.cap',
    9: 'RefLocation.cap',
  }

  const zipEntries: Array<{ name: string; uncompressed: Uint8Array; compressed: Uint8Array }> = []

  for (const [tag, bytes] of components.entries()) {
    const name = `test/pkg/javacard/${tagNames[tag] || `Component${tag}.cap`}`
    const compressed = new Uint8Array(deflateRawSync(Buffer.from(bytes)))
    zipEntries.push({ name, uncompressed: bytes, compressed })
  }

  // Calculate local headers + central directory
  let localHeadersLen = 0
  for (const entry of zipEntries) {
    const nameBytes = new TextEncoder().encode(entry.name)
    localHeadersLen += 30 + nameBytes.length + entry.compressed.length
  }

  let cdLen = 0
  for (const entry of zipEntries) {
    const nameBytes = new TextEncoder().encode(entry.name)
    cdLen += 46 + nameBytes.length
  }

  const eocdLen = 22
  const totalZipLen = localHeadersLen + cdLen + eocdLen
  const zipBytes = new Uint8Array(totalZipLen)
  const view = new DataView(zipBytes.buffer)

  let localOffset = 0
  let cdOffset = localHeadersLen
  const localHeaderOffsets: number[] = []

  for (const entry of zipEntries) {
    localHeaderOffsets.push(localOffset)
    const nameBytes = new TextEncoder().encode(entry.name)

    // Local file header: 0x04034B50
    view.setUint32(localOffset, 0x04034b50, true)
    view.setUint16(localOffset + 4, 20, true) // version needed
    view.setUint16(localOffset + 6, 0, true) // flags
    view.setUint16(localOffset + 8, 8, true) // compression = deflate
    view.setUint16(localOffset + 10, 0, true) // mod time
    view.setUint16(localOffset + 12, 0, true) // mod date
    view.setUint32(localOffset + 14, 0, true) // crc32
    view.setUint32(localOffset + 18, entry.compressed.length, true)
    view.setUint32(localOffset + 22, entry.uncompressed.length, true)
    view.setUint16(localOffset + 26, nameBytes.length, true)
    view.setUint16(localOffset + 28, 0, true) // extra len

    zipBytes.set(nameBytes, localOffset + 30)
    zipBytes.set(entry.compressed, localOffset + 30 + nameBytes.length)

    localOffset += 30 + nameBytes.length + entry.compressed.length
  }

  for (let i = 0; i < zipEntries.length; i++) {
    const entry = zipEntries[i]
    const nameBytes = new TextEncoder().encode(entry.name)
    const localHeaderOffset = localHeaderOffsets[i]

    // Central directory header: 0x02014B50
    view.setUint32(cdOffset, 0x02014b50, true)
    view.setUint16(cdOffset + 4, 20, true) // version made by
    view.setUint16(cdOffset + 6, 20, true) // version needed
    view.setUint16(cdOffset + 8, 0, true) // flags
    view.setUint16(cdOffset + 10, 8, true) // compression = deflate
    view.setUint16(cdOffset + 12, 0, true) // mod time
    view.setUint16(cdOffset + 14, 0, true) // mod date
    view.setUint32(cdOffset + 16, 0, true) // crc32
    view.setUint32(cdOffset + 20, entry.compressed.length, true)
    view.setUint32(cdOffset + 24, entry.uncompressed.length, true)
    view.setUint16(cdOffset + 28, nameBytes.length, true)
    view.setUint16(cdOffset + 30, 0, true) // extra len
    view.setUint16(cdOffset + 32, 0, true) // comment len
    view.setUint16(cdOffset + 34, 0, true) // disk start
    view.setUint16(cdOffset + 36, 0, true) // int attrs
    view.setUint32(cdOffset + 38, 0, true) // ext attrs
    view.setUint32(cdOffset + 42, localHeaderOffset, true)

    zipBytes.set(nameBytes, cdOffset + 46)
    cdOffset += 46 + nameBytes.length
  }

  // End of Central Directory: 0x06054B50
  view.setUint32(cdOffset, 0x06054b50, true)
  view.setUint16(cdOffset + 4, 0, true) // disk number
  view.setUint16(cdOffset + 6, 0, true) // cd disk start
  view.setUint16(cdOffset + 8, zipEntries.length, true) // cd records on disk
  view.setUint16(cdOffset + 10, zipEntries.length, true) // total cd records
  view.setUint32(cdOffset + 12, cdLen, true) // cd size
  view.setUint32(cdOffset + 16, localHeadersLen, true) // cd offset
  view.setUint16(cdOffset + 20, 0, true) // comment len

  return zipBytes
}

describe('GlobalPlatform Cryptography and Secure Channel Protocols (Pure TypeScript)', () => {
  const factory3DesKey = hexToUint8('404142434445464748494A4B4C4D4E4F')
  const factoryAesKey = hexToUint8('404142434445464748494A4B4C4D4E4F404142434445464748494A4B4C4D4E4F')

  describe('Low-Level Cryptographic Primitives (No Node Crypto / Pure TS)', () => {
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

    it('encrypts and decrypts with 3DES ECB and CBC in pure TypeScript', () => {
      const block = hexToUint8('1122334455667788')
      const encrypted = des3EcbEncrypt(factory3DesKey, block)
      expect(encrypted.length).to.equal(8)

      const multiBlock = hexToUint8('112233445566778899AABBCCDDEEFF00')
      const iv = new Uint8Array(8)
      const cbcEncrypted = des3CbcEncrypt(factory3DesKey, iv, multiBlock)
      const cbcDecrypted = des3CbcDecrypt(factory3DesKey, iv, cbcEncrypted)
      expect(uint8ToHex(cbcDecrypted)).to.equal(uint8ToHex(multiBlock))
    })

    it('computes Retail MAC (ISO 9797-1 Algorithm 3) in pure TypeScript', () => {
      const data = hexToUint8('84820100101122334455667788')
      const mac = calculateRetailMac(factory3DesKey, new Uint8Array(8), data)
      expect(mac.length).to.equal(8)
    })

    it('computes AES-CMAC (NIST SP 800-38B) in pure TypeScript', () => {
      const data = hexToUint8('84820100101122334455667788')
      const cmac = calculateAesCmac(factoryAesKey, data)
      expect(cmac.length).to.equal(16)
    })

    it('generates random bytes cross-platform', () => {
      const r1 = getRandomBytes(16)
      const r2 = getRandomBytes(16)
      expect(r1.length).to.equal(16)
      expect(r2.length).to.equal(16)
      expect(uint8ToHex(r1)).to.not.equal(uint8ToHex(r2))
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

      const rawApdu = hexToUint8('80E40000024F00')
      const wrapped = session.wrap(rawApdu)

      expect(wrapped[0]).to.equal(0x84)
      expect(wrapped[1]).to.equal(0xe4)
      expect(wrapped.length).to.be.greaterThan(rawApdu.length)
    })
  })

  describe('SCP03 Session & Multi-Block Key Derivation', () => {
    it('derives 32-byte session keys for AES-256 via multi-block SP 800-108 KDF', () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')

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
  })

  describe('Pure TypeScript CAP Parser & Tag 0xC4 Construction', () => {
    function buildMockZip(entries: Array<{ name: string; data: Uint8Array; useDataDescriptor?: boolean }>): Uint8Array {
      const chunks: Buffer[] = []
      const cdEntries: Buffer[] = []
      let localOffset = 0

      for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8')
        const deflated = deflateRawSync(Buffer.from(entry.data))
        const flags = entry.useDataDescriptor ? 0x0008 : 0x0000

        const header = Buffer.alloc(30)
        header.writeUInt32LE(0x04034b50, 0)
        header.writeUInt16LE(20, 4)
        header.writeUInt16LE(flags, 6)
        header.writeUInt16LE(8, 8)
        header.writeUInt16LE(0, 10)
        header.writeUInt16LE(0, 12)

        if (entry.useDataDescriptor) {
          header.writeUInt32LE(0, 14)
          header.writeUInt32LE(0, 18)
          header.writeUInt32LE(0, 22)
        } else {
          header.writeUInt32LE(0x12345678, 14)
          header.writeUInt32LE(deflated.length, 18)
          header.writeUInt32LE(entry.data.length, 22)
        }

        header.writeUInt16LE(nameBuf.length, 26)
        header.writeUInt16LE(0, 28)

        chunks.push(header, nameBuf, deflated)
        let entryDataSize = 30 + nameBuf.length + deflated.length

        if (entry.useDataDescriptor) {
          const desc = Buffer.alloc(16)
          desc.writeUInt32LE(0x08074b50, 0)
          desc.writeUInt32LE(0x12345678, 4)
          desc.writeUInt32LE(deflated.length, 8)
          desc.writeUInt32LE(entry.data.length, 12)
          chunks.push(desc)
          entryDataSize += 16
        }

        const cdHdr = Buffer.alloc(46)
        cdHdr.writeUInt32LE(0x02014b50, 0)
        cdHdr.writeUInt16LE(20, 4)
        cdHdr.writeUInt16LE(20, 6)
        cdHdr.writeUInt16LE(flags, 8)
        cdHdr.writeUInt16LE(8, 10)
        cdHdr.writeUInt16LE(0, 12)
        cdHdr.writeUInt16LE(0, 14)
        cdHdr.writeUInt32LE(0x12345678, 16)
        cdHdr.writeUInt32LE(deflated.length, 20)
        cdHdr.writeUInt32LE(entry.data.length, 24)
        cdHdr.writeUInt16LE(nameBuf.length, 28)
        cdHdr.writeUInt16LE(0, 30)
        cdHdr.writeUInt16LE(0, 32)
        cdHdr.writeUInt16LE(0, 34)
        cdHdr.writeUInt16LE(0, 36)
        cdHdr.writeUInt32LE(0, 38)
        cdHdr.writeUInt32LE(localOffset, 42)

        cdEntries.push(cdHdr, nameBuf)
        localOffset += entryDataSize
      }

      const cdOffset = localOffset
      let cdSize = 0
      for (const b of cdEntries) {
        cdSize += b.length
      }

      const eocd = Buffer.alloc(22)
      eocd.writeUInt32LE(0x06054b50, 0)
      eocd.writeUInt16LE(0, 4)
      eocd.writeUInt16LE(0, 6)
      eocd.writeUInt16LE(entries.length, 8)
      eocd.writeUInt16LE(entries.length, 10)
      eocd.writeUInt32LE(cdSize, 12)
      eocd.writeUInt32LE(cdOffset, 16)
      eocd.writeUInt16LE(0, 20)

      return new Uint8Array(Buffer.concat([...chunks, ...cdEntries, eocd]))
    }

    it('unpacks ZIP CAP archive and builds Tag 0xC4 Load File Data Block', () => {
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
      expect(c4Block[0]).to.equal(0xc4)
      expect(c4Block[1]).to.equal(18)
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

      const zipCap = buildMockZipCap('FF6974656D01', ['A0000000620001'])
      const zipComponents = extractCapComponentsFromZip(zipCap)
      expect(zipComponents.has(1)).to.equal(true) // Header.cap
      expect(zipComponents.has(2)).to.equal(true) // Directory.cap
      expect(zipComponents.has(4)).to.equal(true) // Import.cap

      const components = extractCapComponentsFromZip(zipWithDataDesc)
      expect(components.get(1)).to.deep.equal(headerComp)
      expect(components.get(2)).to.deep.equal(dirComp)

      const c4Block = buildLoadFileDataBlock(zipWithDataDesc)
      expect(c4Block[0]).to.equal(0xc4)
      expect(c4Block[1]).to.equal(13)
    })

    it('wraps raw concatenated components in Tag 0xC4 framing without bypassing', () => {
      const headerComp = new Uint8Array([0x01, 0x00, 0x04, 0xaa, 0xbb, 0xcc, 0xdd])
      const dirComp = new Uint8Array([0x02, 0x00, 0x03, 0xee, 0xff, 0x11])
      const rawStream = new Uint8Array(headerComp.length + dirComp.length)
      rawStream.set(headerComp, 0)
      rawStream.set(dirComp, headerComp.length)

      const parsed = parseRawComponentStream(rawStream)
      expect(parsed.get(1)).to.deep.equal(headerComp)
      expect(parsed.get(2)).to.deep.equal(dirComp)

      const c4Block = buildLoadFileDataBlock(rawStream)
      expect(c4Block[0]).to.equal(0xc4)
      expect(c4Block[1]).to.equal(13)
      expect(c4Block[2]).to.equal(0x01)
      expect(c4Block[9]).to.equal(0x02)
    })
  })
})

describe('Strict CAP Validation & Topology Preflight Engine', () => {
  it('validates a correct CAP file and extracts metadata', () => {
    const validCap = buildValidMockCap('FF6974656D01', ['A0000000620101'])
    const res = validateCap(validCap, 'FF6974656D01')

    expect(res.valid).to.equal(true)
    expect(res.errors.length).to.equal(0)
    expect(res.metadata?.packageAid).to.equal('FF6974656D01')
    expect(res.metadata?.importedPackageAids).to.deep.equal(['A0000000620101'])
  })

  it('detects corrupted magic number or package AID mismatch', () => {
    const validCap = buildValidMockCap('FF6974656D01')
    const badAidRes = validateCap(validCap, 'FF6974656D02') // Mismatched declaration
    expect(badAidRes.valid).to.equal(false)
    expect(badAidRes.errors[0]).to.include('Package AID mismatch')

    // Corrupt magic
    const corruptedMagic = new Uint8Array(validCap)
    corruptedMagic[3] = 0x00
    const badMagicRes = validateCap(corruptedMagic)
    expect(badMagicRes.valid).to.equal(false)
    expect(badMagicRes.errors[0]).to.include('Invalid Header.cap magic')
  })

  it('resolves topological DAG loading order across multi-package dependencies', () => {
    // Topology:
    // Pkg C depends on Pkg B
    // Pkg B depends on Pkg A
    // Pkg A has no user dependencies (only java.lang)
    const capA = buildValidMockCap('FF6974656D01', ['A0000000620001'])
    const capB = buildValidMockCap('FF6974656D02', ['FF6974656D01'])
    const capC = buildValidMockCap('FF6974656D03', ['FF6974656D02'])

    // Pass in reverse order (C, B, A) to ensure preflight correctly re-orders
    const preflight = preflightTopology([
      { name: 'PkgC', packageAid: 'FF6974656D03', capBytes: capC, isLibrary: true },
      { name: 'PkgB', packageAid: 'FF6974656D02', capBytes: capB, isLibrary: true },
      { name: 'PkgA', packageAid: 'FF6974656D01', capBytes: capA, isLibrary: true },
    ])

    expect(preflight.valid).to.equal(true)
    expect(preflight.plannedExecutionOrder).to.deep.equal(['FF6974656D01', 'FF6974656D02', 'FF6974656D03'])
  })

  it('detects unfulfilled missing dependencies before execution', () => {
    const capA = buildValidMockCap('FF6974656D01', ['DEADBEEF000101']) // Imports non-existent package
    const preflight = preflightTopology([{ name: 'PkgA', packageAid: 'FF6974656D01', capBytes: capA, isLibrary: true }])

    expect(preflight.valid).to.equal(false)
    expect(preflight.errors[0]).to.include('requires missing dependency AIDs: DEADBEEF000101')
  })

  it('detects circular dependencies in package imports', () => {
    // Pkg A imports Pkg B, and Pkg B imports Pkg A (cycle)
    const capA = buildValidMockCap('FF6974656D01', ['FF6974656D02'])
    const capB = buildValidMockCap('FF6974656D02', ['FF6974656D01'])

    const preflight = preflightTopology([
      { name: 'PkgA', packageAid: 'FF6974656D01', capBytes: capA, isLibrary: true },
      { name: 'PkgB', packageAid: 'FF6974656D02', capBytes: capB, isLibrary: true },
    ])

    expect(preflight.valid).to.equal(false)
    expect(preflight.errors[0]).to.include('Circular dependency detected')
  })
})

describe('GlobalPlatform Card Manager, Inventory & Resilient Provisioning Workflows', () => {
  const keySet: GpKeySet = {
    version: 0x01,
    encKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    macKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    dekKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
  }

  function mockInitUpdateResponse(): Uint8Array {
    const hostChallenge = hexToUint8('1122334455667788')
    const seqCounter = hexToUint8('0001')
    const cardChallenge = hexToUint8('AABBCCDDEEFF')
    const { sEnc } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)
    const cardChallenge8 = new Uint8Array(8)
    cardChallenge8.set(seqCounter, 0)
    cardChallenge8.set(cardChallenge, 2)
    const cardCryptogram = Scp02Session.calculateCardCryptogram(sEnc, hostChallenge, cardChallenge8)

    return new Uint8Array([
      ...hexToUint8('01020304050607080910'),
      0x01,
      0x02,
      ...seqCounter,
      ...cardChallenge,
      ...cardCryptogram,
      0x90,
      0x00,
    ])
  }

  it('inspects card inventory via GET STATUS', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const initUpdateResp = mockInitUpdateResponse()

    // Mock GET STATUS responses:
    // 1. P1=0x20 (Exec Load Files): [AID len 5] [FF6974656D] [state 01] + SW 9000
    const getStatusElf = new Uint8Array([0x05, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x90, 0x00])
    // 2. P1=0x10 (Exec Modules): [AID len 5] [FF6974656D] [state 01] [Mod AID len 6] [FF6974656D01] + SW 9000
    const getStatusMod = new Uint8Array([
      0x05, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x90, 0x00,
    ])
    // 3. P1=0x40 (Applets): [AID len 6] [FF6974656D01] [state 07] [priv len 1] [00] + SW 9000
    const getStatusApp = new Uint8Array([0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x07, 0x01, 0x00, 0x90, 0x00])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      getStatusElf, // 4. GET STATUS (0x20)
      getStatusMod, // 5. GET STATUS (0x10)
      getStatusApp, // 6. GET STATUS (0x40)
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const cardManager = new GlobalPlatformCardManager(reader)
    await cardManager.selectCardManager(DEFAULT_ISD_AID)
    await cardManager.openSecureChannelScp02(keySet, GpSecurityLevel.C_DECRYPTION_AND_C_MAC, hostChallenge)

    const inventory = await cardManager.getCardInventory()
    expect(inventory.executableLoadFiles.length).to.equal(1)
    expect(inventory.executableLoadFiles[0].aid).to.equal('FF6974656D')
    expect(inventory.executableModules.length).to.equal(1)
    expect(inventory.appletsAndSecurityDomains.length).to.equal(1)
    expect(inventory.appletsAndSecurityDomains[0].aid).to.equal('FF6974656D01')
  })

  it('parses multiple multi-module Executable Load Files correctly in GET STATUS', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const initUpdateResp = mockInitUpdateResponse()

    // 1. P1=0x20: ELF 1 (FF6974656D01) and ELF 2 (FF6974656D02)
    const getStatusElf = new Uint8Array([
      0x06,
      0xff,
      0x69,
      0x74,
      0x65,
      0x6d,
      0x01,
      0x01, // ELF 1
      0x06,
      0xff,
      0x69,
      0x74,
      0x65,
      0x6d,
      0x02,
      0x01, // ELF 2
      0x90,
      0x00,
    ])
    // 2. P1=0x10: ELF 1 has 2 modules (Mod 1A: FF6974656D0101, Mod 1B: FF6974656D0102)
    //             ELF 2 has 1 module (Mod 2A: FF6974656D0201)
    const getStatusMod = new Uint8Array([
      // ELF 1: [len 6] [AID FF6974656D01] [state 01] [numModules 2] [m1Len 7] [FF6974656D0101] [m2Len 7] [FF6974656D0102]
      0x06,
      0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x02, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x07, 0xff, 0x69,
      0x74, 0x65, 0x6d, 0x01, 0x02,
      // ELF 2: [len 6] [AID FF6974656D02] [state 01] [numModules 1] [m1Len 7] [FF6974656D0201]
      0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01, 0x01, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01, 0x90, 0x00,
    ])
    // 3. P1=0x40: 2 Applet instances
    const getStatusApp = new Uint8Array([
      0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x07, 0x01, 0x00, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01,
      0x07, 0x01, 0x00, 0x90, 0x00,
    ])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      getStatusElf, // 4. GET STATUS (0x20)
      getStatusMod, // 5. GET STATUS (0x10)
      getStatusApp, // 6. GET STATUS (0x40)
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const cardManager = new GlobalPlatformCardManager(reader)
    await cardManager.selectCardManager(DEFAULT_ISD_AID)
    await cardManager.openSecureChannelScp02(keySet, GpSecurityLevel.C_DECRYPTION_AND_C_MAC, hostChallenge)

    const inventory = await cardManager.getCardInventory()
    expect(inventory.executableLoadFiles.length).to.equal(2)
    expect(inventory.executableLoadFiles[0].aid).to.equal('FF6974656D01')
    expect(inventory.executableLoadFiles[1].aid).to.equal('FF6974656D02')

    // Executable modules must contain entries for all 3 modules across the 2 ELFs without losing any records
    expect(inventory.executableModules.length).to.equal(3)
    expect(inventory.executableModules[0].executableLoadFileAid).to.equal('FF6974656D01')
    expect(inventory.executableModules[0].executableModuleAid).to.equal('FF6974656D0101')
    expect(inventory.executableModules[1].executableLoadFileAid).to.equal('FF6974656D01')
    expect(inventory.executableModules[1].executableModuleAid).to.equal('FF6974656D0102')
    expect(inventory.executableModules[2].executableLoadFileAid).to.equal('FF6974656D02')
    expect(inventory.executableModules[2].executableModuleAid).to.equal('FF6974656D0201')

    expect(inventory.appletsAndSecurityDomains.length).to.equal(2)
  })

  it('supports cancellation via AbortSignal in all loops', async () => {
    const controller = new AbortController()
    controller.abort() // Immediately abort

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // SELECT
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const cardManager = new GlobalPlatformCardManager(reader)

    let caughtError: Error | null = null
    try {
      await cardManager.selectCardManager(DEFAULT_ISD_AID, controller.signal)
    } catch (e: unknown) {
      caughtError = e as Error
    }

    expect(caughtError).to.be.instanceOf(Error)
    expect(caughtError?.message).to.include('aborted by user or signal')
  })

  it('reconciles topology against inventory skipping already installed packages for interrupted flashing recovery', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const initUpdateResp = mockInitUpdateResponse()

    // Mock GET STATUS responses:
    // Initial inventory query:
    const getStatusElf = new Uint8Array([0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x90, 0x00])
    const getStatusMod = new Uint8Array([0x90, 0x00])
    const getStatusApp = new Uint8Array([0x90, 0x00])

    // Post-flashing verification inventory query (all packages installed):
    const getStatusElfPost = new Uint8Array([
      0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01, 0x90, 0x00,
    ])
    const getStatusModPost = new Uint8Array([0x90, 0x00])
    const getStatusAppPost = new Uint8Array([0x90, 0x00])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      getStatusElf, // 4. GET STATUS 0x20 (initial reconcile)
      getStatusMod, // 5. GET STATUS 0x10
      getStatusApp, // 6. GET STATUS 0x40
      new Uint8Array([0x90, 0x00]), // 7. INSTALL [for load] Pkg B only! (Pkg A skipped)
      new Uint8Array([0x90, 0x00]), // 8. LOAD Pkg B chunk 1
      getStatusElfPost, // 9. GET STATUS 0x20 (post-flashing verification)
      getStatusModPost, // 10. GET STATUS 0x10
      getStatusAppPost, // 11. GET STATUS 0x40
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const provisioner = new GlobalPlatformProvisioner(reader)

    const capA = buildValidMockCap('FF6974656D01')
    const capB = buildValidMockCap('FF6974656D02')

    const progressEvents: ProvisioningProgressEvent[] = []

    await provisioner.provisionTopology(
      [
        { name: 'PkgA', packageAid: 'FF6974656D01', capBytes: capA, isLibrary: true },
        { name: 'PkgB', packageAid: 'FF6974656D02', capBytes: capB, isLibrary: true },
      ],
      {
        keySet,
        hostChallenge,
        reconcileWithInventory: true, // Enable recovery mode
        onProgress: ev => progressEvents.push(ev),
      }
    )

    const descriptions = progressEvents.map(e => e.stepDescription)
    expect(descriptions.some(d => d.includes('Reconciled: 1 packages intact, 1 to load'))).to.equal(true)
    expect(descriptions.some(d => d.includes('Loading PkgB'))).to.equal(true)
    // PkgA loading must not have been triggered because it was already on card
    expect(descriptions.some(d => d.includes('Loading PkgA'))).to.equal(false)
  })

  it('stops before card deletion if strict preflight validation fails', async () => {
    const transport = new MockTransport([]) // Zero APDUs should be sent
    const reader = new Reader(transport)
    await reader.connect()
    const provisioner = new GlobalPlatformProvisioner(reader)

    let caughtError: Error | null = null
    try {
      await provisioner.provisionTopology(
        [
          {
            name: 'CorruptedPkg',
            packageAid: 'FF6974656D01',
            capBytes: new Uint8Array([0x00, 0x01, 0x02]), // Invalid CAP
          },
        ],
        {
          keySet,
          cleanWipeExisting: true,
          existingAidsToDelete: ['FF6974656D01'],
        }
      )
    } catch (e: unknown) {
      caughtError = e as Error
    }

    expect(caughtError).to.be.instanceOf(Error)
    expect(caughtError?.message).to.include('Topology Preflight Validation Failed')
  })

  it('reloads a package if wiped during clean-wipe even when previously present in inventory', async () => {
    const hostChallenge = hexToUint8('1122334455667788')
    const initUpdateResp = mockInitUpdateResponse()

    // Inventory initially contains Pkg A ('FF6974656D01') and Pkg B ('FF6974656D02')
    const getStatusElf = new Uint8Array([
      0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01, 0x90, 0x00,
    ])
    const getStatusMod = new Uint8Array([0x90, 0x00])
    const getStatusApp = new Uint8Array([0x90, 0x00])

    // Post-flashing verification inventory query (all packages installed):
    const getStatusElfPost = new Uint8Array([
      0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x02, 0x01, 0x90, 0x00,
    ])
    const getStatusModPost = new Uint8Array([0x90, 0x00])
    const getStatusAppPost = new Uint8Array([0x90, 0x00])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      new Uint8Array([0x90, 0x00]), // 4. DELETE Pkg A (clean wipe)
      getStatusElf, // 5. GET STATUS 0x20
      getStatusMod, // 6. GET STATUS 0x10
      getStatusApp, // 7. GET STATUS 0x40
      new Uint8Array([0x90, 0x00]), // 8. INSTALL [for load] Pkg A (must reload because it was wiped!)
      new Uint8Array([0x90, 0x00]), // 9. LOAD Pkg A chunk 1
      getStatusElfPost, // 10. GET STATUS 0x20 (post-flashing verification)
      getStatusModPost, // 11. GET STATUS 0x10
      getStatusAppPost, // 12. GET STATUS 0x40
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const provisioner = new GlobalPlatformProvisioner(reader)

    const capA = buildValidMockCap('FF6974656D01')
    const capB = buildValidMockCap('FF6974656D02')

    const progressEvents: ProvisioningProgressEvent[] = []

    await provisioner.provisionTopology(
      [
        { name: 'PkgA', packageAid: 'FF6974656D01', capBytes: capA, isLibrary: true },
        { name: 'PkgB', packageAid: 'FF6974656D02', capBytes: capB, isLibrary: true },
      ],
      {
        keySet,
        hostChallenge,
        cleanWipeExisting: true,
        existingAidsToDelete: ['FF6974656D01'], // Explicitly wipe Pkg A
        reconcileWithInventory: true, // Reconcile mode enabled
        onProgress: ev => progressEvents.push(ev),
      }
    )

    const descriptions = progressEvents.map(e => e.stepDescription)
    expect(descriptions.some(d => d.includes('Loading PkgA'))).to.equal(true)
    expect(descriptions.some(d => d.includes('Loading PkgB'))).to.equal(false) // Pkg B skipped as intact
  })

  it('rejects preflight on invalid AID format or invalid installation parameters', () => {
    // Valid mock CAP defining Applet.cap with applet module FF6974656D0101
    const validCap = buildValidMockCap('FF6974656D01', [], ['FF6974656D0101'])

    // 1. Invalid package AID hex
    const res1 = preflightTopology([{ name: 'BadPkg', packageAid: 'INVALID_HEX', capBytes: validCap, isLibrary: true }])
    expect(res1.valid).to.equal(false)
    expect(res1.errors[0]).to.include('Invalid package AID format')

    // 2. Short package AID (< 5 bytes)
    const res2 = preflightTopology([{ name: 'ShortPkg', packageAid: 'FFAA', capBytes: validCap, isLibrary: true }])
    expect(res2.valid).to.equal(false)
    expect(res2.errors[0]).to.include('must be 5..16 hex bytes')

    // 3. Invalid instance AID hex
    const res3 = preflightTopology([
      {
        name: 'BadInst',
        packageAid: 'FF6974656D01',
        capBytes: validCap,
        appletAid: 'FF6974656D0101',
        instanceAid: 'ZZZZ',
      },
    ])
    expect(res3.valid).to.equal(false)
    expect(res3.errors[0]).to.include('Invalid instance AID format')

    // 4. Invalid privileges hex
    const res4 = preflightTopology([
      {
        name: 'BadPriv',
        packageAid: 'FF6974656D01',
        capBytes: validCap,
        appletAid: 'FF6974656D0101',
        instanceAid: 'FF6974656D010101',
        privileges: 'NOT_HEX',
      },
    ])
    expect(res4.valid).to.equal(false)
    expect(res4.errors[0]).to.include('Invalid hex string for privileges')
  })

  describe('Malformed CAP Handling & Security Rejection', () => {
    it('rejects CAP with corrupted internal component size header', () => {
      const validCap = buildValidMockCap('FF6974656D01', ['A0000000620101'])
      const components = parseRawComponentStream(validCap)
      const dirComp = components.get(2)!
      // Corrupt Directory component (Tag 2) internal payload length byte to mismatch actual length
      const corruptedDir = new Uint8Array(dirComp)
      corruptedDir[2] = 10 // Claim 10 bytes instead of 24

      // Assemble raw stream with corrupted component
      const rawStream = new Uint8Array(validCap.length)
      let off = 0
      for (const [tag, bytes] of components.entries()) {
        const toWrite = tag === 2 ? corruptedDir : bytes
        rawStream.set(toWrite, off)
        off += toWrite.length
      }

      const res = validateCap(rawStream, 'FF6974656D01')
      expect(res.valid).to.equal(false)
      expect(res.errors.some(e => e.includes('internal size corruption') || e.includes('length mismatch'))).to.equal(
        true
      )
    })

    it('rejects CAP with mismatched component tag byte', () => {
      const validCap = buildValidMockCap('FF6974656D01', ['A0000000620101'])
      const corruptedCap = new Uint8Array(validCap)
      // Corrupt Tag 5 (ConstantPool) to Tag 99
      for (let i = 0; i < corruptedCap.length - 3; i++) {
        if (corruptedCap[i] === 0x05 && corruptedCap[i + 1] === 0x00 && corruptedCap[i + 2] === 0x02) {
          corruptedCap[i] = 0x99
          break
        }
      }

      const res = validateCap(corruptedCap, 'FF6974656D01')
      expect(res.valid).to.equal(false)
      expect(
        res.errors.some(e => e.includes('Missing mandatory JavaCard component') || e.includes('Tag mismatch'))
      ).to.equal(true)
    })

    it('rejects CAP with missing mandatory components (e.g. missing RefLocation)', () => {
      // Build stream omitting RefLocation (Tag 9)
      const aidBytes = hexToUint8('FF6974656D01')
      const headerPayload = new Uint8Array([
        0xde,
        0xca,
        0xff,
        0xed,
        0x01,
        0x02,
        0x04,
        0x01,
        0x00,
        aidBytes.length,
        ...aidBytes,
      ])
      const headerComp = new Uint8Array([0x01, 0x00, headerPayload.length, ...headerPayload])
      const dirPayload = new Uint8Array(24)
      const dirComp = new Uint8Array([0x02, 0x00, 24, ...dirPayload])
      const importComp = new Uint8Array([0x04, 0x00, 0x01, 0x00])
      const cpComp = new Uint8Array([0x05, 0x00, 0x02, 0x00, 0x00])
      const classComp = new Uint8Array([0x06, 0x00, 0x02, 0x00, 0x00])
      const methodComp = new Uint8Array([0x07, 0x00, 0x02, 0x00, 0x00])
      const sfComp = new Uint8Array([0x08, 0x00, 0x02, 0x00, 0x00])
      // Omit Tag 9 (RefLocation)

      const incomplete = new Uint8Array(
        headerComp.length +
          dirComp.length +
          importComp.length +
          cpComp.length +
          classComp.length +
          methodComp.length +
          sfComp.length
      )
      let off = 0
      incomplete.set(headerComp, off)
      off += headerComp.length
      incomplete.set(dirComp, off)
      off += dirComp.length
      incomplete.set(importComp, off)
      off += importComp.length
      incomplete.set(cpComp, off)
      off += cpComp.length
      incomplete.set(classComp, off)
      off += classComp.length
      incomplete.set(methodComp, off)
      off += methodComp.length
      incomplete.set(sfComp, off)

      const res = validateCap(incomplete, 'FF6974656D01')
      expect(res.valid).to.equal(false)
      expect(res.errors.some(e => e.includes('Missing mandatory JavaCard component Tag 9'))).to.equal(true)
    })
  })

  describe('Post-Flashing Final Installed State Verification Engine', () => {
    it('verifies installed packages and selectable applet instances with live ISO SELECT probe', async () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const initUpdateResp = mockInitUpdateResponse()

      // Post-flashing inventory queries:
      // 1. Exec Load Files: [len 6] [FF6974656D01] [state 01]
      const getStatusElf = new Uint8Array([0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x90, 0x00])
      // 2. Exec Modules: [len 6] [FF6974656D01] [state 01] [num 1] [len 7] [FF6974656D0101]
      const getStatusMod = new Uint8Array([
        0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x01, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x90,
        0x00,
      ])
      // 3. Applets: [len 7] [FF6974656D0101] [state 07 SELECTABLE] [priv 1] [00]
      const getStatusApp = new Uint8Array([
        0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x07, 0x01, 0x00, 0x90, 0x00,
      ])

      const transport = new MockTransport([
        new Uint8Array([0x90, 0x00]), // 1. SELECT ISD
        initUpdateResp, // 2. INIT UPDATE
        new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
        new Uint8Array([0x90, 0x00]), // 4. INSTALL [for load]
        new Uint8Array([0x90, 0x00]), // 5. LOAD chunk 1
        new Uint8Array([0x90, 0x00]), // 6. INSTALL [for install]
        getStatusElf, // 7. GET STATUS 0x20 (post-flashing verify ELFs)
        getStatusMod, // 8. GET STATUS 0x10 (post-flashing verify modules)
        getStatusApp, // 9. GET STATUS 0x40 (post-flashing verify Applets)
        new Uint8Array([0x6f, 0x10, 0x84, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x90, 0x00]), // 10. ISO SELECT Applet -> 9000 with FCI
        new Uint8Array([0x90, 0x00]), // 11. Re-select ISD
      ])

      const reader = new Reader(transport)
      await reader.connect()
      const provisioner = new GlobalPlatformProvisioner(reader)

      const cap = buildValidMockCap('FF6974656D01', [], ['FF6974656D0101'])
      const progressEvents: ProvisioningProgressEvent[] = []

      await provisioner.provisionTopology(
        [
          {
            name: 'TestApplet',
            packageAid: 'FF6974656D01',
            capBytes: cap,
            appletAid: 'FF6974656D0101',
            instanceAid: 'FF6974656D0101',
          },
        ],
        {
          keySet,
          hostChallenge,
          verifyInstalledState: true,
          verifySelectable: true,
          onProgress: ev => progressEvents.push(ev),
        }
      )

      const phases = progressEvents.map(e => e.phase)
      expect(phases).to.include('verifying')
      expect(phases).to.include('complete')
      expect(progressEvents.some(e => e.stepDescription.includes('Testing ISO SELECT on TestApplet'))).to.equal(true)
    })

    it('fails provisioning if post-flashing ISO SELECT probe fails on an instantiated applet', async () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const initUpdateResp = mockInitUpdateResponse()

      const getStatusElf = new Uint8Array([0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x90, 0x00])
      const getStatusMod = new Uint8Array([0x90, 0x00])
      const getStatusApp = new Uint8Array([
        0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x07, 0x01, 0x00, 0x90, 0x00,
      ])

      const transport = new MockTransport([
        new Uint8Array([0x90, 0x00]), // 1. SELECT ISD
        initUpdateResp, // 2. INIT UPDATE
        new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
        new Uint8Array([0x90, 0x00]), // 4. INSTALL [for load]
        new Uint8Array([0x90, 0x00]), // 5. LOAD chunk 1
        new Uint8Array([0x90, 0x00]), // 6. INSTALL [for install]
        getStatusElf, // 7. GET STATUS 0x20
        getStatusMod, // 8. GET STATUS 0x10
        getStatusApp, // 9. GET STATUS 0x40
        new Uint8Array([0x6a, 0x82]), // 10. ISO SELECT Applet fails with 6A82 (File/Applet not found)
      ])

      const reader = new Reader(transport)
      await reader.connect()
      const provisioner = new GlobalPlatformProvisioner(reader)
      const cap = buildValidMockCap('FF6974656D01', [], ['FF6974656D0101'])

      let caughtError: Error | null = null
      try {
        await provisioner.provisionTopology(
          [
            {
              name: 'BrokenApplet',
              packageAid: 'FF6974656D01',
              capBytes: cap,
              appletAid: 'FF6974656D0101',
              instanceAid: 'FF6974656D0101',
            },
          ],
          {
            keySet,
            hostChallenge,
            verifyInstalledState: true,
            verifySelectable: true,
          }
        )
      } catch (err: unknown) {
        caughtError = err as Error
      }

      expect(caughtError).to.be.instanceOf(Error)
      expect(caughtError?.message).to.include('Post-flashing verification failed')
      expect(caughtError?.message).to.include('failed SELECT with Status Word 0x6A82')
    })

    it('parses Tag 0xE3 TLV formatted GET STATUS responses seamlessly', async () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const initUpdateResp = mockInitUpdateResponse()

      // Tag 0xE3 TLV response for P1=0x20:
      // [E3] [len] [4F 06 FF6974656D01] [9F70 01 01] [CE 02 0100]
      const e3Elf = new Uint8Array([
        0xe3, 0x10, 0x4f, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x9f, 0x70, 0x01, 0x01, 0xce, 0x02, 0x01, 0x00,
        0x90, 0x00,
      ])
      // Tag 0xE3 TLV response for P1=0x10:
      // In GP 2.2 §11.4.3.2, for P1=0x10, the ELF Tag 0xE3 contains Tag 0x4F (ELF AID) and Tag 0x84 (Module AID)
      // [E3] [len] [4F 06 FF6974656D01] [9F70 01 01] [84 07 FF6974656D0101]
      // Note: 0x12 payload bytes: 4F(8) + 9F70(4) + 84(9) = 21 -> 0x15
      const e3Mod = new Uint8Array([
        0xe3, 0x15, 0x4f, 0x06, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x9f, 0x70, 0x01, 0x01, 0x84, 0x07, 0xff, 0x69,
        0x74, 0x65, 0x6d, 0x01, 0x01, 0x90, 0x00,
      ])
      // Tag 0xE3 TLV response for P1=0x40:
      // [E3] [len] [4F 07 FF6974656D0101] [9F70 01 07] [C4 01 00]
      const e3App = new Uint8Array([
        0xe3, 0x11, 0x4f, 0x07, 0xff, 0x69, 0x74, 0x65, 0x6d, 0x01, 0x01, 0x9f, 0x70, 0x01, 0x07, 0xc4, 0x01, 0x00,
        0x90, 0x00,
      ])

      const transport = new MockTransport([
        new Uint8Array([0x90, 0x00]), // 1. SELECT
        initUpdateResp, // 2. INIT UPDATE
        new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
        e3Elf, // 4. GET STATUS (0x20)
        e3Mod, // 5. GET STATUS (0x10)
        e3App, // 6. GET STATUS (0x40)
      ])

      const reader = new Reader(transport)
      await reader.connect()
      const cardManager = new GlobalPlatformCardManager(reader)
      await cardManager.selectCardManager(DEFAULT_ISD_AID)
      await cardManager.openSecureChannelScp02(keySet, GpSecurityLevel.C_DECRYPTION_AND_C_MAC, hostChallenge)

      const inventory = await cardManager.getCardInventory()
      expect(inventory.executableLoadFiles.length).to.equal(1)
      expect(inventory.executableLoadFiles[0].aid).to.equal('FF6974656D01')
      expect(inventory.executableLoadFiles[0].lifeCycleState).to.equal(0x01)
      expect(inventory.executableLoadFiles[0].versionNumber).to.equal('0100')

      expect(inventory.executableModules.length).to.equal(1)
      expect(inventory.executableModules[0].executableLoadFileAid).to.equal('FF6974656D01')
      expect(inventory.executableModules[0].executableModuleAid).to.equal('FF6974656D0101')

      expect(inventory.appletsAndSecurityDomains.length).to.equal(1)
      expect(inventory.appletsAndSecurityDomains[0].aid).to.equal('FF6974656D0101')
      expect(inventory.appletsAndSecurityDomains[0].lifeCycleState).to.equal(0x07)
      expect(inventory.appletsAndSecurityDomains[0].privileges).to.equal('00')
    })
  })
})
