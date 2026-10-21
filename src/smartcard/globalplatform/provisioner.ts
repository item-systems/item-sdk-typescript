import { CardReader } from '../reader'
import {
  GlobalPlatformCardManager,
  GpKeySet,
  DEFAULT_ISD_AID,
  DEFAULT_MAX_LOAD_CHUNK_SIZE,
  GpStatusResult,
} from './card-manager'
import { GpSecurityLevel } from './scp02'
import { preflightTopology, TopologyPreflightPlan } from './preflight'

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

export type ProvisioningPhase =
  | 'preflight'
  | 'authenticating'
  | 'inventory'
  | 'reconciling'
  | 'wiping'
  | 'loading'
  | 'instantiating'
  | 'complete'

export interface ProvisioningProgressEvent {
  phase: ProvisioningPhase
  stepDescription: string
  currentStep: number
  totalSteps: number
  packageName?: string
  packageAid?: string
  bytesLoaded?: number
  totalBytes?: number
  progressPercent: number
}

export interface ProvisioningOptions {
  isdAid?: string
  keySet: GpKeySet
  securityLevel?: GpSecurityLevel
  hostChallenge?: Uint8Array
  cleanWipeExisting?: boolean
  existingAidsToDelete?: string[]
  maxChunkSize?: number
  strictValidation?: boolean // Default true: runs full CAP verification and DAG dependency check before any card action
  skipPreflight?: boolean // Set to true to bypass offline preflight
  reconcileWithInventory?: boolean // Set to true to skip already-installed identical packages (resilient flashing)
  signal?: AbortSignal // Cancellation token
  onProgress?: (event: ProvisioningProgressEvent) => void
}

/**
 * Result of a topology reconciliation comparison.
 */
export interface TopologyReconciliation {
  installedAids: Set<string>
  packagesToLoad: CapTopologyEntry[]
  instancesToCreate: CapTopologyEntry[]
  alreadyInstalledPackages: string[]
}

