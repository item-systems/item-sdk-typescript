import { CardReader } from './reader'
import {
  IdentityCreateCommand,
  IdentityQueryCommand,
  IdentityUpdateCommand,
  IdentityDeleteCommand,
  IdentityAddCredentialCommand,
  IdentityRemoveCredentialCommand,
  TunnelCommand,
} from './command-apdu'
import { IdentityQueryResponse, ResponseAPDU } from './reponse-apdu'
import { IdentityInfo, AuthCredentialType, AuthPolicy } from './types'
import { StatusWord } from './statusword'

/**
 * High-level Identity Manager for User Access Control (UAC).
 * Handles multi-identity creation, credential assignment, and permission management.
 */
export class IdentityManager {
  private reader: CardReader

  constructor(reader: CardReader) {
    this.reader = reader
  }

  private async executeTunneled(innerApdu: Uint8Array): Promise<ResponseAPDU> {
    const tunnelCmd = new TunnelCommand(innerApdu)
    return await this.reader.sendCommand(tunnelCmd)
  }

  /**
   * Create a new UAC identity on the card.
   */
  public async createIdentity(
    identityId: number,
    capabilities: number,
    authPolicy: AuthPolicy = AuthPolicy.ANY_OF,
    requiredThreshold = 1
  ): Promise<void> {
    const cmd = new IdentityCreateCommand(identityId, capabilities, authPolicy, requiredThreshold)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to create identity: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`)
    }
  }

  /**
   * Query an existing UAC identity by ID.
   */
  public async queryIdentity(identityId: number): Promise<IdentityInfo | null> {
    const cmd = new IdentityQueryCommand(identityId)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() === 0x6a83 || resp.getSW() === 0x6a88) {
      return null
    }
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(
        `Failed to query identity ${identityId}: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`
      )
    }
    const queryResp = new IdentityQueryResponse(resp.toArray())
    const info = queryResp.getIdentityInfo()
    if (info && identityId !== 0xffff && info.identityId !== identityId)
      throw new Error('Identity response UID mismatch')
    return info
  }

  /** Read the session-bound UID and capabilities, never a host-asserted caller. */
  public async current(): Promise<IdentityInfo> {
    const info = await this.queryIdentity(0xffff)
    if (!info) throw new Error('Authenticated identity is unavailable')
    return info
  }

  /**
   * Update identity capabilities and authentication policies.
   */
  public async updateIdentity(
    identityId: number,
    capabilities: number,
    authPolicy: AuthPolicy,
    requiredThreshold: number
  ): Promise<void> {
    const cmd = new IdentityUpdateCommand(identityId, capabilities, authPolicy, requiredThreshold)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(
        `Failed to update identity ${identityId}: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`
      )
    }
  }

  /**
   * Delete an identity from the card (Identity 0 cannot be deleted).
   */
  public async deleteIdentity(identityId: number): Promise<void> {
    const cmd = new IdentityDeleteCommand(identityId)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(
        `Failed to delete identity ${identityId}: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`
      )
    }
  }

  /**
   * Add a credential descriptor to an identity.
   * Returns the allocated credential index.
   */
  public async addCredential(identityId: number, type: AuthCredentialType, credData: Uint8Array): Promise<number> {
    const cmd = new IdentityAddCredentialCommand(identityId, type, credData)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(
        `Failed to add credential to identity ${identityId}: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`
      )
    }
    const data = resp.getData()
    if (data.length !== 1 || data[0] > 3) throw new Error('Invalid allocated credential slot')
    return data[0]
  }

  /**
   * Remove a credential descriptor from an identity by index.
   */
  public async removeCredential(identityId: number, credentialIndex: number): Promise<void> {
    const cmd = new IdentityRemoveCredentialCommand(identityId, credentialIndex)
    const resp = await this.executeTunneled(cmd.toArray())
    if (resp.getSW() !== StatusWord.OK) {
      throw new Error(
        `Failed to remove credential ${credentialIndex} from identity ${identityId}: Status Word 0x${resp.getSW().toString(16).toUpperCase()}`
      )
    }
  }
}
