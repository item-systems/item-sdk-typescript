import { StatusWord } from './statusword'

import { MasterKeyStats, MicrokernelResourceFlags, PluginInfo, IdentityInfo } from './types'
import { parseIdentityInfo } from './identity-wire'

/**
 * Parsed representation of an ISO 7816 response APDU.
 *
 * Response APDUs always end with a two-byte status word. This wrapper exposes
 * the status word and payload separately so higher-level code can branch on card
 * outcomes without manually slicing buffers.
 */
export class ResponseAPDU {
  private readonly _buffer: Uint8Array
  private _view: DataView

  /**
   * @param data Full response bytes including the trailing status word.
   */
  constructor(data: Uint8Array) {
    if (data.length < 2) {
      throw new Error(`Invalid data. Minimum data length is 2, got ` + data.length)
    }
    this._buffer = data
    this._view = new DataView(this._buffer.buffer)
  }

  /**
   * Return the 16-bit status word from the end of the APDU.
   */
  getSW(): number {
    return this._view.getUint16(this._buffer.length - 2)
  }

  /**
   * Return the response payload excluding the trailing status word.
   */
  getData(): Uint8Array {
    return this._buffer.slice(0, this._buffer.length - 2)
  }

  /**
   * Return the original raw APDU bytes.
   */
  toArray(): Uint8Array {
    return this._buffer
  }
}

/**
 * Response wrapper for applet-selection responses.
 *
 * Different firmware generations return slightly different payload layouts, so
 * this helper centralizes the logic for extracting the card public key from the
 * select response.
 */
export class SelectResponse extends ResponseAPDU {
  private static TAG_DK1_V100_LENGTH = 90
  private static PUBLIC_KEY_LENGTH = 65
  // TAG + LEN + 3 bytes of semver data
  private static APPLET_VERSION_LENGTH = 5
  private static TAG_V2_LENGTH = SelectResponse.TAG_DK1_V100_LENGTH + SelectResponse.APPLET_VERSION_LENGTH

  constructor(apdu: Uint8Array) {
    super(apdu)
  }

  /**
   * Extract the uncompressed public key advertised by the selected applet.
   */
  getPublicKey(): Uint8Array {
    const d = this.getData()
    if (d.length === SelectResponse.TAG_DK1_V100_LENGTH) {
      return d.slice(d.length - SelectResponse.PUBLIC_KEY_LENGTH)
    } else if (d.length === SelectResponse.TAG_V2_LENGTH) {
      const start = SelectResponse.PUBLIC_KEY_LENGTH + SelectResponse.APPLET_VERSION_LENGTH
      return d.slice(d.length - start, SelectResponse.PUBLIC_KEY_LENGTH)
    } else {
      throw new Error(`Unexpected data length. Unknown how to extract public key`)
    }
  }
}

/**
 * Response wrapper for `SignCommand`.
 *
 * The card returns a tagged structure containing the proof and the public key
 * used to produce it. The card operation remains a cryptographic signing
 * operation; `proof` is the canonical ITEM SDK term for the returned
 * authorization material.
 */
export class SignResponse extends ResponseAPDU {
  private static TAG_SIGNATURE_PUBLIC_KEY = 0xa2
  private static TAG_OCTET_STRING = 0x04
  private static PUBLIC_KEY_LENGTH = 0x41
  private proof: Uint8Array
  private publicKey: Uint8Array

  constructor(apdu: Uint8Array) {
    super(apdu)

    if (this.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to create SignResponse: wrong status word 0x${this.getSW().toString(16)}`)
    }

    const data = this.getData()
    // status word + 2 tags + 65 bytes of public key + proof bytes
    if (data.length <= 2 + 2 + 65) {
      throw new Error('Insufficient data')
    }

    if (data[0] !== SignResponse.TAG_SIGNATURE_PUBLIC_KEY) {
      throw new Error('did not find proof/public-key tag')
    }

    if (
      data[data.length - 67] !== SignResponse.TAG_OCTET_STRING ||
      data[data.length - 66] !== SignResponse.PUBLIC_KEY_LENGTH
    ) {
      throw new Error('invalid public key data')
    }

    this.publicKey = data.slice(data.length - 65)

    // Offset is the place where the proof data starts after the variable-
    // length DER-ish framing bytes.
    let offset = 2
    if (data[1] === 0x81) {
      offset += 1
    } else if (data[1] === 0x82) {
      offset += 2
    } else if (data[1] === 0x83) {
      offset += 3
    } else if (data[1] === 0x84) {
      offset += 4
    } else if (data[1] > 0x80) {
      throw new Error(`Invalid proof length field: ${data[1]}`)
    }
    this.proof = data.slice(offset, data.length - 67)
  }

  /**
   * Return the public key associated with the returned proof.
   */
  getPublicKey(): Uint8Array {
    return this.publicKey
  }

  /**
   * Return the raw authorization proof bytes produced by the card signing action.
   */
  getProof(): Uint8Array {
    return this.proof
  }

  /**
   * @deprecated Use {@link getProof}. Retained for smartcard SDK compatibility;
   * it returns the same raw DER-encoded proof bytes.
   */
  getSignature(): Uint8Array {
    return this.getProof()
  }
}

/**
 * Response parser for `MasterKeyStatsCommand`.
 */
export class MasterKeyStatsResponse extends ResponseAPDU {
  private stats: MasterKeyStats[] = []

  constructor(apdu: Uint8Array) {
    super(apdu)

    if (this.getSW() === StatusWord.NO_MASTER_KEY_PRESENT) {
      this.stats = []
      return
    }

    if (this.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to parse MasterKeyStatsResponse: wrong status word 0x${this.getSW().toString(16)}`)
    }

