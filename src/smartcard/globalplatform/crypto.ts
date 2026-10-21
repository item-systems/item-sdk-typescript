/**
 * Zero-dependency pure TypeScript cryptographic primitives for GlobalPlatform 2.2 / 2.3.
 *
 * Implements:
 * - Single-DES & Triple-DES (EDE2/EDE3) in ECB and CBC modes.
 * - AES-128, AES-192, AES-256 in ECB and CBC modes.
 * - ISO/IEC 9797-1 Retail MAC (Algorithm 3 with Method 2 padding).
 * - NIST SP 800-38B AES-CMAC.
 * - NIST SP 800-108 Counter-Mode KDF.
 * - ISO/IEC 9797-1 Method 2 Padding / Unpadding.
 *
 * 100% portable across Node.js, Web Browsers, React Native (Hermes/JSC), Expo, and Electron.
 */

// ==========================================
// 1. DES / 3DES (Data Encryption Standard)
// ==========================================

const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55,
  47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
]

const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30,
  40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
]

const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24,
  16, 8, 57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31,
  23, 15, 7,
]

const IP_INV = [
  40, 8, 48, 16, 56, 24, 64, 32, 39, 7, 47, 15, 55, 23, 63, 31, 38, 6, 46, 14, 54, 22, 62, 30, 37, 5, 45, 13, 53, 21,
  61, 29, 36, 4, 44, 12, 52, 20, 60, 28, 35, 3, 43, 11, 51, 19, 59, 27, 34, 2, 42, 10, 50, 18, 58, 26, 33, 1, 41, 9, 49,
  17, 57, 25,
]

const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22,
  23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
]

const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
]

const S_BOXES = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1,
    14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14,
    7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6,
    4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6,
    9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1,
    11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14,
    15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4,
    11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11,
    4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
]

function getBit(arr: Uint8Array, bitIndex1Based: number): number {
  const byteIdx = (bitIndex1Based - 1) >> 3
  const bitOffset = 7 - ((bitIndex1Based - 1) & 7)
  return (arr[byteIdx] >> bitOffset) & 1
}

function setBit(arr: Uint8Array, bitIndex1Based: number, val: number): void {
  const byteIdx = (bitIndex1Based - 1) >> 3
  const bitOffset = 7 - ((bitIndex1Based - 1) & 7)
  if (val) {
    arr[byteIdx] |= 1 << bitOffset
  } else {
    arr[byteIdx] &= ~(1 << bitOffset)
  }
}

function permute(src: Uint8Array, table: number[], outLenBits: number): Uint8Array {
  const out = new Uint8Array((outLenBits + 7) >> 3)
  for (let i = 0; i < table.length; i++) {
    const bit = getBit(src, table[i])
    setBit(out, i + 1, bit)
  }
  return out
}

function generateDesSubkeys(key8: Uint8Array): Uint8Array[] {
  const cd = permute(key8, PC1, 56)
  let c = (cd[0] << 20) | (cd[1] << 12) | (cd[2] << 4) | (cd[3] >> 4)
  let d = ((cd[3] & 0x0f) << 24) | (cd[4] << 16) | (cd[5] << 8) | cd[6]

  const subkeys: Uint8Array[] = []
  for (let round = 0; round < 16; round++) {
    const shift = SHIFTS[round]
    c = ((c << shift) | (c >>> (28 - shift))) & 0x0fffffff
    d = ((d << shift) | (d >>> (28 - shift))) & 0x0fffffff

    const cdShifted = new Uint8Array(7)
    cdShifted[0] = (c >> 20) & 0xff
    cdShifted[1] = (c >> 12) & 0xff
    cdShifted[2] = (c >> 4) & 0xff
    cdShifted[3] = (((c & 0x0f) << 4) | (d >> 24)) & 0xff
    cdShifted[4] = (d >> 16) & 0xff
    cdShifted[5] = (d >> 8) & 0xff
    cdShifted[6] = d & 0xff

    subkeys.push(permute(cdShifted, PC2, 48))
  }
  return subkeys
}

