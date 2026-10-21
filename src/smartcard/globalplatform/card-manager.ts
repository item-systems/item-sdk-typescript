import { CardReader } from '../reader'
import { uint8ToHex, hexToUint8 } from '../utils'
import { GpSecurityLevel, Scp02Session } from './scp02'
import { Scp03Session } from './scp03'
import { buildLoadFileDataBlock } from './cap-parser'
import { getRandomBytes } from './crypto'

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
 * Absolute maximum safe plaintext chunk size for LOAD APDUs under short APDUs (224 bytes).
 */
export const DEFAULT_MAX_LOAD_CHUNK_SIZE = 224
export const ABSOLUTE_MAX_SAFE_LOAD_CHUNK_SIZE = 224

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
   * Get active Secure Channel session or null if unauthenticated.
   */
  public getSession(): Scp02Session | Scp03Session | null {
    return this.session
  }

  /**
   * Select Issuer Security Domain (Card Manager).
   */
  public async selectCardManager(isdAid: string = DEFAULT_ISD_AID, signal?: AbortSignal): Promise<Uint8Array> {
    this.checkAborted(signal)
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
    hostChallenge?: Uint8Array,
    signal?: AbortSignal
  ): Promise<Scp02Session> {
    this.checkAborted(signal)
    const hostChal = hostChallenge || getRandomBytes(8)

    // 1. INITIALIZE UPDATE (CLA=0x80, INS=0x50, P1=KeySetVersion, P2=0x00, Lc=0x08, Data=HostChallenge, Le=0x00)
    const initUpdateApdu = new Uint8Array([0x80, 0x50, keySet.version & 0xff, 0x00, 0x08, ...hostChal, 0x00])
    const initResp = await this.reader.transmit(initUpdateApdu)
    this.assertSuccess(initResp, 'INITIALIZE UPDATE (SCP02)')

    this.checkAborted(signal)
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

    // 5. EXTERNAL AUTHENTICATE (wrapped with C-MAC ONLY per GP 2.2 §10.4)
    const authSession = new Scp02Session(sEnc, sMac, sDek, GpSecurityLevel.C_MAC)
    const extAuthRaw = new Uint8Array([0x80, 0x82, securityLevel & 0xff, 0x00, 0x08, ...hostCryptogram])
    const extAuthWrapped = authSession.wrap(extAuthRaw)

    this.checkAborted(signal)
    const extResp = await this.reader.transmit(extAuthWrapped)
    this.assertSuccess(extResp, 'EXTERNAL AUTHENTICATE (SCP02)')

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
    hostChallenge?: Uint8Array,
    signal?: AbortSignal
  ): Promise<Scp03Session> {
    this.checkAborted(signal)
    const hostChal = hostChallenge || getRandomBytes(8)

    // 1. INITIALIZE UPDATE
    const initUpdateApdu = new Uint8Array([0x80, 0x50, keyVersion & 0xff, 0x00, 0x08, ...hostChal, 0x00])
    const initResp = await this.reader.transmit(initUpdateApdu)
    this.assertSuccess(initResp, 'INITIALIZE UPDATE (SCP03)')

    this.checkAborted(signal)
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

    // 5. EXTERNAL AUTHENTICATE (C-MAC only for handshake)
    const authSession = new Scp03Session(sEnc, sMac, sRMac, sDek, GpSecurityLevel.C_MAC)
    const extAuthRaw = new Uint8Array([0x80, 0x82, securityLevel & 0xff, 0x00, 0x08, ...hostCryptogram])
    const extAuthWrapped = authSession.wrap(extAuthRaw)

    this.checkAborted(signal)
    const extResp = await this.reader.transmit(extAuthWrapped)
    this.assertSuccess(extResp, 'EXTERNAL AUTHENTICATE (SCP03)')

    authSession.setSecurityLevel(securityLevel)
    this.session = authSession
    return authSession
  }

  /**
   * Query card inventory using GET STATUS (GP 2.2 §11.4).
   *
   * @param p1 0x80 = ISD/SSD only, 0x40 = Applications & SDs, 0x20 = Executable Load Files, 0x10 = Executable Load Files & Executable Modules
   */
  public async getStatus(p1: number = 0x20, signal?: AbortSignal): Promise<GpInstalledElement[]> {
    this.checkAborted(signal)
    const results: GpInstalledElement[] = []

    // Search filter TLV: 0x4F 0x00 (all AIDs)
    const filter = new Uint8Array([0x4f, 0x00])
    let p2 = 0x00 // First or all occurrences

    while (true) {
      this.checkAborted(signal)
      const rawApdu = new Uint8Array([0x80, 0xf2, p1, p2, filter.length, ...filter, 0x00])
      const wrapped = this.wrapApdu(rawApdu)

      const resp = await this.reader.transmit(wrapped)
      if (resp.length < 2) {
        throw new Error(`GET STATUS failed: response too short (${resp.length} bytes)`)
      }

      const sw = (resp[resp.length - 2] << 8) | resp[resp.length - 1]
      if (sw === 0x6a88) {
        // Referenced data not found (empty inventory)
        break
      }
      if (sw !== 0x9000 && sw !== 0x6310) {
        // 0x6310 means more data available
        throw new Error(
          `GET STATUS (P1=0x${p1.toString(16)}) failed with Status Word: 0x${sw.toString(16).toUpperCase()}`
        )
      }

      const data = resp.subarray(0, resp.length - 2)
      let off = 0

      while (off < data.length) {
        if (off + 2 > data.length) break
        const aidLen = data[off]
        if (off + 1 + aidLen + 1 > data.length) break

        const aid = uint8ToHex(data.subarray(off + 1, off + 1 + aidLen)).toUpperCase()
        const lifeCycleState = data[off + 1 + aidLen]
        off += 1 + aidLen + 1

        let privileges: string | undefined
        let executableLoadFileAid: string | undefined
        let versionNumber: string | undefined

        // If P1 == 0x40 or 0x80 (Applets / SDs), privileges follows lifecycle
        if (p1 === 0x40 || p1 === 0x80) {
          if (off < data.length) {
            const privLen = data[off]
            if (off + 1 + privLen <= data.length) {
              privileges = uint8ToHex(data.subarray(off + 1, off + 1 + privLen))
              off += 1 + privLen
            }
          }
        }

        // If P1 == 0x10 (Executable modules), module format is: Executable Load File AID, Executable Module AID
        if (p1 === 0x10) {
          if (off < data.length) {
            const extraAidLen = data[off]
            if (off + 1 + extraAidLen <= data.length) {
              executableLoadFileAid = aid
              off += 1 + extraAidLen
            }
          }
        }

        results.push({
          aid,
          lifeCycleState,
          privileges,
          executableLoadFileAid,
          versionNumber,
        })
      }

      if (sw === 0x9000) {
        break
      }
      p2 = 0x01 // Get next occurrence
    }

    return results
  }

  /**
   * Inspect full card inventory across Executable Load Files, Modules, and Applets.
   */
  public async getCardInventory(signal?: AbortSignal): Promise<GpStatusResult> {
    const executableLoadFiles = await this.getStatus(0x20, signal)
    const executableModules = await this.getStatus(0x10, signal)
    const appletsAndSecurityDomains = await this.getStatus(0x40, signal)

    return {
      executableLoadFiles,
      executableModules,
      appletsAndSecurityDomains,
    }
  }

  /**
   * Delete an applet instance or package by AID.
   */
  public async delete(aid: string, deleteRelated = true, signal?: AbortSignal): Promise<void> {
    this.checkAborted(signal)
    const aidBytes = hexToUint8(aid)
    const data = new Uint8Array(2 + aidBytes.length)
    data[0] = 0x4f
    data[1] = aidBytes.length
    data.set(aidBytes, 2)

    const p2 = deleteRelated ? 0x80 : 0x00
    const rawApdu = new Uint8Array([0x80, 0xe4, 0x00, p2, data.length, ...data])
    const wrapped = this.wrapApdu(rawApdu)

    const resp = await this.reader.transmit(wrapped)
    this.assertSuccess(resp, `DELETE AID ${aid}`)
  }

  /**
   * Load and flash a compiled CAP file onto the card.
   */
  public async loadCap(
    capBytes: Uint8Array,
    packageAid: string,
    securityDomainAid: string = DEFAULT_ISD_AID,
    maxChunkSize: number = DEFAULT_MAX_LOAD_CHUNK_SIZE,
    onChunkProgress?: (bytesLoaded: number, totalBytes: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    this.checkAborted(signal)
    const pkgAidBytes = hexToUint8(packageAid)
    const isdAidBytes = hexToUint8(securityDomainAid)

    const effectiveChunkSize = Math.max(16, Math.min(maxChunkSize, ABSOLUTE_MAX_SAFE_LOAD_CHUNK_SIZE))
    const loadFileDataBlock = buildLoadFileDataBlock(capBytes)

    // 1. INSTALL [for load]
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

    // 2. Stream chunked LOAD APDUs
    let blockNumber = 0
    let capOffset = 0

    while (capOffset < loadFileDataBlock.length) {
      this.checkAborted(signal)
      const remaining = loadFileDataBlock.length - capOffset
      const chunkSize = Math.min(remaining, effectiveChunkSize)
      const isLastChunk = capOffset + chunkSize === loadFileDataBlock.length
      const p1 = isLastChunk ? 0x80 : 0x00

      const chunk = loadFileDataBlock.subarray(capOffset, capOffset + chunkSize)
      const loadApdu = new Uint8Array([0x80, 0xe8, p1, blockNumber & 0xff, chunk.length, ...chunk])
      const wrappedLoad = this.wrapApdu(loadApdu)

      if (wrappedLoad.length > 261) {
        throw new Error(`LOAD APDU block ${blockNumber} length (${wrappedLoad.length} bytes) exceeds short APDU limit!`)
      }

      const loadResp = await this.reader.transmit(wrappedLoad)
      this.assertSuccess(
        loadResp,
        `LOAD Block ${blockNumber} (${capOffset + chunkSize}/${loadFileDataBlock.length} bytes)`
      )

      capOffset += chunkSize
      blockNumber = (blockNumber + 1) & 0xff
      onChunkProgress?.(capOffset, loadFileDataBlock.length)
    }
  }

  /**
   * Instantiate an applet from an installed package and make it selectable.
   */
  public async installAndMakeSelectable(
    packageAid: string,
    moduleAid: string,
    instanceAid: string,
    privileges = '00',
    installParams = '',
    signal?: AbortSignal
  ): Promise<void> {
    this.checkAborted(signal)
    const pkgBytes = hexToUint8(packageAid)
    const modBytes = hexToUint8(moduleAid)
    const instBytes = hexToUint8(instanceAid)
    const privBytes = hexToUint8(privileges)
    const paramBytes = hexToUint8(installParams)

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

    const rawApdu = new Uint8Array([0x80, 0xe6, 0x0c, 0x00, data.length, ...data])
    const wrapped = this.wrapApdu(rawApdu)

    const resp = await this.reader.transmit(wrapped)
    this.assertSuccess(resp, `INSTALL [for install] Instance ${instanceAid}`)
  }

  private checkAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('GlobalPlatform operation aborted by user or signal')
    }
  }

  private wrapApdu(rawApdu: Uint8Array): Uint8Array {
    if (this.session) {
      return this.session.wrap(rawApdu)
    }
    return rawApdu
  }

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
