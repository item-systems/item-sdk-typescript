import { aesCbcEncrypt, calculateAesCmac, padIso9797M2 } from './crypto'
import { GpSecurityLevel } from './scp02'

/**
 * GlobalPlatform SCP03 Secure Channel Session.
 *
 * Implements standard GP 2.2/2.3 Amendment D (SCP03) mutual authentication,
 * NIST SP 800-108 KDF session key derivation (S-ENC, S-MAC, S-RMAC),
 * AES-CMAC command integrity, and AES-CBC command encryption.
 */
export class Scp03Session {
  private sEnc: Uint8Array
  private sMac: Uint8Array
  private sRMac: Uint8Array
  private sDek: Uint8Array
  private macIcv: Uint8Array
  private encryptionCounter: number
  private securityLevel: GpSecurityLevel
  private isDisposed = false

  constructor(
    sEnc: Uint8Array,
    sMac: Uint8Array,
    sRMac: Uint8Array,
    sDek: Uint8Array,
    securityLevel = GpSecurityLevel.C_MAC
  ) {
    this.sEnc = sEnc
    this.sMac = sMac
    this.sRMac = sRMac
    this.sDek = sDek
    this.securityLevel = securityLevel
    this.macIcv = new Uint8Array(16) // Zero initial 16-byte ICV
    this.encryptionCounter = 1
  }

  public getSecurityLevel(): GpSecurityLevel {
    return this.securityLevel
  }

  public setSecurityLevel(level: GpSecurityLevel): void {
    this.assertNotDisposed()
    this.securityLevel = level
  }

  /**
   * Securely zeroize all cryptographic session keys, MAC chaining buffers, and invalidate session.
   */
  public dispose(): void {
    if (this.isDisposed) {
      return
    }
    this.sEnc.fill(0)
    this.sMac.fill(0)
    this.sRMac.fill(0)
    this.sDek.fill(0)
    this.macIcv.fill(0)
    this.isDisposed = true
  }

  public disposed(): boolean {
    return this.isDisposed
  }