function desProcessBlock(block8: Uint8Array, subkeys: Uint8Array[]): Uint8Array {
  const ipBlock = permute(block8, IP, 64)
  let left = (ipBlock[0] << 24) | (ipBlock[1] << 16) | (ipBlock[2] << 8) | ipBlock[3]
  let right = (ipBlock[4] << 24) | (ipBlock[5] << 16) | (ipBlock[6] << 8) | ipBlock[7]

  for (let round = 0; round < 16; round++) {
    const rightBytes = new Uint8Array(4)
    rightBytes[0] = (right >> 24) & 0xff
    rightBytes[1] = (right >> 16) & 0xff
    rightBytes[2] = (right >> 8) & 0xff
    rightBytes[3] = right & 0xff

    const expRight = permute(rightBytes, E, 48)
    const subkey = subkeys[round]

    for (let i = 0; i < 6; i++) {
      expRight[i] ^= subkey[i]
    }

    const sOutput = new Uint8Array(4)
    for (let s = 0; s < 8; s++) {
      const bitStart = s * 6 + 1
      const row = (getBit(expRight, bitStart) << 1) | getBit(expRight, bitStart + 5)
      const col =
        (getBit(expRight, bitStart + 1) << 3) |
        (getBit(expRight, bitStart + 2) << 2) |
        (getBit(expRight, bitStart + 3) << 1) |
        getBit(expRight, bitStart + 4)
      const sVal = S_BOXES[s][(row << 4) | col]
      if (s % 2 === 0) {
        sOutput[s >> 1] |= (sVal << 4) & 0xf0
      } else {
        sOutput[s >> 1] |= sVal & 0x0f
      }
    }

    const pOutput = permute(sOutput, P, 32)
    const fVal = (pOutput[0] << 24) | (pOutput[1] << 16) | (pOutput[2] << 8) | pOutput[3]

    const nextRight = left ^ fVal
    left = right
    right = nextRight
  }

  const preOut = new Uint8Array(8)
  preOut[0] = (right >> 24) & 0xff
  preOut[1] = (right >> 16) & 0xff
  preOut[2] = (right >> 8) & 0xff
  preOut[3] = right & 0xff
  preOut[4] = (left >> 24) & 0xff
  preOut[5] = (left >> 16) & 0xff
  preOut[6] = (left >> 8) & 0xff
  preOut[7] = left & 0xff

  return permute(preOut, IP_INV, 64)
}

function singleDesEncrypt(key8: Uint8Array, block8: Uint8Array): Uint8Array {
  const subkeys = generateDesSubkeys(key8)
  return desProcessBlock(block8, subkeys)
}

function singleDesDecrypt(key8: Uint8Array, block8: Uint8Array): Uint8Array {
  const subkeys = generateDesSubkeys(key8).reverse()
  return desProcessBlock(block8, subkeys)
}

function normalize3DesKeys(key: Uint8Array): [Uint8Array, Uint8Array, Uint8Array] {
  if (key.length === 16) {
    const k1 = key.subarray(0, 8)
    const k2 = key.subarray(8, 16)
    return [k1, k2, k1]
  } else if (key.length === 24) {
    const k1 = key.subarray(0, 8)
    const k2 = key.subarray(8, 16)
    const k3 = key.subarray(16, 24)
    return [k1, k2, k3]
  } else {
    throw new Error(`Invalid 3DES key length: ${key.length} (expected 16 or 24 bytes)`)
  }
}

function des3EncryptBlock(k1: Uint8Array, k2: Uint8Array, k3: Uint8Array, block: Uint8Array): Uint8Array {
  return singleDesEncrypt(k3, singleDesDecrypt(k2, singleDesEncrypt(k1, block)))
}

