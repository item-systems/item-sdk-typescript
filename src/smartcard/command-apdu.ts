import { Uint8 } from './byte'

/**
 * Base class for ISO-7816 command APDUs
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

  getHeader(): Uint8Array {
    return new Uint8Array([this._cla, this._ins, this._p1, this._p2])
  }

  getData(): Uint8Array {
    return this._data
  }

  toArray(): Uint8Array {
    return new Uint8Array([this._cla, this._ins, this._p1, this._p2, this._lc, ...this._data])
  }

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
 * SelectCommand selects an applet by its AID (Application Identifier).
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
 * OpenSecureChannel initiates establishing the secure channel by sharing
 * the off-card public key with the card.
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
 * MutuallyAuthenticate finalises establishing the secure channel by sharing
 * the authentication data to allow for verifying integrity and identity.
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
 * Requests the card to sign a message hash with SECP256R1.
 * The response contains a signature and public key for verification.
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
