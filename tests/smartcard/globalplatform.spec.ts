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
    it('derives session keys and computes card/host cryptograms', () => {
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

  describe('SCP03 Session & Key Derivation', () => {
    it('derives session keys and computes SCP03 cryptograms', () => {
      const hostChallenge = hexToUint8('1122334455667788')
      const cardChallenge = hexToUint8('8877665544332211')

      const { sEnc, sMac, sRMac, sDek } = Scp03Session.deriveSessionKeys(factoryAesKey, hostChallenge, cardChallenge)
      expect(sEnc.length).to.equal(16)
      expect(sMac.length).to.equal(16)
      expect(sRMac.length).to.equal(16)
      expect(sDek.length).to.equal(16)

      const cardCryptogram = Scp03Session.calculateCardCryptogram(sMac, hostChallenge, cardChallenge)
      expect(cardCryptogram.length).to.equal(8)

      const hostCryptogram = Scp03Session.calculateHostCryptogram(sMac, hostChallenge, cardChallenge)
      expect(hostCryptogram.length).to.equal(8)
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
})

describe('GlobalPlatform Card Manager and Provisioner Workflows', () => {
  const keySet: GpKeySet = {
    version: 0x01,
    encKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    macKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
    dekKey: hexToUint8('404142434445464748494A4B4C4D4E4F'),
  }

  it('executes SELECT, INITIALIZE UPDATE, and EXTERNAL AUTHENTICATE sequence against MockTransport', async () => {
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
        capBytes: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
        isLibrary: true,
      },
      {
        name: '02_item-javacard',
        packageAid: 'FF6974656D737973030000',
        capBytes: new Uint8Array([0x05, 0x06, 0x07, 0x08]),
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