/**
 * High-Level GlobalPlatform Silicon Provisioner.
 *
 * Orchestrates multi-package CAP deployments, clean wipes, and instantiation
 * sequences in strict acyclic dependency order with preflight safety validation,
 * cancellation support, and interrupted-flashing recovery.
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
   * Run offline preflight validation on a topology.
   */
  public preflight(topology: CapTopologyEntry[]): TopologyPreflightPlan {
    return preflightTopology(topology)
  }

  /**
   * Reconcile target topology against live card inventory to determine minimal operations
   * for resilient flashing recovery after an interrupted session.
   */
  public reconcileTopology(topology: CapTopologyEntry[], inventory: GpStatusResult): TopologyReconciliation {
    const installedAids = new Set<string>()
    for (const elf of inventory.executableLoadFiles) {
      installedAids.add(elf.aid.toUpperCase())
    }
    for (const app of inventory.appletsAndSecurityDomains) {
      installedAids.add(app.aid.toUpperCase())
    }

    const packagesToLoad: CapTopologyEntry[] = []
    const instancesToCreate: CapTopologyEntry[] = []
    const alreadyInstalledPackages: string[] = []

    for (const entry of topology) {
      const cleanPkgAid = entry.packageAid.replace(/^0x/i, '').toUpperCase()
      const isPkgInstalled = installedAids.has(cleanPkgAid)

      if (isPkgInstalled) {
        alreadyInstalledPackages.push(cleanPkgAid)
      } else {
        packagesToLoad.push(entry)
      }

      if (!entry.isLibrary && entry.instanceAid) {
        const cleanInstAid = entry.instanceAid.replace(/^0x/i, '').toUpperCase()
        if (!installedAids.has(cleanInstAid)) {
          instancesToCreate.push(entry)
        }
      }
    }

    return {
      installedAids,
      packagesToLoad,
      instancesToCreate,
      alreadyInstalledPackages,
    }
  }

  /**
   * Provision silicon with a complete package topology (e.g. 11-CAP Microkernel + Plugins + Engines).
   *
   * Executes strict preflight validation before any card deletion or mutation.
   */
  public async provisionTopology(topology: CapTopologyEntry[], options: ProvisioningOptions): Promise<void> {
    const isdAid = options.isdAid || DEFAULT_ISD_AID
    const signal = options.signal

    this.checkAborted(signal)

    // ==========================================
    // Phase 1: Offline Strict Preflight & DAG
    // ==========================================
    let orderedTopology = topology
    let preflightPlan: TopologyPreflightPlan | null = null

    if (!options.skipPreflight && options.strictValidation !== false) {
      this.emitProgress(options, {
        phase: 'preflight',
        stepDescription: 'Running offline preflight and dependency DAG validation',
        currentStep: 1,
        totalSteps: 10,
        progressPercent: 5,
      })

      preflightPlan = this.preflight(topology)
      if (!preflightPlan.valid) {
        throw new Error(`Topology Preflight Validation Failed! Errors:\n- ${preflightPlan.errors.join('\n- ')}`)
      }

      // Re-order topology to match canonical DAG dependency order if needed
      const orderMap = new Map<string, number>()
      preflightPlan.plannedExecutionOrder.forEach((aid, idx) => orderMap.set(aid, idx))
      orderedTopology = [...topology].sort((a, b) => {
        const idxA = orderMap.get(a.packageAid.toUpperCase()) ?? 999
        const idxB = orderMap.get(b.packageAid.toUpperCase()) ?? 999
        return idxA - idxB
      })
    }

    // ==========================================
    // Phase 2: Card Authentication
    // ==========================================
    this.checkAborted(signal)
    this.emitProgress(options, {
      phase: 'authenticating',
      stepDescription: 'Authenticating with Card Manager via SCP02',
      currentStep: 2,
      totalSteps: 10,
      progressPercent: 15,
    })

    await this.cardManager.selectCardManager(isdAid, signal)
    await this.cardManager.openSecureChannelScp02(
      options.keySet,
      options.securityLevel || GpSecurityLevel.C_DECRYPTION_AND_C_MAC,
      options.hostChallenge,
      signal
    )

    // ==========================================
    // Phase 3: Card Inventory & Reconciliation
    // ==========================================
    let targetPackages = orderedTopology
    let targetInstances = orderedTopology.filter(e => !e.isLibrary && e.appletAid && e.instanceAid)

    if (options.reconcileWithInventory) {
      this.checkAborted(signal)
      this.emitProgress(options, {
        phase: 'inventory',
        stepDescription: 'Inspecting existing card inventory for resilient flashing',
        currentStep: 3,
        totalSteps: 10,
        progressPercent: 25,
      })

      const inventory = await this.cardManager.getCardInventory(signal)
      const reconciliation = this.reconcileTopology(orderedTopology, inventory)
      targetPackages = reconciliation.packagesToLoad
      targetInstances = reconciliation.instancesToCreate

      this.emitProgress(options, {
        phase: 'reconciling',
        stepDescription: `Reconciled: ${reconciliation.alreadyInstalledPackages.length} packages intact, ${targetPackages.length} to load`,
        currentStep: 4,
        totalSteps: 10,
        progressPercent: 30,
      })
    }

    // ==========================================
    // Phase 4: Clean Wipe (if requested)
    // ==========================================
    if (options.cleanWipeExisting && options.existingAidsToDelete && options.existingAidsToDelete.length > 0) {
      this.checkAborted(signal)
      this.emitProgress(options, {
        phase: 'wiping',
        stepDescription: `Wiping ${options.existingAidsToDelete.length} existing package(s)`,
        currentStep: 5,
        totalSteps: 10,
        progressPercent: 35,
      })

      for (const aid of options.existingAidsToDelete) {
        this.checkAborted(signal)
        try {
          await this.cardManager.delete(aid, true, signal)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          // Only ignore benign 0x6A88 (Referenced data not found)
          const isNotFound = msg.includes('0x6A88')
          if (!isNotFound) {
            throw new Error(`Failed to delete package ${aid} during clean wipe: ${msg}`)
          }
        }
      }
    }

    // ==========================================
    // Phase 5: Loading Packages
    // ==========================================
    const totalOps = targetPackages.length + targetInstances.length
    let opIndex = 0

    for (const entry of targetPackages) {
      this.checkAborted(signal)
      opIndex++
      const pkgProgress = Math.round(40 + (opIndex / Math.max(1, totalOps)) * 50)

      this.emitProgress(options, {
        phase: 'loading',
        stepDescription: `Loading ${entry.name} (${entry.packageAid})`,
        currentStep: opIndex,
        totalSteps: totalOps,
        packageName: entry.name,
        packageAid: entry.packageAid,
        progressPercent: pkgProgress,
      })

      await this.cardManager.loadCap(
        entry.capBytes,
        entry.packageAid,
        isdAid,
        options.maxChunkSize || DEFAULT_MAX_LOAD_CHUNK_SIZE,
        (bytesLoaded, totalBytes) => {
          this.emitProgress(options, {
            phase: 'loading',
            stepDescription: `Streaming ${entry.name}: ${bytesLoaded}/${totalBytes} bytes`,
            currentStep: opIndex,
            totalSteps: totalOps,
            packageName: entry.name,
            packageAid: entry.packageAid,
            bytesLoaded,
            totalBytes,
            progressPercent: pkgProgress,
          })
        },
        signal
      )
    }

    // ==========================================
    // Phase 6: Instantiating Applets
    // ==========================================
    for (const entry of targetInstances) {
      this.checkAborted(signal)
      opIndex++
      const instProgress = Math.round(40 + (opIndex / Math.max(1, totalOps)) * 50)

      this.emitProgress(options, {
        phase: 'instantiating',
        stepDescription: `Instantiating ${entry.name} (${entry.instanceAid})`,
        currentStep: opIndex,
        totalSteps: totalOps,
        packageName: entry.name,
        packageAid: entry.packageAid,
        progressPercent: instProgress,
      })

      await this.cardManager.installAndMakeSelectable(
        entry.packageAid,
        entry.appletAid!,
        entry.instanceAid!,
        entry.privileges || '00',
        entry.installParams || '',
        signal
      )
    }

    // ==========================================
    // Phase 7: Complete
    // ==========================================
    this.emitProgress(options, {
      phase: 'complete',
      stepDescription: 'Provisioning completed successfully',
      currentStep: 10,
      totalSteps: 10,
      progressPercent: 100,
    })
  }

  private checkAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('GlobalPlatform provisioning aborted by user or signal')
    }
  }

  private emitProgress(options: ProvisioningOptions, event: ProvisioningProgressEvent): void {
    options.onProgress?.(event)
  }
}