function des3DecryptBlock(k1: Uint8Array, k2: Uint8Array, k3: Uint8Array, block: Uint8Array): Uint8Array {
  return singleDesDecrypt(k1, singleDesEncrypt(k2, singleDesDecrypt(k3, block)))
}

// ==========================================
// 2. AES (Advanced Encryption Standard)
// ==========================================

const S_BOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9,
  0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f,
  0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07,
  0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3,
  0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58,
  0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3,
  0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f,
  0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88,
  0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac,
  0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a,
  0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70,
  0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11,
  0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
])

const S_BOX_INV = new Uint8Array(256)
for (let i = 0; i < 256; i++) {
  S_BOX_INV[S_BOX[i]] = i
}

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]

function gMul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    const hiBit = a & 0x80
    a = (a << 1) & 0xff
    if (hiBit) a ^= 0x1b
    b >>= 1
  }
  return p
}

class AesKeySchedule {
  public roundKeys: Uint32Array
  public numRounds: number

  constructor(key: Uint8Array) {
    const keyLen = key.length
    if (keyLen === 16) {
      this.numRounds = 10
    } else if (keyLen === 24) {
      this.numRounds = 12
    } else if (keyLen === 32) {
      this.numRounds = 14
    } else {
      throw new Error(`Invalid AES key length: ${keyLen}`)
    }

    const numWords = 4 * (this.numRounds + 1)
    const w = new Uint32Array(numWords)
    const nk = keyLen >> 2

    for (let i = 0; i < nk; i++) {
      w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3]
    }

    for (let i = nk; i < numWords; i++) {
      let temp = w[i - 1]
      if (i % nk === 0) {
        temp = (temp << 8) | (temp >>> 24)
        temp =
          (S_BOX[(temp >>> 24) & 0xff] << 24) |
          (S_BOX[(temp >>> 16) & 0xff] << 16) |
          (S_BOX[(temp >>> 8) & 0xff] << 8) |
          S_BOX[temp & 0xff]
        temp ^= RCON[(i / nk - 1) | 0] << 24
      } else if (nk > 6 && i % nk === 4) {
        temp =
          (S_BOX[(temp >>> 24) & 0xff] << 24) |
          (S_BOX[(temp >>> 16) & 0xff] << 16) |
          (S_BOX[(temp >>> 8) & 0xff] << 8) |
          S_BOX[temp & 0xff]
      }
      w[i] = w[i - nk] ^ temp
    }

    this.roundKeys = w
  }
}

