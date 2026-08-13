/** @internal Type-level range builder used only to define {@link Uint8}. */
type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

/**
 * Type-level representation of one unsigned byte (`0..255`).
 *
 * @ignore
 */
export type Uint8 = Enumerate<256>
