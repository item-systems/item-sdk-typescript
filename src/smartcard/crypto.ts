import { createCipheriv } from 'crypto'

/**
 * CBC-MAC with zero padding.
 *
 * Note: this is NOT NIST CMAC (RFC 4493)
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

  update(data: Uint8Array) {
    const newBuffer = new Uint8Array(this.buffer.length + data.length)
    newBuffer.set(this.buffer, 0)
    newBuffer.set(data, this.buffer.length)
    this.buffer = newBuffer
  }

  doFinal(): Uint8Array {
    let msg = this.buffer
    const rem = msg.length % this.blockSize
    if (rem !== 0) {
      const padded = new Uint8Array(msg.length + this.blockSize - rem)
      padded.set(msg)
      msg = padded
    }

    const iv = new Uint8Array(this.blockSize) // all zeros
    const cipher = createCipheriv(`aes-${this.key.length * 8}-cbc`, this.key, iv)
    cipher.setAutoPadding(false) // manual zero padding

    const ciphertext = Buffer.concat([cipher.update(msg), cipher.final()])

    const mac = ciphertext
      .subarray(ciphertext.length - this.blockSize, ciphertext.length)
      .subarray(0, this.macSizeBytes)

    this.buffer = new Uint8Array(0)
    return new Uint8Array(mac)
  }
}
