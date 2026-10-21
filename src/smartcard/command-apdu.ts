import { Uint8 } from './byte'
import { AuthPolicy, AuthCredentialType } from './types'

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

/**
 * APDU for tunneling inner management/cryptographic commands through the E2E encrypted secure channel.
 */
export class TunnelCommand extends CommandApdu {
  static readonly CLA_PROPS_KEY = 0xa0
  static readonly INS_TUNNEL = 0x30
  static readonly UNUSED = 0x00

  constructor(innerApdu: Uint8Array) {
    super(
      TunnelCommand.CLA_PROPS_KEY,
      TunnelCommand.INS_TUNNEL,
      TunnelCommand.UNUSED,
      TunnelCommand.UNUSED,
      innerApdu.length as Uint8,
      innerApdu
    )
  }
}

/**
 * Inner APDU requesting MasterKey metadata statistics.
 */
export class MasterKeyStatsCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_MASTERKEY_STATS = 0x15
  static readonly UNUSED = 0x00

  constructor() {
    super(
      MasterKeyStatsCommand.CLA_INNER,
      MasterKeyStatsCommand.INS_MASTERKEY_STATS,
      MasterKeyStatsCommand.UNUSED,
      MasterKeyStatsCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for setting attribute flags (such as deprecation) on a MasterKey slot.
 */
export class MasterKeySetPolicyCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_MASTERKEY_SET_POLICY = 0x24
  static readonly UNUSED = 0x00

  constructor(slotId: number, flags: number) {
    const data = new Uint8Array([(flags >> 8) & 0xff, flags & 0xff])
    super(
      MasterKeySetPolicyCommand.CLA_INNER,
      MasterKeySetPolicyCommand.INS_MASTERKEY_SET_POLICY,
      slotId as Uint8,
      MasterKeySetPolicyCommand.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for deleting a MasterKey slot.
 */
export class MasterKeyDeleteCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_MASTERKEY_DELETE = 0x19
  static readonly UNUSED = 0x00

  constructor(slotId: number) {
    super(
      MasterKeyDeleteCommand.CLA_INNER,
      MasterKeyDeleteCommand.INS_MASTERKEY_DELETE,
      slotId as Uint8,
      MasterKeyDeleteCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for setting attribute flags (such as deprecation) on a KeyRing slot.
 */
export class KeyRingSetPolicyCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_KEYRING_SET_POLICY = 0x6b
  static readonly UNUSED = 0x00

  constructor(ringId: number, flags: number) {
    const data = new Uint8Array([(flags >> 8) & 0xff, flags & 0xff])
    super(
      KeyRingSetPolicyCommand.CLA_INNER,
      KeyRingSetPolicyCommand.INS_KEYRING_SET_POLICY,
      ringId as Uint8,
      KeyRingSetPolicyCommand.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for deleting a KeyRing slot.
 */
export class KeyRingDeleteCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_KEYRING_DELETE = 0x6a
  static readonly UNUSED = 0x00

  constructor(ringId: number) {
    super(
      KeyRingDeleteCommand.CLA_INNER,
      KeyRingDeleteCommand.INS_KEYRING_DELETE,
      ringId as Uint8,
      KeyRingDeleteCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for deriving a KeyRing from a MasterKey slot.
 */
export class KeyRingDeriveCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_KEYRING_DERIVE = 0x13

  constructor(cryptoEngine: number, masterKeySlot: number, path: Uint8Array) {
    super(
      KeyRingDeriveCommand.CLA_INNER,
      KeyRingDeriveCommand.INS_KEYRING_DERIVE,
      cryptoEngine as Uint8,
      masterKeySlot as Uint8,
      path.length as Uint8,
      path
    )
  }
}

/**
 * Inner APDU for registering an SIO plugin in the microkernel's PluginRegistry (INS 0x40).
 */
export class PluginRegisterCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PLUGIN_REGISTER = 0x40
  static readonly UNUSED = 0x00

  constructor(aid: Uint8Array, uid: number, gid = 1, mode = 0x01ed, quotaBlocks = 10) {
    const data = new Uint8Array(1 + aid.length + 2 + 2 + 2 + 2)
    data[0] = aid.length
    data.set(aid, 1)
    let off = 1 + aid.length
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    view.setUint16(off, uid)
    off += 2
    view.setUint16(off, gid)
    off += 2
    view.setUint16(off, mode)
    off += 2
    view.setUint16(off, quotaBlocks)

    super(
      PluginRegisterCommand.CLA_INNER,
      PluginRegisterCommand.INS_PLUGIN_REGISTER,
      PluginRegisterCommand.UNUSED,
      PluginRegisterCommand.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for querying SIO plugin metadata by slot ID (INS 0x41).
 */
export class PluginQueryCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PLUGIN_QUERY = 0x41
  static readonly UNUSED = 0x00

  constructor(slotId: number) {
    super(
      PluginQueryCommand.CLA_INNER,
      PluginQueryCommand.INS_PLUGIN_QUERY,
      slotId as Uint8,
      PluginQueryCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for updating SIO plugin permissions and quota blocks (INS 0x42).
 */
export class PluginUpdateCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PLUGIN_UPDATE = 0x42
  static readonly UNUSED = 0x00

  constructor(slotId: number, mode: number, quotaBlocks: number) {
    const data = new Uint8Array(4)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    view.setUint16(0, mode)
    view.setUint16(2, quotaBlocks)
    super(
      PluginUpdateCommand.CLA_INNER,
      PluginUpdateCommand.INS_PLUGIN_UPDATE,
      slotId as Uint8,
      PluginUpdateCommand.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for unregistering / deleting an SIO plugin from PluginRegistry (INS 0x43).
 */
export class PluginDeleteCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PLUGIN_DELETE = 0x43
  static readonly UNUSED = 0x00

  constructor(slotId: number) {
    super(
      PluginDeleteCommand.CLA_INNER,
      PluginDeleteCommand.INS_PLUGIN_DELETE,
      slotId as Uint8,
      PluginDeleteCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for setting the active contactless NDEF provider plugin slot (INS 0x44).
 */
export class PluginSetActiveNdefProviderCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_SET_ACTIVE_NDEF_PROVIDER = 0x44
  static readonly UNUSED = 0x00

  constructor(slotId: number) {
    super(
      PluginSetActiveNdefProviderCommand.CLA_INNER,
      PluginSetActiveNdefProviderCommand.INS_SET_ACTIVE_NDEF_PROVIDER,
      slotId as Uint8,
      PluginSetActiveNdefProviderCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for beginning an in-band CAP bytecode streaming session (INS 0x55).
 */
export class PackageBeginCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PACKAGE_BEGIN = 0x55
  static readonly UNUSED = 0x00

  constructor(totalLength: number, packageAid: Uint8Array) {
    const data = new Uint8Array(4 + 1 + packageAid.length)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    view.setUint32(0, totalLength)
    data[4] = packageAid.length
    data.set(packageAid, 5)

    super(
      PackageBeginCommand.CLA_INNER,
      PackageBeginCommand.INS_PACKAGE_BEGIN,
      PackageBeginCommand.UNUSED,
      PackageBeginCommand.UNUSED,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for streaming a chunk of CAP bytecode to the active session slot (INS 0x56).
 */
export class PackageStreamCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PACKAGE_STREAM = 0x56
  static readonly UNUSED = 0x00

  constructor(sessionSlot: number, chunk: Uint8Array) {
    super(
      PackageStreamCommand.CLA_INNER,
      PackageStreamCommand.INS_PACKAGE_STREAM,
      sessionSlot as Uint8,
      PackageStreamCommand.UNUSED,
      chunk.length as Uint8,
      chunk
    )
  }
}

/**
 * Inner APDU for committing the streamed CAP package and calculating the final H_code hash (INS 0x57).
 */
export class PackageCommitCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_PACKAGE_COMMIT = 0x57
  static readonly UNUSED = 0x00

  constructor(sessionSlot: number) {
    super(
      PackageCommitCommand.CLA_INNER,
      PackageCommitCommand.INS_PACKAGE_COMMIT,
      sessionSlot as Uint8,
      PackageCommitCommand.UNUSED,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for creating a new UAC Identity (INS 0x80).
 */
export class IdentityCreateCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_CREATE = 0x80
  static readonly UNUSED = 0x00

  constructor(
    identityId: number,
    capabilities: number,
    authPolicy: AuthPolicy = AuthPolicy.ANY_OF,
    requiredThreshold = 1,
    initialCredentials?: Array<{
      type: AuthCredentialType
      algorithmId: number
      keyReference?: number
      ownerIdentityId?: number
      verificationData?: Uint8Array
    }>
  ) {
    let credsLength = 0
    if (initialCredentials && initialCredentials.length > 0) {
      for (const cred of initialCredentials) {
        const vLen = cred.verificationData ? cred.verificationData.length : 0
        credsLength += 1 + 1 + 1 + 2 + 1 + vLen
      }
    }

    const data = new Uint8Array(2 + 2 + 1 + (initialCredentials ? 1 + credsLength : 0))
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    view.setUint16(0, identityId)
    view.setUint16(2, capabilities)
    data[4] = requiredThreshold

    if (initialCredentials && initialCredentials.length > 0) {
      data[5] = initialCredentials.length
      let off = 6
      for (const cred of initialCredentials) {
        const vLen = cred.verificationData ? cred.verificationData.length : 0
        data[off++] = cred.type
        data[off++] = cred.algorithmId
        data[off++] = vLen
        view.setUint16(off, cred.keyReference || 0)
        off += 2
        data[off++] = cred.ownerIdentityId ?? identityId
        if (cred.verificationData && vLen > 0) {
          data.set(cred.verificationData, off)
          off += vLen
        }
      }
    }

    super(
      IdentityCreateCommand.CLA_INNER,
      IdentityCreateCommand.INS_IDENTITY_CREATE,
      IdentityCreateCommand.UNUSED,
      authPolicy as Uint8,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for querying a UAC Identity (INS 0x81).
 */
export class IdentityQueryCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_QUERY = 0x81

  constructor(identityId: number) {
    super(
      IdentityQueryCommand.CLA_INNER,
      IdentityQueryCommand.INS_IDENTITY_QUERY,
      ((identityId >> 8) & 0xff) as Uint8,
      (identityId & 0xff) as Uint8,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for updating a UAC Identity properties (INS 0x82).
 */
export class IdentityUpdateCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_UPDATE = 0x82

  constructor(identityId: number, capabilities: number, authPolicy: AuthPolicy, requiredThreshold: number) {
    const data = new Uint8Array(4)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    view.setUint16(0, capabilities)
    data[2] = authPolicy
    data[3] = requiredThreshold

    super(
      IdentityUpdateCommand.CLA_INNER,
      IdentityUpdateCommand.INS_IDENTITY_UPDATE,
      ((identityId >> 8) & 0xff) as Uint8,
      (identityId & 0xff) as Uint8,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for deleting a UAC Identity (INS 0x83).
 */
export class IdentityDeleteCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_DELETE = 0x83

  constructor(identityId: number) {
    super(
      IdentityDeleteCommand.CLA_INNER,
      IdentityDeleteCommand.INS_IDENTITY_DELETE,
      ((identityId >> 8) & 0xff) as Uint8,
      (identityId & 0xff) as Uint8,
      0 as Uint8,
      new Uint8Array(0)
    )
  }
}

/**
 * Inner APDU for adding a credential to a UAC Identity (INS 0x84).
 */
export class IdentityAddCredentialCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_ADD_CREDENTIAL = 0x84

  constructor(
    identityId: number,
    type: AuthCredentialType,
    algorithmId: number,
    verificationData: Uint8Array,
    keyReference = 0,
    ownerIdentityId = identityId
  ) {
    const data = new Uint8Array(1 + 1 + 1 + 2 + 1 + verificationData.length)
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    data[0] = type
    data[1] = algorithmId
    data[2] = verificationData.length
    view.setUint16(3, keyReference)
    data[5] = ownerIdentityId
    data.set(verificationData, 6)

    super(
      IdentityAddCredentialCommand.CLA_INNER,
      IdentityAddCredentialCommand.INS_IDENTITY_ADD_CREDENTIAL,
      ((identityId >> 8) & 0xff) as Uint8,
      (identityId & 0xff) as Uint8,
      data.length as Uint8,
      data
    )
  }
}

/**
 * Inner APDU for removing a credential from a UAC Identity (INS 0x85).
 */
export class IdentityRemoveCredentialCommand extends CommandApdu {
  static readonly CLA_INNER = 0x80
  static readonly INS_IDENTITY_REMOVE_CREDENTIAL = 0x85

  constructor(identityId: number, credentialIndex: number) {
    const data = new Uint8Array([credentialIndex & 0xff])

    super(
      IdentityRemoveCredentialCommand.CLA_INNER,
      IdentityRemoveCredentialCommand.INS_IDENTITY_REMOVE_CREDENTIAL,
      ((identityId >> 8) & 0xff) as Uint8,
      (identityId & 0xff) as Uint8,
      data.length as Uint8,
      data
    )
  }
}
