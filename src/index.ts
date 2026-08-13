/**
 * Package entrypoint for the ITEM TypeScript SDK.
 *
 * Exposes the main high-level SDK facade, shared helpers, public type surface,
 * and contract/network constants from a single import path.
 */
export * from './Item'
export * from './helpers'
/** Additive direct type imports; the `types.*` namespace remains supported for compatibility. */
export type * from './types'
export { AuthChallenge } from './types'
export * as smartcard from './smartcard'
export * as abi from './abi'
export * as types from './types'
export * as constants from './constants'