    const data = this.getData()
    if (data.length === 0) {
      this.stats = []
      return
    }

    const count = data[0]
    let offset = 1
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

    for (let i = 0; i < count; i++) {
      if (offset + 13 > data.length) {
        break
      }
      const slotId = data[offset]
      const isTunnelAnchor = data[offset + 1] !== 0
      const tunnelCryptoSlot = data[offset + 2]
      const ownerUid = view.getUint16(offset + 3)
      const ownerGid = view.getUint16(offset + 5)
      const posixMode = view.getUint16(offset + 7)
      const refCount = view.getUint16(offset + 9)
      const flags = view.getUint16(offset + 11)
      const isDeprecated = (flags & MicrokernelResourceFlags.DEPRECATED) !== 0
      const ringCount = offset + 13 < data.length ? data[offset + 13] : 0
      offset += 14

      const ringIds: number[] = []
      for (let r = 0; r < ringCount && offset < data.length; r++) {
        ringIds.push(data[offset++])
      }

      this.stats.push({
        slotId,
        isTunnelAnchor,
        tunnelCryptoSlot,
        ownerUid,
        ownerGid,
        posixMode,
        refCount,
        flags,
        isDeprecated,
        ringCount,
        ringIds,
      })
    }
  }

  /**
   * Return parsed statistics records for all active MasterKeys.
   */
  getStats(): MasterKeyStats[] {
    return this.stats
  }
}

/**
 * Response parser for `PluginQueryCommand` (INS 0x41).
 */
export class PluginQueryResponse extends ResponseAPDU {
  private pluginInfo: PluginInfo | null = null

  constructor(apdu: Uint8Array, slotId: number) {
    super(apdu)

    if (this.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to parse PluginQueryResponse: wrong status word 0x${this.getSW().toString(16)}`)
    }

    const data = this.getData()
    if (data.length === 0 || data[0] === 0) {
      this.pluginInfo = null
      return
    }

    // Format: [ status (1B) | aid_len (1B) | aid | uid (2B) | gid (2B) | mode (2B) | quota (2B) | h_code (32B) ]
    const aidLen = data[1]
    let offset = 2
    const aid = data.slice(offset, offset + aidLen)
    offset += aidLen

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const uid = view.getUint16(offset)
    offset += 2
    const gid = view.getUint16(offset)
    offset += 2
    const posixMode = view.getUint16(offset)
    offset += 2
    const quotaBlocks = view.getUint16(offset)
    offset += 2
    const hCode = data.length >= offset + 32 ? data.slice(offset, offset + 32) : new Uint8Array(32)

    this.pluginInfo = {
      slotId,
      aid,
      uid,
      gid,
      posixMode,
      quotaBlocks,
      hCode,
    }
  }

  /**
   * Return parsed plugin metadata record, or null if the slot is unallocated.
   */
  getPluginInfo(): PluginInfo | null {
    return this.pluginInfo
  }
}

/**
 * Response parser for `PackageCommitCommand` (INS 0x57).
 */
export class PackageCommitResponse extends ResponseAPDU {
  private hCode: Uint8Array

  constructor(apdu: Uint8Array) {
    super(apdu)

    if (this.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to parse PackageCommitResponse: wrong status word 0x${this.getSW().toString(16)}`)
    }

    const data = this.getData()
    if (data.length !== 32) throw new Error('Package commit must return exactly 32 SHA-256 bytes')
    this.hCode = new Uint8Array(data)
  }

  /**
   * Return the 32-byte card receipt. InBandBytecodeLoader separately compares it to local SHA-256.
   */
  getCodeHash(): Uint8Array {
    return this.hCode
  }
}

/**
 * Response parser for `IdentityQueryCommand` (INS 0x81).
 * Wire format matches Python SDK v3.5.0:
 * [uid(2B) | capabilities(2B) | policy(1B) | threshold(1B) | credCount(1B)]
 */
export class IdentityQueryResponse extends ResponseAPDU {
  private identityInfo: IdentityInfo | null = null

  constructor(apdu: Uint8Array) {
    super(apdu)

    if (this.getSW() === 0x6a83 || this.getSW() === 0x6a88) {
      this.identityInfo = null
      return
    }

    if (this.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to parse IdentityQueryResponse: wrong status word 0x${this.getSW().toString(16)}`)
    }

    this.identityInfo = parseIdentityInfo(this.getData())
  }

  getIdentityInfo(): IdentityInfo | null {
    return this.identityInfo
  }
}
