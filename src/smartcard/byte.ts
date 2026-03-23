type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>

/**
 * Type-level representation of a single unsigned byte.
 *
 * This narrows values to the inclusive range `0..255`, which makes APDU and
 * protocol helper signatures self-documenting and catches accidental out-of-
 * range literals at compile time.
 */
export type Uint8 = Enumerate<256>
