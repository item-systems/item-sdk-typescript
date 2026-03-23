/**
 * Contract invocation builders grouped by supported chain/runtime.
 *
 * These modules do not talk to the network directly. Instead they produce
 * `ContractInvocation` payloads that the higher-level `Item` facade submits via
 * Neon dAppKit. This separation keeps argument encoding, operation naming, and
 * contract ABI drift isolated from transport/session concerns.
 */
export * as neon3 from './neoN3'
