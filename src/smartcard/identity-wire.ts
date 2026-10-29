import { AuthPolicy, IdentityInfo } from './types'

/** FFFF is a query-only selector for the authenticated session principal. */
export function validateIdentityId(uid: number, allowCurrent = false): void {
  if (!Number.isInteger(uid) || ((uid < 0 || uid > 127) && !(allowCurrent && uid === 0xffff)))
    throw new Error('Identity ID must be 0..127 (FFFF is query-only)')
}

export function validateIdentityPolicy(policy: number, threshold: number): void {
  if (
    !Number.isInteger(policy) ||
    policy < 1 ||
    policy > 3 ||
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > 4 ||
    (policy === AuthPolicy.ANY_OF && threshold !== 1)
  )
    throw new Error('Invalid identity policy or threshold')
}

export function validateCapabilities(capabilities: number): void {
  if (!Number.isInteger(capabilities) || capabilities < 0 || capabilities > 0xffff)
    throw new Error('Capabilities must be a 16-bit unsigned mask')
}

/** Strict seven-byte metadata response. Malformed success is not absence and
 * must never invent an ANY_OF policy or a default threshold. */
export function parseIdentityInfo(data: Uint8Array): IdentityInfo {
  if (data.length !== 7) throw new Error('Invalid identity response length')
  const uid = (data[0] << 8) | data[1]
  validateIdentityId(uid)
  validateIdentityPolicy(data[4], data[5])
  if (data[6] > 4) throw new Error('Invalid identity credential count')
  return {
    identityId: uid,
    active: true,
    capabilities: (data[2] << 8) | data[3],
    authPolicy: data[4],
    requiredThreshold: data[5],
    credentialCount: data[6],
    credentials: [],
  }
}
