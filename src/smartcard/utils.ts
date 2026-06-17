import { bytesToHex, hexToBytes, concatBytes, randomBytes as NobleRandomBytes } from '@noble/curves/utils'

/**
 * Convert binary data into its lowercase hex string representation.
 *
 * This helper is used throughout the smartcard and contract-authentication code
 * when bridging between byte-oriented protocol payloads and SDK-facing string
 * parameters.
 */
export function uint8ToHex(data: Uint8Array): string {
  return bytesToHex(data)
}

/**
 * Parse a hex string into raw bytes.
 *
 * The input must already be normalized as valid hex; invalid strings will throw
 * from the underlying utility implementation.
 */
export function hexToUint8(data: string): Uint8Array {
  return hexToBytes(data)
}

/**
 * Concatenate two or more byte arrays into a single contiguous buffer.
 */
export function concatUint8(a: Uint8Array, b: Uint8Array, ...rest: Uint8Array[]): Uint8Array {
  let result = concatBytes(a, b)
  for (const arr of rest) {
    result = concatBytes(result, arr)
  }
  return result
}

/**
 * Generate cryptographically secure random bytes.
 *
 * Used for secure-channel nonces, ephemeral material, and challenge payloads.
 */
export function randomUint8(size: number): Uint8Array {
  return NobleRandomBytes(size)
}

/**
 * Compare two byte arrays for exact equality.
 */
export function uint8Equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
