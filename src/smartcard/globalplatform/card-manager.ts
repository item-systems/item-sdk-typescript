import { CardReader } from '../reader'
import { uint8ToHex, hexToUint8 } from '../utils'
import { GpSecurityLevel, Scp02Session } from './scp02'
import { Scp03Session } from './scp03'
import { buildLoadFileDataBlock } from './cap-parser'
import { randomBytes } from 'crypto'

/**
 * Key Set structure for GlobalPlatform authentication.
 */
export interface GpKeySet {
  version: number
  encKey: Uint8Array
  macKey: Uint8Array
  dekKey: Uint8Array
}

export interface GpInstalledElement {
  aid: string
  lifeCycleState: number
  privileges?: string
  executableLoadFileAid?: string
  versionNumber?: string
}

export interface GpStatusResult {
  executableLoadFiles: GpInstalledElement[]
  executableModules: GpInstalledElement[]
  appletsAndSecurityDomains: GpInstalledElement[]
}

/**
 * Default GlobalPlatform Card Manager AID (Issuer Security Domain).
 */
export const DEFAULT_ISD_AID = 'A000000151000000'

/**
 * Default max chunk size for LOAD APDUs (224 bytes).
 * Ensures that when encrypted (ISO 9797 Method 2 padding adds up to 16 bytes)
 * and MACed (8 bytes), the total APDU Lc does not exceed 255 bytes (single-byte Lc).
 */
export const DEFAULT_MAX_LOAD_CHUNK_SIZE = 224

/**
 * High-level GlobalPlatform Card Manager Client.
 *
 * Implements standard GlobalPlatform 2.2/2.3 Card Management commands:
 * - SELECT Card Manager / ISD
 * - INITIALIZE UPDATE / EXTERNAL AUTHENTICATE (SCP02 / SCP03)
 * - GET DATA (CPLC, Key Information)
 * - GET STATUS (List Executable Load Files, Packages, Applets)
 * - DELETE (Uninstall Packages / Instances)
 * - INSTALL [for load] & LOAD (Chunked CAP deployment with Tag 0xC4 construction)
 * - INSTALL [for install & make selectable] (Applet instantiation)
 */
export class GlobalPlatformCardManager {
  private reader: CardReader
  private session: Scp02Session | Scp03Session | null = null

  constructor(reader: CardReader) {
    this.reader = reader
  }

  /**
   * Select Issuer Security Domain (Card Manager).
   */
  public async selectCardManager(isdAid: string = DEFAULT_ISD_AID): Promise<Uint8Array> {
    const aidBytes = hexToUint8(isdAid)
    const selectApdu = new Uint8Array([0x00, 0xa4, 0x04, 0x00, aidBytes.length, ...aidBytes, 0x00])
    const resp = await this.reader.transmit(selectApdu)
    this.assertSuccess(resp, 'SELECT Card Manager')
    this.session = null // Reset secure channel on new selection
    return resp
  }

