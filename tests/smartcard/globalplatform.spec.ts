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
function buildValidMockCap(pkgAidHex: string, importedAids: string[] = []): Uint8Array {
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
    const capA = buildValidMockCap('FF0001', ['A0000000620001'])
    const capB = buildValidMockCap('FF0002', ['FF0001'])
    const capC = buildValidMockCap('FF0003', ['FF0002'])

    // Pass in reverse order (C, B, A) to ensure preflight correctly re-orders
    const preflight = preflightTopology([
      { name: 'PkgC', packageAid: 'FF0003', capBytes: capC },
      { name: 'PkgB', packageAid: 'FF0002', capBytes: capB },
      { name: 'PkgA', packageAid: 'FF0001', capBytes: capA },
    ])

    expect(preflight.valid).to.equal(true)
    expect(preflight.plannedExecutionOrder).to.deep.equal(['FF0001', 'FF0002', 'FF0003'])
  })

  it('detects unfulfilled missing dependencies before execution', () => {
    const capA = buildValidMockCap('FF0001', ['DEADBEEF0001']) // Imports non-existent package
    const preflight = preflightTopology([{ name: 'PkgA', packageAid: 'FF0001', capBytes: capA }])

    expect(preflight.valid).to.equal(false)
    expect(preflight.errors[0]).to.include('requires missing dependency AIDs: DEADBEEF0001')
  })

  it('detects circular dependencies in package imports', () => {
    // Pkg A imports Pkg B, and Pkg B imports Pkg A (cycle)
    const capA = buildValidMockCap('FF0001', ['FF0002'])
    const capB = buildValidMockCap('FF0002', ['FF0001'])

    const preflight = preflightTopology([
      { name: 'PkgA', packageAid: 'FF0001', capBytes: capA },
      { name: 'PkgB', packageAid: 'FF0002', capBytes: capB },
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

    // Inventory already contains Pkg A ('FF0001')
    const getStatusElf = new Uint8Array([0x03, 0xff, 0x00, 0x01, 0x01, 0x90, 0x00])
    const getStatusMod = new Uint8Array([0x90, 0x00])
    const getStatusApp = new Uint8Array([0x90, 0x00])

    const transport = new MockTransport([
      new Uint8Array([0x90, 0x00]), // 1. SELECT
      initUpdateResp, // 2. INIT UPDATE
      new Uint8Array([0x90, 0x00]), // 3. EXT AUTH
      getStatusElf, // 4. GET STATUS 0x20
      getStatusMod, // 5. GET STATUS 0x10
      getStatusApp, // 6. GET STATUS 0x40
      new Uint8Array([0x90, 0x00]), // 7. INSTALL [for load] Pkg B only! (Pkg A skipped)
      new Uint8Array([0x90, 0x00]), // 8. LOAD Pkg B chunk 1
    ])

    const reader = new Reader(transport)
    await reader.connect()
    const provisioner = new GlobalPlatformProvisioner(reader)

    const capA = buildValidMockCap('FF0001')
    const capB = buildValidMockCap('FF0002')

    const progressEvents: ProvisioningProgressEvent[] = []

    await provisioner.provisionTopology(
      [
        { name: 'PkgA', packageAid: 'FF0001', capBytes: capA, isLibrary: true },
        { name: 'PkgB', packageAid: 'FF0002', capBytes: capB, isLibrary: true },
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
            packageAid: 'FF0001',
            capBytes: new Uint8Array([0x00, 0x01, 0x02]), // Invalid CAP
          },
        ],
        {
          keySet,
          cleanWipeExisting: true,
          existingAidsToDelete: ['FF0001'],
        }
      )
    } catch (e: unknown) {
      caughtError = e as Error
    }

    expect(caughtError).to.be.instanceOf(Error)
    expect(caughtError?.message).to.include('Topology Preflight Validation Failed')
  })
})
