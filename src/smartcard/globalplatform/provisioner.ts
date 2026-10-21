import { CardReader } from '../reader'
import { GlobalPlatformCardManager, GpKeySet, DEFAULT_ISD_AID, DEFAULT_MAX_LOAD_CHUNK_SIZE } from './card-manager'
import { GpSecurityLevel } from './scp02'

export interface CapTopologyEntry {
  name: string
  packageAid: string
  capBytes: Uint8Array
  isLibrary?: boolean
  appletAid?: string
  instanceAid?: string
  privileges?: string
  installParams?: string
}

export interface ProvisioningOptions {
  isdAid?: string
  keySet: GpKeySet
  securityLevel?: GpSecurityLevel
  hostChallenge?: Uint8Array
  cleanWipeExisting?: boolean
  existingAidsToDelete?: string[]
  maxChunkSize?: number
  onProgress?: (step: string, current: number, total: number) => void
}

/**
 * High-Level GlobalPlatform Silicon Provisioner.
 *
 * Orchestrates multi-package CAP deployments, clean wipes, and instantiation
 * sequences in strict acyclic dependency order.
 */
export class GlobalPlatformProvisioner {
  private cardManager: GlobalPlatformCardManager

  constructor(reader: CardReader) {
    this.cardManager = new GlobalPlatformCardManager(reader)
  }

  public getCardManager(): GlobalPlatformCardManager {
    return this.cardManager
  }

  /**
   * Provision silicon with a complete package topology (e.g. 11-CAP Microkernel + Plugins + Engines).
   */
  public async provisionTopology(topology: CapTopologyEntry[], options: ProvisioningOptions): Promise<void> {
    const isdAid = options.isdAid || DEFAULT_ISD_AID
    const totalSteps = topology.length + (options.cleanWipeExisting ? 1 : 0) + 1
    let stepCount = 0

    // Step 1: Select Card Manager and authenticate via SCP02
    options.onProgress?.('Authenticating with Card Manager', ++stepCount, totalSteps)
    await this.cardManager.selectCardManager(isdAid)
    await this.cardManager.openSecureChannelScp02(
      options.keySet,
      options.securityLevel || GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
      options.hostChallenge
    )

    // Step 2: Optional Clean Wipe
    if (options.cleanWipeExisting && options.existingAidsToDelete && options.existingAidsToDelete.length > 0) {
      options.onProgress?.('Wiping existing packages', ++stepCount, totalSteps)
      for (const aid of options.existingAidsToDelete) {
        try {
          await this.cardManager.delete(aid, true)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          // Only ignore benign "not found" / "referenced data not found" status words (0x6A88 or 0x6A80)
          const isNotFound = msg.includes('0x6A88') || msg.includes('0x6A80')
          if (!isNotFound) {
            // Re-throw genuine errors (auth mismatch 0x6982, condition of use 0x6985, transport errors)
            throw new Error(`Failed to delete package ${aid} during clean wipe: ${msg}`)
          }
        }
      }
    }

    // Step 3: Deploy and instantiate packages in topology order
    for (const entry of topology) {
      options.onProgress?.(`Loading ${entry.name}`, ++stepCount, totalSteps)

      // 1. Load CAP (with automatic C4 data block construction and safe default chunk size)
      await this.cardManager.loadCap(
        entry.capBytes,
        entry.packageAid,
        isdAid,
        options.maxChunkSize || DEFAULT_MAX_LOAD_CHUNK_SIZE
      )

      // 2. Instantiate if not an export library
      if (!entry.isLibrary && entry.appletAid && entry.instanceAid) {
        options.onProgress?.(`Instantiating ${entry.name}`, stepCount, totalSteps)
        await this.cardManager.installAndMakeSelectable(
          entry.packageAid,
          entry.appletAid,
          entry.instanceAid,
          entry.privileges || '00',
          entry.installParams || ''
        )
      }
    }

    options.onProgress?.('Provisioning Complete', totalSteps, totalSteps)
  }
}