  /**
   * Perform GlobalPlatform Mutual Authentication and open Secure Channel (SCP02).
   */
  public async openSecureChannelScp02(
    keySet: GpKeySet,
    securityLevel: GpSecurityLevel = GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
    hostChallenge?: Uint8Array
  ): Promise<Scp02Session> {
    const hostChal = hostChallenge || new Uint8Array(randomBytes(8))

    // 1. INITIALIZE UPDATE (CLA=0x80, INS=0x50, P1=KeySetVersion, P2=0x00, Lc=0x08, Data=HostChallenge, Le=0x00)
    const initUpdateApdu = new Uint8Array([0x80, 0x50, keySet.version & 0xff, 0x00, 0x08, ...hostChal, 0x00])
    const initResp = await this.reader.transmit(initUpdateApdu)
    this.assertSuccess(initResp, 'INITIALIZE UPDATE (SCP02)')

    // Response structure (28+2 bytes):
    // Key Diversification Data (10B) || Key Info (2B) || Sequence Counter (2B) || Card Challenge (6B) || Card Cryptogram (8B) || SW (2B)
    const seqCounter = initResp.subarray(12, 14)
    const cardChallenge = initResp.subarray(14, 20)
    const cardCryptogram = initResp.subarray(20, 28)

    // 2. Derive Session Keys (S-ENC, S-MAC, S-DEK) via 3DES-CBC
    const { sEnc, sMac, sDek } = Scp02Session.deriveSessionKeys(keySet.encKey, keySet.macKey, keySet.dekKey, seqCounter)

    // 3. Verify Card Cryptogram
    const expectedCardCrypto = Scp02Session.calculateCardCryptogram(sEnc, hostChal, initResp.subarray(12, 20))
    if (uint8ToHex(cardCryptogram) !== uint8ToHex(expectedCardCrypto)) {
      throw new Error(
        `SCP02 Card Cryptogram mismatch! Expected: ${uint8ToHex(expectedCardCrypto)}, Received: ${uint8ToHex(cardCryptogram)}`
      )
    }

    // 4. Calculate Host Cryptogram
    const hostCryptogram = Scp02Session.calculateHostCryptogram(sEnc, seqCounter, cardChallenge, hostChal)

    // 5. EXTERNAL AUTHENTICATE
    // Per GP 2.2 §10.4 / Appendix E.4.4:
    // EXTERNAL AUTHENTICATE is wrapped with C-MAC ONLY (Lc=0x10, Data = HostCrypto(8B) || C-MAC(8B)).
    // Data encryption (C-DECRYPTION) only takes effect on SUBSEQUENT commands.
    const authSession = new Scp02Session(sEnc, sMac, sDek, GpSecurityLevel.C_MAC)
    const extAuthRaw = new Uint8Array([0x80, 0x82, securityLevel & 0xff, 0x00, 0x08, ...hostCryptogram])
    const extAuthWrapped = authSession.wrap(extAuthRaw)

    const extResp = await this.reader.transmit(extAuthWrapped)
    this.assertSuccess(extResp, 'EXTERNAL AUTHENTICATE (SCP02)')

    // After successful EXTERNAL AUTHENTICATE, set requested target security level (e.g. C_DECRYPTION_AND_C_MAC)
    authSession.setSecurityLevel(securityLevel)
    this.session = authSession
    return authSession
  }

  /**
   * Perform GlobalPlatform Mutual Authentication and open Secure Channel (SCP03).
   */
  public async openSecureChannelScp03(
    staticKey: Uint8Array,
    keyVersion = 0x01,
    securityLevel: GpSecurityLevel = GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
    hostChallenge?: Uint8Array
  ): Promise<Scp03Session> {
    const hostChal = hostChallenge || new Uint8Array(randomBytes(8))

    // 1. INITIALIZE UPDATE (CLA=0x80, INS=0x50, P1=KeySetVersion, P2=0x00, Lc=0x08, Data=HostChallenge, Le=0x00)
    const initUpdateApdu = new Uint8Array([0x80, 0x50, keyVersion & 0xff, 0x00, 0x08, ...hostChal, 0x00])
    const initResp = await this.reader.transmit(initUpdateApdu)
    this.assertSuccess(initResp, 'INITIALIZE UPDATE (SCP03)')

    // Response structure per GP 2.3 Amendment D Section 5.1 / 6.1 (29+2 or 32+2 bytes):
    // Key Diversification Data (10B, 0..9)
    // Key Version Number (1B, 10)
    // SCP Identifier (1B, 11: 0x03)
    // SCP03 Implementation Option (1B, 12)
    // Card Challenge (8B, 13..20)
    // Card Cryptogram (8B, 21..28)
    // [Sequence Counter (3B, 29..31) - optional]
    // Status Word (2B)
    const cardChallenge = initResp.subarray(13, 21)
    const cardCryptogram = initResp.subarray(21, 29)

    // 2. Derive Session Keys (S-ENC, S-MAC, S-RMAC, S-DEK)
    const { sEnc, sMac, sRMac, sDek } = Scp03Session.deriveSessionKeys(staticKey, hostChal, cardChallenge)

    // 3. Verify Card Cryptogram
    const expectedCardCrypto = Scp03Session.calculateCardCryptogram(sMac, hostChal, cardChallenge)
    if (uint8ToHex(cardCryptogram) !== uint8ToHex(expectedCardCrypto)) {
      throw new Error(
        `SCP03 Card Cryptogram mismatch! Expected: ${uint8ToHex(expectedCardCrypto)}, Received: ${uint8ToHex(cardCryptogram)}`
      )
    }

    // 4. Calculate Host Cryptogram
    const hostCryptogram = Scp03Session.calculateHostCryptogram(sMac, hostChal, cardChallenge)

    // 5. EXTERNAL AUTHENTICATE (C-MAC only for authentication handshake)
    const authSession = new Scp03Session(sEnc, sMac, sRMac, sDek, GpSecurityLevel.C_MAC)
    const extAuthRaw = new Uint8Array([0x80, 0x82, securityLevel & 0xff, 0x00, 0x08, ...hostCryptogram])
    const extAuthWrapped = authSession.wrap(extAuthRaw)

    const extResp = await this.reader.transmit(extAuthWrapped)
    this.assertSuccess(extResp, 'EXTERNAL AUTHENTICATE (SCP03)')

    // Set requested target security level on session after authentication
    authSession.setSecurityLevel(securityLevel)
    this.session = authSession
    return authSession
  }

