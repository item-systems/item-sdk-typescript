import { createCipheriv, createDecipheriv } from 'crypto'

/**
 * Standard ISO/IEC 9797-1 padding method 2 (0x80 followed by zeros to block boundary).
 */
export function padIso9797M2(data: Uint8Array, blockSize = 8): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data, 0)
  padded[data.length] = 0x80
  return padded
}

/**
 * Unpad ISO/IEC 9797-1 padding method 2.
 */
export function unpadIso9797M2(padded: Uint8Array): Uint8Array {
  let i = padded.length - 1
  while (i >= 0 && padded[i] === 0x00) {
    i--
  }
  if (i < 0 || padded[i] !== 0x80) {
    throw new Error('Invalid ISO/IEC 9797-1 Method 2 padding')
  }
  const result = new Uint8Array(i)
  result.set(padded.subarray(0, i))
  return result
}

function bufferToUint8Array(buf: Buffer): Uint8Array {
  const out = new Uint8Array(buf.length)
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i]
  }
  return out
}

/**
 * Single-DES ECB encryption of 8 bytes via 3DES (K1 || K1 || K1).
 * Avoids OpenSSL 3.0 'des-ecb' legacy provider disablement issues.
 */
export function desEcbEncrypt(key: Uint8Array, block: Uint8Array): Uint8Array {
  const key24 = new Uint8Array(24)
  key24.set(key.subarray(0, 8), 0)
  key24.set(key.subarray(0, 8), 8)
  key24.set(key.subarray(0, 8), 16)
  return des3EcbEncrypt(key24, block)
}

/**
 * Single-DES ECB decryption of 8 bytes via 3DES (K1 || K1 || K1).
 */
export function desEcbDecrypt(key: Uint8Array, block: Uint8Array): Uint8Array {
  const key24 = new Uint8Array(24)
  key24.set(key.subarray(0, 8), 0)
  key24.set(key.subarray(0, 8), 8)
  key24.set(key.subarray(0, 8), 16)
  return des3EcbDecrypt(key24, block)
}

/**
 * Triple-DES (2-key 3DES / 3-key 3DES) ECB encryption.
 * Key must be 16 bytes (EDE2) or 24 bytes (EDE3).
 */
export function des3EcbEncrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const key24 = normalize3DesKey(key)
  const cipher = createCipheriv('des-ede3', Buffer.from(key24), null)
  cipher.setAutoPadding(false)
  const res = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()])
  return bufferToUint8Array(res)
}

/**
 * Triple-DES (2-key 3DES / 3-key 3DES) ECB decryption.
 */
export function des3EcbDecrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const key24 = normalize3DesKey(key)
  const decipher = createDecipheriv('des-ede3', Buffer.from(key24), null)
  decipher.setAutoPadding(false)
  const res = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()])
  return bufferToUint8Array(res)
}

/**
 * Triple-DES CBC encryption.
 */
export function des3CbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const key24 = normalize3DesKey(key)
  const cipher = createCipheriv('des-ede3-cbc', Buffer.from(key24), Buffer.from(iv))
  cipher.setAutoPadding(false)
  const res = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()])
  return bufferToUint8Array(res)
}

/**
 * Triple-DES CBC decryption.
 */
export function des3CbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const key24 = normalize3DesKey(key)
  const decipher = createDecipheriv('des-ede3-cbc', Buffer.from(key24), Buffer.from(iv))
  decipher.setAutoPadding(false)
  const res = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()])
  return bufferToUint8Array(res)
}

/**
 * ISO/IEC 9797-1 Algorithm 3 (Retail MAC / DES-EDE3 MAC) with standard ISO padding Method 2.
 * Used by GlobalPlatform SCP02.
 *
 * Algorithm:
 * - Single-DES CBC encrypt blocks 1..(N-1) using Key1 (first 8 bytes).
 * - Single-DES decrypt final block using Key2 (second 8 bytes).
 * - Single-DES encrypt result using Key1 (first 8 bytes).
 */
export function calculateRetailMac(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const key1 = key.subarray(0, 8)
  const key2 = key.subarray(8, 16)
  const padded = padIso9797M2(data, 8)

  const currentBlock = new Uint8Array(iv.length)
  for (let i = 0; i < iv.length; i++) {
    currentBlock[i] = iv[i]
  }

  const numBlocks = padded.length / 8

  for (let i = 0; i < numBlocks; i++) {
    const block = padded.subarray(i * 8, (i + 1) * 8)
    const xored = xorBytes(currentBlock, block)
    if (i < numBlocks - 1) {
      const enc = desEcbEncrypt(key1, xored)
      for (let j = 0; j < 8; j++) {
        currentBlock[j] = enc[j]
      }
    } else {
      // Last block: DES(Key1) -> DES^-1(Key2) -> DES(Key1)
      const step1 = desEcbEncrypt(key1, xored)
      const step2 = desEcbDecrypt(key2, step1)
      const step3 = desEcbEncrypt(key1, step2)
      for (let j = 0; j < 8; j++) {
        currentBlock[j] = step3[j]
      }
    }
  }

  const out = new Uint8Array(currentBlock.length)
  for (let i = 0; i < currentBlock.length; i++) {
    out[i] = currentBlock[i]
  }
  return out
}