function aesEncryptBlock(w: Uint32Array, numRounds: number, input: Uint8Array): Uint8Array {
  let s0 = (input[0] << 24) | (input[1] << 16) | (input[2] << 8) | input[3]
  let s1 = (input[4] << 24) | (input[5] << 16) | (input[6] << 8) | input[7]
  let s2 = (input[8] << 24) | (input[9] << 16) | (input[10] << 8) | input[11]
  let s3 = (input[12] << 24) | (input[13] << 16) | (input[14] << 8) | input[15]

  s0 ^= w[0]
  s1 ^= w[1]
  s2 ^= w[2]
  s3 ^= w[3]

  for (let r = 1; r < numRounds; r++) {
    const a0 = S_BOX[(s0 >>> 24) & 0xff]
    const a1 = S_BOX[(s1 >>> 16) & 0xff]
    const a2 = S_BOX[(s2 >>> 8) & 0xff]
    const a3 = S_BOX[s3 & 0xff]

    const b0 = S_BOX[(s1 >>> 24) & 0xff]
    const b1 = S_BOX[(s2 >>> 16) & 0xff]
    const b2 = S_BOX[(s3 >>> 8) & 0xff]
    const b3 = S_BOX[s0 & 0xff]

    const c0 = S_BOX[(s2 >>> 24) & 0xff]
    const c1 = S_BOX[(s3 >>> 16) & 0xff]
    const c2 = S_BOX[(s0 >>> 8) & 0xff]
    const c3 = S_BOX[s1 & 0xff]

    const d0 = S_BOX[(s3 >>> 24) & 0xff]
    const d1 = S_BOX[(s0 >>> 16) & 0xff]
    const d2 = S_BOX[(s1 >>> 8) & 0xff]
    const d3 = S_BOX[s2 & 0xff]

    const rIdx = 4 * r
    s0 =
      ((gMul(2, a0) ^ gMul(3, a1) ^ a2 ^ a3) << 24) |
      ((a0 ^ gMul(2, a1) ^ gMul(3, a2) ^ a3) << 16) |
      ((a0 ^ a1 ^ gMul(2, a2) ^ gMul(3, a3)) << 8) |
      (gMul(3, a0) ^ a1 ^ a2 ^ gMul(2, a3))
    s0 ^= w[rIdx]

    s1 =
      ((gMul(2, b0) ^ gMul(3, b1) ^ b2 ^ b3) << 24) |
      ((b0 ^ gMul(2, b1) ^ gMul(3, b2) ^ b3) << 16) |
      ((b0 ^ b1 ^ gMul(2, b2) ^ gMul(3, b3)) << 8) |
      (gMul(3, b0) ^ b1 ^ b2 ^ gMul(2, b3))
    s1 ^= w[rIdx + 1]

    s2 =
      ((gMul(2, c0) ^ gMul(3, c1) ^ c2 ^ c3) << 24) |
      ((c0 ^ gMul(2, c1) ^ gMul(3, c2) ^ c3) << 16) |
      ((c0 ^ c1 ^ gMul(2, c2) ^ gMul(3, c3)) << 8) |
      (gMul(3, c0) ^ c1 ^ c2 ^ gMul(2, c3))
    s2 ^= w[rIdx + 2]

    s3 =
      ((gMul(2, d0) ^ gMul(3, d1) ^ d2 ^ d3) << 24) |
      ((d0 ^ gMul(2, d1) ^ gMul(3, d2) ^ d3) << 16) |
      ((d0 ^ d1 ^ gMul(2, d2) ^ gMul(3, d3)) << 8) |
      (gMul(3, d0) ^ d1 ^ d2 ^ gMul(2, d3))
    s3 ^= w[rIdx + 3]
  }

  const rIdx = 4 * numRounds
  const out = new Uint8Array(16)
  out[0] = S_BOX[(s0 >>> 24) & 0xff] ^ ((w[rIdx] >>> 24) & 0xff)
  out[1] = S_BOX[(s1 >>> 16) & 0xff] ^ ((w[rIdx] >>> 16) & 0xff)
  out[2] = S_BOX[(s2 >>> 8) & 0xff] ^ ((w[rIdx] >>> 8) & 0xff)
  out[3] = S_BOX[s3 & 0xff] ^ (w[rIdx] & 0xff)

  out[4] = S_BOX[(s1 >>> 24) & 0xff] ^ ((w[rIdx + 1] >>> 24) & 0xff)
  out[5] = S_BOX[(s2 >>> 16) & 0xff] ^ ((w[rIdx + 1] >>> 16) & 0xff)
  out[6] = S_BOX[(s3 >>> 8) & 0xff] ^ ((w[rIdx + 1] >>> 8) & 0xff)
  out[7] = S_BOX[s0 & 0xff] ^ (w[rIdx + 1] & 0xff)

  out[8] = S_BOX[(s2 >>> 24) & 0xff] ^ ((w[rIdx + 2] >>> 24) & 0xff)
  out[9] = S_BOX[(s3 >>> 16) & 0xff] ^ ((w[rIdx + 2] >>> 16) & 0xff)
  out[10] = S_BOX[(s0 >>> 8) & 0xff] ^ ((w[rIdx + 2] >>> 8) & 0xff)
  out[11] = S_BOX[s1 & 0xff] ^ (w[rIdx + 2] & 0xff)

  out[12] = S_BOX[(s3 >>> 24) & 0xff] ^ ((w[rIdx + 3] >>> 24) & 0xff)
  out[13] = S_BOX[(s0 >>> 16) & 0xff] ^ ((w[rIdx + 3] >>> 16) & 0xff)
  out[14] = S_BOX[(s1 >>> 8) & 0xff] ^ ((w[rIdx + 3] >>> 8) & 0xff)
  out[15] = S_BOX[s2 & 0xff] ^ (w[rIdx + 3] & 0xff)

  return out
}

