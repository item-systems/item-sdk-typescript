import { aesCbcEncrypt, aesCbcDecrypt, padIso9797M2, unpadIso9797M2 } from './globalplatform/crypto'

/**
 * Minimal CBC-MAC implementation used by the ITEM secure-channel protocol.
 *
 * This implementation uses AES-CBC with a zero IV and zero padding, then returns
 * the requested prefix of the final ciphertext block. It intentionally mirrors
 * the card firmware protocol and is not a general-purpose CMAC replacement.
 *
 * 100% portable pure TypeScript without Node 'crypto' or 'buffer'.
 */
export class CBCBlockCipherMac {
  private key: Uint8Array
  private macSizeBytes: number
  private blockSize: number
  private buffer: Uint8Array

  constructor(key: Uint8Array, macSizeBits = 128) {
    this.key = key
    this.macSizeBytes = macSizeBits / 8
    this.blockSize = 16 // AES block size
    this.buffer = new Uint8Array(0)
  }

  /**
   * Append message bytes to the MAC input buffer.
   */
  update(data: Uint8Array): void {
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer, 0)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
  }

  /**
   * Finalize the MAC and reset internal buffered state.
   */
  doFinal(): Uint8Array {
    let msg = this.buffer
    const rem = msg.length % this.blockSize
    if (rem !== 0) {
      const padded = new Uint8Array(msg.length + this.blockSize - rem)
      padded.set(msg)
      msg = padded
    } else if (msg.length === 0) {
      msg = new Uint8Array(this.blockSize)
    }

    const iv = new Uint8Array(this.blockSize) // all zeros
    const ciphertext = aesCbcEncrypt(this.key, iv, msg)

    const mac = ciphertext
      .subarray(ciphertext.length - this.blockSize, ciphertext.length)
      .subarray(0, this.macSizeBytes)

    this.buffer = new Uint8Array(0)
    return new Uint8Array(mac)
  }
}

export class Crypto {
  private key: Uint8Array
  private iv: Uint8Array
  private buffer: Uint8Array

  constructor(key: Uint8Array, iv: Uint8Array) {
    this.key = key
    this.iv = iv
    this.buffer = new Uint8Array(0)
  }

  public setIV(iv: Uint8Array): void {
    this.iv = iv
  }

  public getIV(): Uint8Array {
    return this.iv
  }

  public setKey(key: Uint8Array): void {
    this.key = key
  }

  public getKey(): Uint8Array {
    return this.key
  }

  public appendData(data: Uint8Array): void {
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer, 0)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
  }

  public getData(): Uint8Array {
    return this.buffer
  }

  public clearData(): void {
    this.buffer = new Uint8Array(0)
  }

  /**
   * Encrypt data with AES-CBC and ISO/IEC 9797-1 Method 2 padding.
   */
  public encrypt(data?: Uint8Array): Uint8Array {
    const msg = data || this.buffer
    const padded = padIso9797M2(msg, 16)
    return aesCbcEncrypt(this.key, this.iv, padded)
  }

  /**
   * Decrypt data with AES-CBC and ISO/IEC 9797-1 Method 2 unpadding.
   */
  public decrypt(data?: Uint8Array): Uint8Array {
    const ciphertext = data || this.buffer
    const decryptedPadded = aesCbcDecrypt(this.key, this.iv, ciphertext)
    return unpadIso9797M2(decryptedPadded)
  }
}
