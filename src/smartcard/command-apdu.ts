import { Uint8 } from './byte'

/**
 * Base representation of an ISO 7816 command APDU.
 *
 * The SDK models APDUs explicitly so higher-level reader and secure-channel
 * code can reason about header bytes, payload bytes, and serialization without
 * repeatedly hand-assembling buffers.
 */
export class CommandApdu {
  private static HEADER_LENGTH = 5
  private readonly _cla: Uint8
  private readonly _ins: Uint8
  private readonly _p1: Uint8
  private readonly _p2: Uint8
  private readonly _lc: Uint8
  private readonly _data: Uint8Array

  constructor(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array) {
    this._cla = cla
    this._ins = ins
    this._p1 = p1
    this._p2 = p2
    this._lc = lc
    this._data = data
  }

  /**
   * Return the 4-byte APDU header (`CLA`, `INS`, `P1`, `P2`).
   */
  getHeader(): Uint8Array {
    return new Uint8Array([this._cla, this._ins, this._p1, this._p2])
  }

  /**
   * Return the APDU data field without the header or `Lc` byte.
   */
  getData(): Uint8Array {
    return this._data
  }

  /**
   * Serialize the command into its wire-format byte array.
   */
  toArray(): Uint8Array {
    return new Uint8Array([this._cla, this._ins, this._p1, this._p2, this._lc, ...this._data])
  }

  /**
   * Parse a serialized command APDU into a concrete command instance.
   *
   * Subclasses can reuse this to round-trip their own type by calling
   * `Subclass.fromArray(...)`.
   */
  static fromArray<T extends CommandApdu>(
    this: new (cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array) => T,
    data: Uint8Array
  ): T {
    if (data.length < CommandApdu.HEADER_LENGTH) {
      throw new Error(`Insufficient data to parse header`)
    }

    const cla = data[0] as Uint8
    const ins = data[1] as Uint8
    const p1 = data[2] as Uint8
    const p2 = data[3] as Uint8
    const lc = data[4] as Uint8
    if (data.length < lc + CommandApdu.HEADER_LENGTH) {
      throw new Error(`Insufficient data. Expected ${lc} got ${data.length - CommandApdu.HEADER_LENGTH}`)
    }
    const arr = data.slice(CommandApdu.HEADER_LENGTH)
    return new this(cla, ins, p1, p2, lc, arr)
  }
}

/**
 * APDU for selecting an applet by AID (Application Identifier).
 *
 * This is typically the first command sent after a card connection is
 * established so the caller can enter the ITEM applet context and retrieve any
 * applet-specific response metadata.
 */
export class SelectCommand extends CommandApdu {
  static readonly CLA_SELECT = 0x00
  static readonly INS_SELECT = 0xa4
  static readonly SELECT_BY_AID = 0x04
  static readonly FIRST_OCCURRENCE = 0x00

  constructor(AID: Uint8Array) {
    super(
      SelectCommand.CLA_SELECT,
      SelectCommand.INS_SELECT,
      SelectCommand.SELECT_BY_AID,
      SelectCommand.FIRST_OCCURRENCE,
      AID.length as Uint8,
      AID
    )
  }
}

/**
 * APDU for initiating the ITEM secure-channel handshake.
 *
 * The off-card side sends its ephemeral public key to the card, which replies
 * with the randomness and IV material needed to derive session keys.
 */
export class OpenSecureChannel extends CommandApdu {
  static readonly CLA_PROPS_KEY = 0xa0
  static readonly INS_OPEN_SECURE_CHANNEL = 0x20
  static readonly FIXED_PAIRING_KEY_IDX = 0x00
  static readonly UNUSED = 0x00

  constructor(publicKey: Uint8Array) {
    super(
      OpenSecureChannel.CLA_PROPS_KEY,
      OpenSecureChannel.INS_OPEN_SECURE_CHANNEL,
      OpenSecureChannel.FIXED_PAIRING_KEY_IDX,
      OpenSecureChannel.UNUSED,
      publicKey.length as Uint8,
      publicKey
    )
  }
}

/**
 * APDU for finalizing mutual authentication during secure-channel setup.
 */
export class MutuallyAuthenticate extends CommandApdu {
  static readonly CLA_PROPS_KEY = 0xa0
  static readonly INS_MUTUALLY_AUTHENTICATE = 0x21
  static readonly UNUSED = 0x00

  constructor(data: Uint8Array) {
    super(
      MutuallyAuthenticate.CLA_PROPS_KEY,
      MutuallyAuthenticate.INS_MUTUALLY_AUTHENTICATE,
      MutuallyAuthenticate.UNUSED,
      MutuallyAuthenticate.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * APDU requesting the card to sign a message hash with its provisioned key.
 *
 * The corresponding response contains both the signature and the public key used
 * for verification so off-card callers can validate the result without relying
 * on external key lookup.
 */
export class SignCommand extends CommandApdu {
  static readonly CLA_PROPS_KEY = 0xa0
  static readonly INS_SIGN = 0x12
  static readonly UNUSED = 0x00

  constructor(messageHash: Uint8Array) {
    super(
      SignCommand.CLA_PROPS_KEY,
      SignCommand.INS_SIGN,
      SignCommand.UNUSED,
      SignCommand.UNUSED,
      messageHash.length as Uint8,
      messageHash
    )
  }
}