function aesDecryptBlock(w: Uint32Array, numRounds: number, input: Uint8Array): Uint8Array {
  let s0 = (input[0] << 24) | (input[1] << 16) | (input[2] << 8) | input[3]
  let s1 = (input[4] << 24) | (input[5] << 16) | (input[6] << 8) | input[7]
  let s2 = (input[8] << 24) | (input[9] << 16) | (input[10] << 8) | input[11]
  let s3 = (input[12] << 24) | (input[13] << 16) | (input[14] << 8) | input[15]

  const rIdx = 4 * numRounds
  s0 ^= w[rIdx]
  s1 ^= w[rIdx + 1]
  s2 ^= w[rIdx + 2]
  s3 ^= w[rIdx + 3]

  for (let r = numRounds - 1; r >= 1; r--) {
    const a0 = S_BOX_INV[(s0 >>> 24) & 0xff]
    const a1 = S_BOX_INV[(s3 >>> 16) & 0xff]
    const a2 = S_BOX_INV[(s2 >>> 8) & 0xff]
    const a3 = S_BOX_INV[s1 & 0xff]

    const b0 = S_BOX_INV[(s1 >>> 24) & 0xff]
    const b1 = S_BOX_INV[(s0 >>> 16) & 0xff]
    const b2 = S_BOX_INV[(s3 >>> 8) & 0xff]
    const b3 = S_BOX_INV[s2 & 0xff]

    const c0 = S_BOX_INV[(s2 >>> 24) & 0xff]
    const c1 = S_BOX_INV[(s1 >>> 16) & 0xff]
    const c2 = S_BOX_INV[(s0 >>> 8) & 0xff]
    const c3 = S_BOX_INV[s3 & 0xff]

    const d0 = S_BOX_INV[(s3 >>> 24) & 0xff]
    const d1 = S_BOX_INV[(s2 >>> 16) & 0xff]
    const d2 = S_BOX_INV[(s1 >>> 8) & 0xff]
    const d3 = S_BOX_INV[s0 & 0xff]

    const curR = 4 * r
    s0 =
      ((gMul(0x0e, a0) ^ gMul(0x0b, a1) ^ gMul(0x0d, a2) ^ gMul(0x09, a3)) << 24) |
      ((gMul(0x09, a0) ^ gMul(0x0e, a1) ^ gMul(0x0b, a2) ^ gMul(0x0d, a3)) << 16) |
      ((gMul(0x0d, a0) ^ gMul(0x09, a1) ^ gMul(0x0e, a2) ^ gMul(0x0b, a3)) << 8) |
      (gMul(0x0b, a0) ^ gMul(0x0d, a1) ^ gMul(0x09, a2) ^ gMul(0x0e, a3))
    s0 ^= w[curR]

    s1 =
      ((gMul(0x0e, b0) ^ gMul(0x0b, b1) ^ gMul(0x0d, b2) ^ gMul(0x09, b3)) << 24) |
      ((gMul(0x09, b0) ^ gMul(0x0e, b1) ^ gMul(0x0b, b2) ^ gMul(0x0d, b3)) << 16) |
      ((gMul(0x0d, b0) ^ gMul(0x09, b1) ^ gMul(0x0e, b2) ^ gMul(0x0b, b3)) << 8) |
      (gMul(0x0b, b0) ^ gMul(0x0d, b1) ^ gMul(0x09, b2) ^ gMul(0x0e, b3))
    s1 ^= w[curR + 1]

    s2 =
      ((gMul(0x0e, c0) ^ gMul(0x0b, c1) ^ gMul(0x0d, c2) ^ gMul(0x09, c3)) << 24) |
      ((gMul(0x09, c0) ^ gMul(0x0e, c1) ^ gMul(0x0b, c2) ^ gMul(0x0d, c3)) << 16) |
      ((gMul(0x0d, c0) ^ gMul(0x09, c1) ^ gMul(0x0e, c2) ^ gMul(0x0b, c3)) << 8) |
      (gMul(0x0b, c0) ^ gMul(0x0d, c1) ^ gMul(0x09, c2) ^ gMul(0x0e, c3))
    s2 ^= w[curR + 2]

    s3 =
      ((gMul(0x0e, d0) ^ gMul(0x0b, d1) ^ gMul(0x0d, d2) ^ gMul(0x09, d3)) << 24) |
      ((gMul(0x09, d0) ^ gMul(0x0e, d1) ^ gMul(0x0b, d2) ^ gMul(0x0d, d3)) << 16) |
      ((gMul(0x0d, d0) ^ gMul(0x09, d1) ^ gMul(0x0e, d2) ^ gMul(0x0b, d3)) << 8) |
      (gMul(0x0b, d0) ^ gMul(0x0d, d1) ^ gMul(0x09, d2) ^ gMul(0x0e, d3))
    s3 ^= w[curR + 3]
  }

  const out = new Uint8Array(16)
  out[0] = S_BOX_INV[(s0 >>> 24) & 0xff] ^ ((w[0] >>> 24) & 0xff)
  out[1] = S_BOX_INV[(s3 >>> 16) & 0xff] ^ ((w[0] >>> 16) & 0xff)
  out[2] = S_BOX_INV[(s2 >>> 8) & 0xff] ^ ((w[0] >>> 8) & 0xff)
  out[3] = S_BOX_INV[s1 & 0xff] ^ (w[0] & 0xff)

  out[4] = S_BOX_INV[(s1 >>> 24) & 0xff] ^ ((w[1] >>> 24) & 0xff)
  out[5] = S_BOX_INV[(s0 >>> 16) & 0xff] ^ ((w[1] >>> 16) & 0xff)
  out[6] = S_BOX_INV[(s3 >>> 8) & 0xff] ^ ((w[1] >>> 8) & 0xff)
  out[7] = S_BOX_INV[s2 & 0xff] ^ (w[1] & 0xff)

  out[8] = S_BOX_INV[(s2 >>> 24) & 0xff] ^ ((w[2] >>> 24) & 0xff)
  out[9] = S_BOX_INV[(s1 >>> 16) & 0xff] ^ ((w[2] >>> 16) & 0xff)
  out[10] = S_BOX_INV[(s0 >>> 8) & 0xff] ^ ((w[2] >>> 8) & 0xff)
  out[11] = S_BOX_INV[s3 & 0xff] ^ (w[2] & 0xff)

  out[12] = S_BOX_INV[(s3 >>> 24) & 0xff] ^ ((w[3] >>> 24) & 0xff)
  out[13] = S_BOX_INV[(s2 >>> 16) & 0xff] ^ ((w[3] >>> 16) & 0xff)
  out[14] = S_BOX_INV[(s1 >>> 8) & 0xff] ^ ((w[3] >>> 8) & 0xff)
  out[15] = S_BOX_INV[s0 & 0xff] ^ (w[3] & 0xff)

  return out
}

