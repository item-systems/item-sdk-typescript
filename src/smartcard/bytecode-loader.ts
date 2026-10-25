import { sha256 } from '@noble/hashes/sha2.js'
import { CardReader } from './reader'
import { PackageBeginCommand, PackageStreamCommand, PackageCommitCommand, TunnelCommand } from './command-apdu'
import { PackageCommitResponse, ResponseAPDU } from './reponse-apdu'
import { StatusWord } from './statusword'
import { uint8Equals } from './utils'

export type ProgressCallback = (bytesStreamed: number, totalBytes: number) => void

/**
 * In-Band CAP Bytecode streaming and loader client.
 * Streams compiled JavaCard CAP binaries into the microkernel over the encrypted tunnel (INS 0x30).
 */
export class InBandBytecodeLoader {
  static readonly DEFAULT_CHUNK_SIZE = 220
  private reader: CardReader
  private chunkSize: number

  constructor(reader: CardReader, chunkSize = InBandBytecodeLoader.DEFAULT_CHUNK_SIZE) {
    if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 220)
      throw new Error('Chunk size must be an integer from 1 to 220')
    this.reader = reader
    this.chunkSize = chunkSize
  }

  /**
   * Helper to execute an inner command wrapped in TunnelCommand (INS 0x30).
   */
  private async executeTunneled(innerApdu: Uint8Array): Promise<ResponseAPDU> {
    const tunnelCmd = new TunnelCommand(innerApdu)
    const resp = await this.reader.sendCommand(tunnelCmd)
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(`Tunnel command failed: SW=0x${resp.getSW().toString(16)}`)
    }
    return new ResponseAPDU(resp.getData())
  }

  /**
   * Streams a CAP binary in-band through the microkernel's BytecodeLoader.
   *
   * @param capBytes Raw compiled CAP file bytes.
   * @param packageAid JavaCard Package AID.
   * @param progressCallback Optional streaming progress callback.
   * @returns Verified on-card SHA-256 bytecode hash ($H_{code}$).
   * This receipt is not an installed applet or plugin-registration result. Stop on
   * uncertain transport failure; do not replay a partially acknowledged stream.
   */
  async streamCap(
    capBytes: Uint8Array,
    packageAid: Uint8Array,
    progressCallback?: ProgressCallback
  ): Promise<Uint8Array> {
    const totalLen = capBytes.length
    if (!totalLen || totalLen > 0xffffffff || packageAid.length < 5 || packageAid.length > 16)
      throw new Error('Invalid CAP or package AID')
    const localSha256 = sha256(capBytes)

    // 1. INS_PACKAGE_BEGIN (0x55)
    const beginCmd = new PackageBeginCommand(totalLen, packageAid)
    const beginResp = await this.executeTunneled(beginCmd.toArray())
    if (beginResp.getSW() !== StatusWord.OK) {
      throw new Error(`Package begin failed: SW=0x${beginResp.getSW().toString(16)}`)
    }
    if (beginResp.getData().length !== 1) throw new Error('Package begin must return exactly one session-slot byte')
    const sessionSlot = beginResp.getData()[0]

    // 2. INS_PACKAGE_STREAM (0x56)
    let offset = 0
    while (offset < totalLen) {
      const chunk = capBytes.slice(offset, offset + this.chunkSize)
      const streamCmd = new PackageStreamCommand(sessionSlot, chunk)
      const streamResp = await this.executeTunneled(streamCmd.toArray())
      if (streamResp.getSW() !== StatusWord.OK) {
        throw new Error(`Package stream chunk failed at offset ${offset}: SW=0x${streamResp.getSW().toString(16)}`)
      }
      offset += chunk.length
      if (progressCallback) {
        progressCallback(offset, totalLen)
      }
    }

    // 3. INS_PACKAGE_COMMIT (0x57)
    const commitCmd = new PackageCommitCommand(sessionSlot)
    const commitResp = await this.executeTunneled(commitCmd.toArray())
    if (commitResp.getSW() !== StatusWord.OK) {
      throw new Error(`Package commit failed: SW=0x${commitResp.getSW().toString(16)}`)
    }

    const parsedCommit = new PackageCommitResponse(commitResp.toArray())
    const cardHCode = parsedCommit.getCodeHash()

    if (!uint8Equals(cardHCode, localSha256)) {
      throw new Error('Bytecode hash mismatch between local CAP and on-card computed hash')
    }

    return cardHCode
  }
}