  /**
   * Delete an applet instance or package by AID.
   */
  public async delete(aid: string, deleteRelated = true): Promise<void> {
    const aidBytes = hexToUint8(aid)
    // DELETE data field TLV: 0x4F || len || AID
    const data = new Uint8Array(2 + aidBytes.length)
    data[0] = 0x4f
    data[1] = aidBytes.length
    data.set(aidBytes, 2)

    // P2: 0x00 = delete object, 0x80 = delete related objects (e.g. executable modules with package)
    const p2 = deleteRelated ? 0x80 : 0x00
    const rawApdu = new Uint8Array([0x80, 0xe4, 0x00, p2, data.length, ...data])
    const wrapped = this.wrapApdu(rawApdu)

    const resp = await this.reader.transmit(wrapped)
    this.assertSuccess(resp, `DELETE AID ${aid}`)
  }

  /**
   * Load and flash a compiled CAP file onto the card.
   *
   * Automatically unpacks ZIP-formatted CAP archives and constructs the canonical
   * GlobalPlatform Load File Data Block (Tag 0xC4) containing the ordered component TLVs.
   *
   * @param capBytes Raw CAP binary content (ZIP archive or Load File Data Block)
   * @param packageAid Executable Load File AID
   * @param securityDomainAid Target Security Domain AID (default ISD)
   * @param maxChunkSize Chunk size for LOAD APDUs (default 224 bytes, preventing short APDU overflow)
   */
  public async loadCap(
    capBytes: Uint8Array,
    packageAid: string,
    securityDomainAid: string = DEFAULT_ISD_AID,
    maxChunkSize: number = DEFAULT_MAX_LOAD_CHUNK_SIZE
  ): Promise<void> {
    const pkgAidBytes = hexToUint8(packageAid)
    const isdAidBytes = hexToUint8(securityDomainAid)

    // Build canonical GlobalPlatform Load File Data Block (Tag 0xC4)
    const loadFileDataBlock = buildLoadFileDataBlock(capBytes)

    // 1. INSTALL [for load] (CLA=0x80, INS=0xE6, P1=0x02, P2=0x00)
    // Data TLV:
    // [Pkg AID len (1B)] [Pkg AID]
    // [SD AID len (1B)] [SD AID]
    // [Load File Hash len (1B, 0x00 for none)]
    // [Load Parameters len (1B, 0x00 for none)]
    // [Load Token len (1B, 0x00 for none)]
    const installForLoadData = new Uint8Array(1 + pkgAidBytes.length + 1 + isdAidBytes.length + 1 + 1 + 1)
    let off = 0
    installForLoadData[off++] = pkgAidBytes.length
    installForLoadData.set(pkgAidBytes, off)
    off += pkgAidBytes.length

    installForLoadData[off++] = isdAidBytes.length
    installForLoadData.set(isdAidBytes, off)
    off += isdAidBytes.length

    installForLoadData[off++] = 0x00 // No Load File Hash
    installForLoadData[off++] = 0x00 // No Load Parameters
    installForLoadData[off++] = 0x00 // No Load Token

    const installForLoadApdu = new Uint8Array([
      0x80,
      0xe6,
      0x02,
      0x00,
      installForLoadData.length,
      ...installForLoadData,
    ])
    const wrappedInstall = this.wrapApdu(installForLoadApdu)
    const installResp = await this.reader.transmit(wrappedInstall)
    this.assertSuccess(installResp, `INSTALL [for load] Package ${packageAid}`)

    // 2. Stream chunked LOAD APDUs (CLA=0x80, INS=0xE8, P1=0x00 (more) / 0x80 (last), P2=blockNumber)
    let blockNumber = 0
    let capOffset = 0

    while (capOffset < loadFileDataBlock.length) {
      const remaining = loadFileDataBlock.length - capOffset
      const chunkSize = Math.min(remaining, maxChunkSize)
      const isLastChunk = capOffset + chunkSize === loadFileDataBlock.length
      const p1 = isLastChunk ? 0x80 : 0x00

      const chunk = loadFileDataBlock.subarray(capOffset, capOffset + chunkSize)
      const loadApdu = new Uint8Array([0x80, 0xe8, p1, blockNumber & 0xff, chunk.length, ...chunk])
      const wrappedLoad = this.wrapApdu(loadApdu)

      const loadResp = await this.reader.transmit(wrappedLoad)
      this.assertSuccess(
        loadResp,
        `LOAD Block ${blockNumber} (${capOffset + chunkSize}/${loadFileDataBlock.length} bytes)`
      )

      capOffset += chunkSize
      blockNumber = (blockNumber + 1) & 0xff
    }
  }