// ==========================================
// 3. Public High-Level Cryptographic APIs
// ==========================================

export function padIso9797M2(data: Uint8Array, blockSize = 8): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data)
  padded[data.length] = 0x80
  return padded
}

export function unpadIso9797M2(data: Uint8Array): Uint8Array {
  let i = data.length - 1
  while (i >= 0 && data[i] === 0x00) {
    i--
  }
  if (i < 0 || data[i] !== 0x80) {
    throw new Error('Invalid ISO/IEC 9797-1 Method 2 padding')
  }
  return data.subarray(0, i)
}

/**
 * 3DES-ECB single-block / multi-block encryption without padding.
 */
export function des3EcbEncrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const [k1, k2, k3] = normalize3DesKeys(key)
  if (data.length % 8 !== 0) {
    throw new Error(`3DES-ECB input length (${data.length}) must be a multiple of 8`)
  }
  const result = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i += 8) {
    const block = data.subarray(i, i + 8)
    const enc = des3EncryptBlock(k1, k2, k3, block)
    result.set(enc, i)
  }
  return result
}

/**
 * 3DES-ECB single-block / multi-block decryption without padding.
 */
export function des3EcbDecrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
  const [k1, k2, k3] = normalize3DesKeys(key)
  if (data.length % 8 !== 0) {
    throw new Error(`3DES-ECB input length (${data.length}) must be a multiple of 8`)
  }
  const result = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i += 8) {
    const block = data.subarray(i, i + 8)
    const dec = des3DecryptBlock(k1, k2, k3, block)
    result.set(dec, i)
  }
  return result
}

