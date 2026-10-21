import { CardReader } from './reader'
import {
  PluginRegisterCommand,
  PluginQueryCommand,
  PluginUpdateCommand,
  PluginDeleteCommand,
  PluginSetActiveNdefProviderCommand,
  TunnelCommand,
} from './command-apdu'
import { PluginQueryResponse, ResponseAPDU } from './reponse-apdu'
import { PluginInfo } from './types'
import { StatusWord } from './statusword'

/**
 * High-level manager for on-card SIO plugin lifecycle and permissions over the Secure Tunnel.
 */
export class PluginManager {
  private reader: CardReader

  constructor(reader: CardReader) {
    this.reader = reader
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
   * Registers an SIO plugin in the kernel PluginRegistry (INS 0x40).
   *
   * @param aid Application Identifier (AID) of the plugin instance.
   * @param uid POSIX User ID assigned to the plugin.
   * @param gid POSIX Group ID (default: 1).
   * @param mode POSIX octal permission mode (default: 0x01ED / 0755).
   * @param quotaBlocks Dynamic 2 KB Flash storage quota blocks (default: 10 blocks = 20 KB).
   * @returns Allocated plugin slot ID (0..7).
   */
  async register(aid: Uint8Array, uid: number, gid = 1, mode = 0x01ed, quotaBlocks = 10): Promise<number> {
    const cmd = new PluginRegisterCommand(aid, uid, gid, mode, quotaBlocks)
    const innerResp = await this.executeTunneled(cmd.toArray())
    if (innerResp.getSW() !== StatusWord.OK) {
      throw new Error(`Plugin registration failed: SW=0x${innerResp.getSW().toString(16)}`)
    }
    const data = innerResp.getData()
    return data.length > 0 ? data[0] : 0
  }

  /**
   * Queries metadata for a registered plugin slot (INS 0x41).
   *
   * @param slotId Plugin slot ID (0..7).
   * @returns Parsed `PluginInfo` or null if unallocated.
   */
  async query(slotId: number): Promise<PluginInfo | null> {
    const cmd = new PluginQueryCommand(slotId)
    const innerResp = await this.executeTunneled(cmd.toArray())
    if (innerResp.getSW() !== StatusWord.OK) {
      throw new Error(`Plugin query failed: SW=0x${innerResp.getSW().toString(16)}`)
    }
    const parsed = new PluginQueryResponse(innerResp.toArray(), slotId)
    return parsed.getPluginInfo()
  }

  /**
   * Updates permission mode and storage quota for a registered plugin (INS 0x42).
   *
   * @param slotId Plugin slot ID (0..7).
   * @param newMode New POSIX permission mode (e.g. 0x01ED).
   * @param newQuotaBlocks New 2 KB storage quota blocks.
   */
  async update(slotId: number, newMode: number, newQuotaBlocks: number): Promise<void> {
    const cmd = new PluginUpdateCommand(slotId, newMode, newQuotaBlocks)
    const innerResp = await this.executeTunneled(cmd.toArray())
    if (innerResp.getSW() !== StatusWord.OK) {
      throw new Error(`Plugin update failed: SW=0x${innerResp.getSW().toString(16)}`)
    }
  }

  /**
   * Unregisters / deletes an SIO plugin from PluginRegistry (INS 0x43).
   *
   * @param slotId Plugin slot ID (0..7).
   */
  async delete(slotId: number): Promise<void> {
    const cmd = new PluginDeleteCommand(slotId)
    const innerResp = await this.executeTunneled(cmd.toArray())
    if (innerResp.getSW() !== StatusWord.OK) {
      throw new Error(`Plugin delete failed: SW=0x${innerResp.getSW().toString(16)}`)
    }
  }

  /**
   * Selects which registered plugin handles ISO 14443-4 contactless NDEF emulation (INS 0x44).
   *
   * @param slotId Plugin slot ID (0..7).
   */
  async setActiveNdefProvider(slotId: number): Promise<void> {
    const cmd = new PluginSetActiveNdefProviderCommand(slotId)
    const innerResp = await this.executeTunneled(cmd.toArray())
    if (innerResp.getSW() !== StatusWord.OK) {
      throw new Error(`Set active NDEF provider failed: SW=0x${innerResp.getSW().toString(16)}`)
    }
  }
}
