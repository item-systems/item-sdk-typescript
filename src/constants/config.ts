/**
 * Built-in RPC endpoints for supported Neo N3 environments.
 *
 * These values are convenience defaults for quick starts and examples.
 * Production integrators should still treat endpoint selection as an explicit
 * deployment concern and may wish to override them with their own managed RPC
 * infrastructure.
 */
export enum NeoN3NetworkOptions {
  LocalNet = 'http://127.0.0.1:50012',
  TestNet = 'https://testnet1.neo.coz.io:443',
  MainNet = 'https://mainnet1.neo.coz.io:443',
}

/**
 * Elliptic-curve identifiers understood by the ITEM contract.
 *
 * These numeric values are contract-facing ABI constants, not arbitrary SDK
 * enums, so callers should preserve them exactly when constructing low-level
 * invocations.
 */
export enum NeoN3EllipticCurves {
  SECP256K1SHA256 = 22,
  SECP256R1SHA256 = 23,
  SECP256K1KECCAK256 = 122,
  SECP256R1KECCAK256 = 123,
}

/**
 * Challenge mode identifiers used by ITEM authentication flows.
 *
 * The values are serialized as hex strings because they are passed through the
 * SDK into contract-facing byte payloads. The naming reflects the two supported
 * authentication families (ILS and HTLS) and whether the proof is permissive or
 * restrictive.
 */
export enum Challenges {
  ILS_PERMISSIVE = '01',
  ILS_RESTRICTIVE = '02',
  HTLS_PERMISSIVE = '03',
  HTLS_RESTRICTIVE = '04',
}