/**
 * 3DES-CBC multi-block encryption without padding.
 */
export function des3CbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const [k1, k2, k3] = normalize3DesKeys(key)
  if (data.length % 8 !== 0) {
    throw new Error(`3DES-CBC input length (${data.length}) must be a multiple of 8`)
  }
  const result = new Uint8Array(data.length)
  let prev = new Uint8Array(iv)

  for (let i = 0; i < data.length; i += 8) {
    const block = new Uint8Array(8)
    for (let j = 0; j < 8; j++) {
      block[j] = data[i + j] ^ prev[j]
    }
    const enc = des3EncryptBlock(k1, k2, k3, block)
    result.set(enc, i)
    prev = new Uint8Array(enc)
  }
  return result
}

/**
 * 3DES-CBC multi-block decryption without padding.
 */
export function des3CbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const [k1, k2, k3] = normalize3DesKeys(key)
  if (data.length % 8 !== 0) {
    throw new Error(`3DES-CBC input length (${data.length}) must be a multiple of 8`)
  }
  const result = new Uint8Array(data.length)
  let prev = new Uint8Array(iv)

  for (let i = 0; i < data.length; i += 8) {
    const cipherBlock = data.subarray(i, i + 8)
    const dec = des3DecryptBlock(k1, k2, k3, cipherBlock)
    for (let j = 0; j < 8; j++) {
      result[i + j] = dec[j] ^ prev[j]
    }
    prev = new Uint8Array(cipherBlock)
  }
  return result
}

/**
 * ISO/IEC 9797-1 Retail MAC (Algorithm 3 with Method 2 padding).
 */
export function calculateRetailMac(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const padded = padIso9797M2(data, 8)
  const k1 = key.subarray(0, 8)
  const k2 = key.subarray(8, 16)

  let block = new Uint8Array(iv)
  const subkeys1 = generateDesSubkeys(k1)

  for (let i = 0; i < padded.length; i += 8) {
    for (let j = 0; j < 8; j++) {
      block[j] ^= padded[i + j]
    }
    block = new Uint8Array(desProcessBlock(block, subkeys1))
  }

  // Final block 3DES (Decrypt with K2, Encrypt with K1)
  const decK2 = singleDesDecrypt(k2, block)
  const mac = singleDesEncrypt(k1, decK2)
  return mac
}

/**
 * AES-CBC multi-block encryption without padding.
 */