  /**
   * Instantiate an applet from an installed package and make it selectable.
   *
   * @param packageAid Executable Load File AID
   * @param moduleAid Executable Module AID inside the package
   * @param instanceAid Target Applet Instance AID
   * @param privileges Application Privileges (e.g. "00" or "04" for Default Selected)
   * @param installParams Hex-encoded custom install parameters (e.g. "C90100" or raw parameter bytes)
   */
  public async installAndMakeSelectable(
    packageAid: string,
    moduleAid: string,
    instanceAid: string,
    privileges = '00',
    installParams = ''
  ): Promise<void> {
    const pkgBytes = hexToUint8(packageAid)
    const modBytes = hexToUint8(moduleAid)
    const instBytes = hexToUint8(instanceAid)
    const privBytes = hexToUint8(privileges)
    const paramBytes = hexToUint8(installParams)

    // Data TLV:
    // [Pkg AID len (1B)] [Pkg AID]
    // [Mod AID len (1B)] [Mod AID]
    // [Inst AID len (1B)] [Inst AID]
    // [Privileges len (1B)] [Privileges]
    // [Params len (1B)] [Params]
    // [Install Token len (1B, 0x00)]
    const totalLen =
      1 +
      pkgBytes.length +
      1 +
      modBytes.length +
      1 +
      instBytes.length +
      1 +
      privBytes.length +
      1 +
      paramBytes.length +
      1

    const data = new Uint8Array(totalLen)
    let off = 0

    data[off++] = pkgBytes.length
    data.set(pkgBytes, off)
    off += pkgBytes.length

    data[off++] = modBytes.length
    data.set(modBytes, off)
    off += modBytes.length

    data[off++] = instBytes.length
    data.set(instBytes, off)
    off += instBytes.length

    data[off++] = privBytes.length
    data.set(privBytes, off)
    off += privBytes.length

    data[off++] = paramBytes.length
    data.set(paramBytes, off)
    off += paramBytes.length

    data[off++] = 0x00 // No token

    // P1: 0x0C = Install & Make Selectable
    const rawApdu = new Uint8Array([0x80, 0xe6, 0x0c, 0x00, data.length, ...data])
    const wrapped = this.wrapApdu(rawApdu)

    const resp = await this.reader.transmit(wrapped)
    this.assertSuccess(resp, `INSTALL [for install] Instance ${instanceAid}`)
  }

  /**
   * Helper to wrap APDU with active Secure Channel session if open.
   */
  private wrapApdu(rawApdu: Uint8Array): Uint8Array {
    if (this.session) {
      return this.session.wrap(rawApdu)
    }
    return rawApdu
  }

  /**
   * Assert response ends with SW = 0x9000.
   */
  private assertSuccess(resp: Uint8Array, operation: string): void {
    if (resp.length < 2) {
      throw new Error(`${operation} failed: response too short (${resp.length} bytes)`)
    }
    const sw = (resp[resp.length - 2] << 8) | resp[resp.length - 1]
    if (sw !== 0x9000) {
      throw new Error(`${operation} failed with Status Word: 0x${sw.toString(16).toUpperCase().padStart(4, '0')}`)
    }
  }
}
