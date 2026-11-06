import { sha256 } from '@noble/hashes/sha2.js'
const hex = (bytes: Uint8Array): string => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
function integer(value: number, max: number): void {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error('Invalid resource counter')
}
type PackageMemoryRequirements = Partial<
  Record<
    'peakAdditionalPersistentBytes' | 'peakTransientResetBytes' | 'peakTransientDeselectBytes' | 'additionalBlockSlots',
    number
  >
>

/** Public artifact identity. Never put credentials, UIDs or APDU payloads here. */
export interface QualificationArtifact {
  packageAid: string
  sha256: string
  sizeBytes: number
}
export interface QualificationContext {
  artifact: QualificationArtifact
  sourceCommit: string
  configuration: {
    id: string
    installParameters: string
    cardModel: string
    javacardVersion: string
    reader: string
    transport: string
    /** Entire installed baseline, not only direct dependencies. */
    baseline: (QualificationArtifact & { installParameters: string })[]
  }
  /** Required functional checks for this package, fixed BEFORE running tests. */
  requiredSteps: string[]
}
export interface QualificationSnapshot {
  persistentFreeBytes: number | null
  transientResetFreeBytes: number | null
  transientDeselectFreeBytes: number | null
  unusedCommitBytes: number | null
  leasedBlocks: number | null
}
export interface QualificationStep {
  name: string
  durationMs: number
  passed: boolean
}
export interface QualificationRun {
  before: QualificationSnapshot | null
  samples: QualificationSnapshot[]
  steps: QualificationStep[]
}

const label = (s: string): string => {
  if (typeof s !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9 ._:/+-]{0,99}$/.test(s))
    throw new Error('Invalid public qualification label')
  return s
}
const aid = (s: string): string => {
  if (typeof s !== 'string' || !/^(?:[0-9a-fA-F]{2}){5,16}$/.test(s)) throw new Error('Invalid package AID')
  return s.toUpperCase()
}
const artifact = (a: QualificationArtifact): QualificationArtifact => {
  if (!/^[0-9a-f]{64}$/.test(a.sha256)) throw new Error('Invalid CAP SHA-256')
  integer(a.sizeBytes, 1048576)
  if (!a.sizeBytes) throw new Error('Empty CAP')
  return { packageAid: aid(a.packageAid), sha256: a.sha256, sizeBytes: a.sizeBytes }
}
const parameters = (value: string): string => {
  if (typeof value !== 'string' || !/^(?:[0-9a-fA-F]{2}){0,256}$/.test(value))
    throw new Error('Invalid install parameters')
  return value.toUpperCase()
}
/** Hash the actual CAP bytes, not an executable-component digest or source tree. */
export function qualificationArtifact(packageAid: string, cap: Uint8Array): QualificationArtifact {
  return artifact({ packageAid, sha256: hex(sha256(cap)), sizeBytes: cap.length })
}
const snapshotKeys = [
  'persistentFreeBytes',
  'transientResetFreeBytes',
  'transientDeselectFreeBytes',
  'unusedCommitBytes',
  'leasedBlocks',
] as const
/** Selects only public resource counters; discards extra properties. */
export function qualificationSnapshot(memory: QualificationSnapshot): QualificationSnapshot {
  return Object.fromEntries(
    snapshotKeys.map(key => {
      const value = memory[key]
      if (value !== null) integer(value, 0xffffffff)
      return [key, value]
    })
  ) as unknown as QualificationSnapshot
}

/** Collects observations only. Does not connect, wipe, provision, retry, or save
 * anything. The caller owns the card workflow and must assert its UID privately.
 * Callbacks must throw when functional assertions fail. Their return values and
 * error messages are intentionally NOT retained in the public report.
 */