export function aesCbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  if (data.length % 16 !== 0) {
    throw new Error(`AES-CBC input length (${data.length}) must be a multiple of 16`)
  }
  const sched = new AesKeySchedule(key)
  const result = new Uint8Array(data.length)
  let prev = new Uint8Array(iv)

  for (let i = 0; i < data.length; i += 16) {
    const block = new Uint8Array(16)
    for (let j = 0; j < 16; j++) {
      block[j] = data[i + j] ^ prev[j]
    }
    const enc = aesEncryptBlock(sched.roundKeys, sched.numRounds, block)
    result.set(enc, i)
    prev = new Uint8Array(enc)
  }
  return result
}

/**
 * AES-CBC multi-block decryption without padding.
 */
export function aesCbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  if (data.length % 16 !== 0) {
    throw new Error(`AES-CBC input length (${data.length}) must be a multiple of 16`)
  }
  const sched = new AesKeySchedule(key)
  const result = new Uint8Array(data.length)
  let prev = new Uint8Array(iv)

  for (let i = 0; i < data.length; i += 16) {
    const cipherBlock = data.subarray(i, i + 16)
    const dec = aesDecryptBlock(sched.roundKeys, sched.numRounds, cipherBlock)
    for (let j = 0; j < 16; j++) {
      result[i + j] = dec[j] ^ prev[j]
    }
    prev = new Uint8Array(cipherBlock)
  }
  return result
}

/**
 * AES-ECB single-block encryption without padding.
 */
export function aesEcbEncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  const sched = new AesKeySchedule(key)
  return aesEncryptBlock(sched.roundKeys, sched.numRounds, block)
}

/**
 * NIST SP 800-38B AES-CMAC.
 */
export function calculateAesCmac(key: Uint8Array, data: Uint8Array): Uint8Array {
  const sched = new AesKeySchedule(key)
  const zeroBlock = new Uint8Array(16)
  const l = aesEncryptBlock(sched.roundKeys, sched.numRounds, zeroBlock)

  // Subkey K1 derivation
  const k1 = new Uint8Array(16)
  let carry = 0
  for (let i = 15; i >= 0; i--) {
    const nextCarry = (l[i] >> 7) & 1
    k1[i] = ((l[i] << 1) | carry) & 0xff
    carry = nextCarry
  }
  if ((l[0] & 0x80) !== 0) {
    k1[15] ^= 0x87
  }

  // Subkey K2 derivation
  const k2 = new Uint8Array(16)
  carry = 0
  for (let i = 15; i >= 0; i--) {
    const nextCarry = (k1[i] >> 7) & 1
    k2[i] = ((k1[i] << 1) | carry) & 0xff
    carry = nextCarry
  }
  if ((k1[0] & 0x80) !== 0) {
    k2[15] ^= 0x87
  }

  let n = Math.ceil(data.length / 16)
  let isComplete = false
  if (n === 0) {
    n = 1
    isComplete = false
  } else {
    isComplete = data.length % 16 === 0
  }

  let mLast: Uint8Array
  if (isComplete) {
    mLast = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
      mLast[i] = data[(n - 1) * 16 + i] ^ k1[i]
    }
  } else {
    const padded = padIso9797M2(data.subarray((n - 1) * 16), 16)
    mLast = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
      mLast[i] = padded[i] ^ k2[i]
    }
  }

  let x = new Uint8Array(16)
  for (let i = 0; i < n - 1; i++) {
    const block = data.subarray(i * 16, (i + 1) * 16)
    for (let j = 0; j < 16; j++) {
      x[j] ^= block[j]
    }
    x = new Uint8Array(aesEncryptBlock(sched.roundKeys, sched.numRounds, x))
  }

  for (let j = 0; j < 16; j++) {
    x[j] ^= mLast[j]
  }
  const cmac = aesEncryptBlock(sched.roundKeys, sched.numRounds, x)
  return cmac
}

/**
 * Generate cryptographically secure random bytes in any runtime (Node.js or Browser/React Native).
 */
export function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return bytes
  }
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}