  private assertNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Scp03Session is disposed and can no longer be used')
    }
  }

  /**
   * Derive SCP03 session keys via NIST SP 800-108 KDF in Counter Mode with AES-CMAC.
   *
   * Per GP 2.3 Amendment D Section 4.1.5:
   * Derivation Data: Label (11B zero || constant 1B) || 0x00 || L (2B) || i (1B) || Context (hostChal || cardChal)
   *
   * For AES-128 (16B / 128-bit key), 1 iteration (i=1, 16 bytes) is produced.
   * For AES-192 (24B) or AES-256 (32B), multiple iterations (i=1, i=2...) are concatenated
   * and truncated to the required key length.
   */
  public static deriveSessionKeys(
    staticKey: Uint8Array,
    hostChallenge: Uint8Array,
    cardChallenge: Uint8Array
  ): { sEnc: Uint8Array; sMac: Uint8Array; sRMac: Uint8Array; sDek: Uint8Array } {
    const keyLenBits = staticKey.length * 8
    const lBytes = [(keyLenBits >> 8) & 0xff, keyLenBits & 0xff]

    const kdf = (constant: number): Uint8Array => {
      const neededBytes = staticKey.length
      const result = new Uint8Array(neededBytes)
      let generated = 0
      let counter = 1

      while (generated < neededBytes) {
        const data = new Uint8Array(11 + 1 + 1 + 2 + 1 + hostChallenge.length + cardChallenge.length)
        // 11 bytes of 0x00
        data[11] = constant
        data[12] = 0x00 // separator
        data[13] = lBytes[0]
        data[14] = lBytes[1]
        data[15] = counter & 0xff // counter i
        data.set(hostChallenge, 16)
        data.set(cardChallenge, 16 + hostChallenge.length)

        const block = calculateAesCmac(staticKey, data)
        const toCopy = Math.min(block.length, neededBytes - generated)
        result.set(block.subarray(0, toCopy), generated)
        generated += toCopy
        counter++
      }

      return result
    }

    // Constants from GP 2.3 Amendment D:
    // S-ENC: 0x04, S-MAC: 0x06, S-RMAC: 0x07, S-DEK: 0x08
    const sEnc = kdf(0x04)
    const sMac = kdf(0x06)
    const sRMac = kdf(0x07)
    const sDek = kdf(0x08)

    return { sEnc, sMac, sRMac, sDek }
  }

  /**
   * Calculate 8-byte Card Cryptogram for SCP03 verification.
   * Constant: 0x00 (Card cryptogram)
   */
  public static calculateCardCryptogram(
    sMac: Uint8Array,
    hostChallenge: Uint8Array,
    cardChallenge: Uint8Array
  ): Uint8Array {
    const context = new Uint8Array(hostChallenge.length + cardChallenge.length)
    context.set(hostChallenge, 0)
    context.set(cardChallenge, hostChallenge.length)

    const data = new Uint8Array(11 + 1 + 1 + 2 + 1 + context.length)
    data[11] = 0x00 // card cryptogram constant
    data[12] = 0x00
    data[13] = 0x00 // L = 64 bits (0x0040)
    data[14] = 0x40
    data[15] = 0x01
    data.set(context, 16)

    const cmac = calculateAesCmac(sMac, data)
    return cmac.slice(0, 8)
  }

  /**
   * Calculate 8-byte Host Cryptogram for EXTERNAL AUTHENTICATE.
   * Constant: 0x01 (Host cryptogram)
   */
  public static calculateHostCryptogram(
    sMac: Uint8Array,
    hostChallenge: Uint8Array,
    cardChallenge: Uint8Array
  ): Uint8Array {
    const context = new Uint8Array(hostChallenge.length + cardChallenge.length)
    context.set(hostChallenge, 0)
    context.set(cardChallenge, hostChallenge.length)

    const data = new Uint8Array(11 + 1 + 1 + 2 + 1 + context.length)
    data[11] = 0x01 // host cryptogram constant
    data[12] = 0x00
    data[13] = 0x00 // L = 64 bits (0x0040)
    data[14] = 0x40
    data[15] = 0x01
    data.set(context, 16)

    const cmac = calculateAesCmac(sMac, data)
    return cmac.slice(0, 8)
  }

  /**
   * Wrap a command APDU with SCP03 secure messaging.
   */
  public wrap(apdu: Uint8Array): Uint8Array {
    this.assertNotDisposed()
    if (this.securityLevel === GpSecurityLevel.NO_SECURITY_LEVEL) {
      return apdu
    }

    let cla = apdu[0]
    const ins = apdu[1]
    const p1 = apdu[2]
    const p2 = apdu[3]
    let data = apdu.length > 5 ? apdu.subarray(5, 5 + apdu[4]) : new Uint8Array(0)

    cla = (cla | 0x04) & 0xff

    // 1. Command Data Encryption
    const isEncrypted =
      (this.securityLevel & GpSecurityLevel.C_DECRYPTION_AND_C_MAC) === GpSecurityLevel.C_DECRYPTION_AND_C_MAC
    if (isEncrypted && data.length > 0) {
      const paddedData = padIso9797M2(data, 16)

      // Generate encryption IV from S-ENC and encryptionCounter
      const ivCounterBlock = new Uint8Array(16)
      ivCounterBlock[12] = (this.encryptionCounter >> 24) & 0xff
      ivCounterBlock[13] = (this.encryptionCounter >> 16) & 0xff
      ivCounterBlock[14] = (this.encryptionCounter >> 8) & 0xff
      ivCounterBlock[15] = this.encryptionCounter & 0xff

      const iv = aesCbcEncrypt(this.sEnc, new Uint8Array(16), ivCounterBlock)
      data = aesCbcEncrypt(this.sEnc, iv, paddedData)
      this.encryptionCounter++
    }

    // 2. Command MAC Calculation
    const isMaced = (this.securityLevel & GpSecurityLevel.C_MAC) === GpSecurityLevel.C_MAC
    if (isMaced) {
      const lcWithMac = data.length + 8
      const headerWithLc = new Uint8Array([cla, ins, p1, p2, lcWithMac])
      const macInput = new Uint8Array(this.macIcv.length + headerWithLc.length + data.length)
      macInput.set(this.macIcv, 0)
      macInput.set(headerWithLc, this.macIcv.length)
      macInput.set(data, this.macIcv.length + headerWithLc.length)

      const fullCmac = calculateAesCmac(this.sMac, macInput)
      this.macIcv = fullCmac // In SCP03, full CMAC becomes the next ICV
      const mac = fullCmac.slice(0, 8)

      const wrapped = new Uint8Array(headerWithLc.length + data.length + 8)
      wrapped.set(headerWithLc, 0)
      wrapped.set(data, headerWithLc.length)
      wrapped.set(mac, headerWithLc.length + data.length)
      return wrapped
    }

    const result = new Uint8Array(5 + data.length)
    result.set([cla, ins, p1, p2, data.length], 0)
    result.set(data, 5)
    return result
  }
}