export class QualificationRecorder {
  private readonly context: QualificationContext
  private readonly runs: QualificationRun[] = []
  private current: QualificationRun | undefined
  private busy = false
  constructor(
    context: QualificationContext,
    private readonly clock: () => number = () => performance.now()
  ) {
    if (!/^[0-9a-f]{40}$/.test(context.sourceCommit)) throw new Error('Expected full source commit')
    const c = context.configuration
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(c.id)) throw new Error('Invalid configuration id')
    if (!context.requiredSteps.length || new Set(context.requiredSteps).size !== context.requiredSteps.length)
      throw new Error('Required steps must be nonempty and unique')
    const baseline = c.baseline
      .map(a => ({ ...artifact(a), installParameters: parameters(a.installParameters) }))
      .sort((a, b) => a.packageAid.localeCompare(b.packageAid))
    if (new Set(baseline.map(a => a.packageAid)).size !== baseline.length) throw new Error('Duplicate baseline package')
    this.context = {
      artifact: artifact(context.artifact),
      sourceCommit: context.sourceCommit,
      configuration: {
        id: c.id,
        installParameters: parameters(c.installParameters),
        cardModel: label(c.cardModel),
        javacardVersion: label(c.javacardVersion),
        reader: label(c.reader),
        transport: label(c.transport),
        baseline,
      },
      requiredSteps: context.requiredSteps.map(label),
    }
  }

  /** Every run must start from the same baseline. Null means unavailable (e.g.
   * before the kernel exists); it must never be replaced with zero free memory. */
  beginRun(before: QualificationSnapshot | null): void {
    if (this.current || this.busy) throw new Error('A run is already active')
    this.current = { before: before && qualificationSnapshot(before), samples: [], steps: [] }
  }

  sample(memory: QualificationSnapshot): void {
    if (!this.current) throw new Error('No active run')
    this.current.samples.push(qualificationSnapshot(memory))
  }

  async step<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const run = this.current
    if (!run || this.busy) throw new Error('Steps require an active, idle run')
    label(name)
    if (run.steps.some(s => s.name === name)) throw new Error('Duplicate step; use separate runs for repetitions')
    const start = this.clock()
    if (!Number.isFinite(start)) throw new Error('Invalid qualification clock')
    this.busy = true
    let passed = false
    let value!: T
    let failure: unknown
    try {
      value = await operation()
      passed = true
    } catch (error) {
      failure = error
    }
    let durationMs = NaN
    try {
      durationMs = this.clock() - start
    } catch {
      /* A broken clock invalidates evidence. */
    }
    this.busy = false
    const validClock = Number.isFinite(durationMs) && durationMs >= 0
    run.steps.push({ name, durationMs: validClock ? durationMs : 0, passed: passed && validClock })
    if (!passed) throw failure
    if (!validClock) throw new Error('Invalid qualification clock')
    return value
  }

  endRun(): void {
    if (!this.current || this.busy) throw new Error('No completed idle run')
    this.runs.push(this.current)
    this.current = undefined
  }

  /** Preserve incomplete evidence when the harness fails outside a timed step.
   * Never stores the exception text (which might contain credentials). */
  abortRun(): void {
    if (this.busy) throw new Error('Wait for the active step before aborting')
    const run = this.current ?? { before: null, samples: [], steps: [] }
    run.steps.push({ name: 'qualification-aborted', durationMs: 0, passed: false })
    this.runs.push(run)
    this.current = undefined
  }

  /** Snapshot deltas are lower-bound observations, NOT true allocation peaks.
   * Therefore generated memory profiles are always estimated. Transaction peaks
   * and largest allocations cannot be inferred and are deliberately omitted. */
  report() {
    if (this.current || this.busy || !this.runs.length) throw new Error('Finish at least one run first')
    const passed = this.runs.every(
      r =>
        r.steps.every(s => s.passed) &&
        this.context.requiredSteps.every(name => r.steps.some(s => s.name === name && s.passed))
    )
    const requirements: PackageMemoryRequirements = {}
    const mappings = [
      ['persistentFreeBytes', 'peakAdditionalPersistentBytes', -1],
      ['transientResetFreeBytes', 'peakTransientResetBytes', -1],
      ['transientDeselectFreeBytes', 'peakTransientDeselectBytes', -1],
      ['leasedBlocks', 'additionalBlockSlots', 1],
    ] as const
    for (const [counter, requirement, direction] of mappings) {
      if (
        this.runs.every(
          r => r.before?.[counter] != null && r.samples.length && r.samples.every(s => s[counter] !== null)
        )
      ) {
        requirements[requirement] = Math.max(
          0,
          ...this.runs.flatMap(r => r.samples.map(s => direction * (s[counter]! - r.before![counter]!)))
        )
        integer(requirements[requirement]!, 0x7fffffff)
      }
    }
    const c = this.context.configuration
    const memoryProfile =
      passed && Object.keys(requirements).length
        ? {
            schemaVersion: 1,
            configurations: [
              {
                id: c.id,
                installParameters: c.installParameters,
                measurement: {
                  method: 'estimated',
                  cardModel: c.cardModel,
                  javacardVersion: c.javacardVersion,
                  sampleCount: this.runs.length,
                },
                requirements,
              },
            ],
          }
        : null
    // JSON round-trip returns a detached value; callers cannot mutate recorder state.
    return JSON.parse(
      JSON.stringify({
        schemaVersion: 1,
        ...this.context,
        passed,
        runs: this.runs,
        memoryProfile,
        measurementBasis: 'sampled-deltas-not-allocation-peaks',
      })
    ) as {
      schemaVersion: number
      artifact: QualificationArtifact
      sourceCommit: string
      configuration: QualificationContext['configuration']
      requiredSteps: string[]
      passed: boolean
      runs: QualificationRun[]
      memoryProfile: typeof memoryProfile
      measurementBasis: string
    }
  }
}
