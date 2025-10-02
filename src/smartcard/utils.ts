import { bytesToHex, hexToBytes, concatBytes } from '@noble/curves/abstract/utils'
import { randomBytes as NobleRandomBytes } from '@noble/hashes/utils'

/**
 * Convert a Uint8Array into a hex string.
 * @param data
 */
export function uint8ToHex(data: Uint8Array): string {
  return bytesToHex(data)
}

/**
 * Parse a hex string into a Uint8Array.
 * @param data
 */
export function hexToUint8(data: string): Uint8Array {
  return hexToBytes(data)
}

/**
 * Concatenate 2 or more Uint8Arrays.
 * @param a
 * @param b
 * @param rest
 */
export function concatUint8(a: Uint8Array, b: Uint8Array, ...rest: Uint8Array[]): Uint8Array {
  let result = concatBytes(a, b)
  for (const arr of rest) {
    result = concatBytes(result, arr)
  }
  return result
}

/**
 * Create an array of `size` with random numbers.
 * @param size
 */
export function randomUint8(size: number): Uint8Array {
  return NobleRandomBytes(size)
}

/**
 * Deep equal Uint8Arrays.
 * @param a
 * @param b
 */
export function uint8Equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