/**
 * AES-128/192/256 CBC encryption.
 */
export function aesCbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, Buffer.from(key), Buffer.from(iv))
  cipher.setAutoPadding(false)
  const res = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()])
  return bufferToUint8Array(res)
}

/**
 * AES-128/192/256 CBC decryption.
 */
export function aesCbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const decipher = createDecipheriv(`aes-${key.length * 8}-cbc`, Buffer.from(key), Buffer.from(iv))
  decipher.setAutoPadding(false)
  const res = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()])
  return bufferToUint8Array(res)
}

/**
 * NIST SP 800-38B / RFC 4493 CMAC using AES.
 * Used by GlobalPlatform SCP03.
 */
export function calculateAesCmac(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 16
  const { k1, k2 } = generateCmacSubkeys(key)

  let nBlocks = Math.ceil(data.length / blockSize)
  let isComplete = false

  if (nBlocks === 0) {
    nBlocks = 1
    isComplete = false
  } else {
    isComplete = data.length % blockSize === 0
  }

  const lastBlockKey = isComplete ? k1 : k2
  const lastBlock = new Uint8Array(blockSize)

  if (isComplete) {
    const start = (nBlocks - 1) * blockSize
    lastBlock.set(data.subarray(start, start + blockSize))
  } else {
    const start = (nBlocks - 1) * blockSize
    const remainder = data.subarray(start)
    lastBlock.set(remainder)
    lastBlock[remainder.length] = 0x80
  }

  for (let i = 0; i < blockSize; i++) {
    lastBlock[i] ^= lastBlockKey[i]
  }

  const x = new Uint8Array(blockSize) // IV = 0
  for (let i = 0; i < nBlocks - 1; i++) {
    const block = data.subarray(i * blockSize, (i + 1) * blockSize)
    const y = xorBytes(x, block)
    const encY = desOrAesEcbBlockEncrypt(key, y)
    for (let j = 0; j < blockSize; j++) {
      x[j] = encY[j]
    }
  }

  const y = xorBytes(x, lastBlock)
  const res = desOrAesEcbBlockEncrypt(key, y)
  const out = new Uint8Array(res.length)
  for (let i = 0; i < res.length; i++) {
    out[i] = res[i]
  }
  return out
}

function desOrAesEcbBlockEncrypt(key: Uint8Array, block: Uint8Array): Uint8Array {
  const cipher = createCipheriv(`aes-${key.length * 8}-ecb`, Buffer.from(key), null)
  cipher.setAutoPadding(false)
  const res = Buffer.concat([cipher.update(Buffer.from(block)), cipher.final()])
  return bufferToUint8Array(res)
}

function generateCmacSubkeys(key: Uint8Array): { k1: Uint8Array; k2: Uint8Array } {
  const zeroBlock = new Uint8Array(16)
  const l = desOrAesEcbBlockEncrypt(key, zeroBlock)
  const constRb = 0x87

  const k1 = shiftLeftOneBit(l)
  if ((l[0] & 0x80) !== 0) {
    k1[15] ^= constRb
  }

  const k2 = shiftLeftOneBit(k1)
  if ((k1[0] & 0x80) !== 0) {
    k2[15] ^= constRb
  }

  return { k1, k2 }
}

function shiftLeftOneBit(input: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length)
  let carry = 0
  for (let i = input.length - 1; i >= 0; i--) {
    const nextCarry = input[i] & 0x80 ? 1 : 0
    out[i] = ((input[i] << 1) | carry) & 0xff
    carry = nextCarry
  }
  return out
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const len = Math.min(a.length, b.length)
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = a[i] ^ b[i]
  }
  return out
}

function normalize3DesKey(key: Uint8Array): Uint8Array {
  if (key.length === 16) {
    // 2-key 3DES (K1 || K2) -> expand to (K1 || K2 || K1) for 24-byte EDE3
    const key24 = new Uint8Array(24)
    key24.set(key, 0)
    key24.set(key.subarray(0, 8), 16)
    return key24
  }
  if (key.length === 24) {
    return key
  }
  throw new Error(`Invalid 3DES key length: ${key.length} bytes (expected 16 or 24)`)
}
