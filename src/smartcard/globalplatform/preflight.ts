import { uint8ToHex } from '../utils'
import { extractCapComponentsFromZip, parseRawComponentStream, unwrapLoadFileDataBlock } from './cap-parser'

/**
 * Standard JavaCard Platform Packages present on compliant JavaCard 3.0.4 / 3.0.5 / 3.1 runtimes.
 * These packages do not need to be loaded by user topologies.
 */
export const STANDARD_JAVACARD_SYSTEM_PACKAGE_AIDS = new Set([
  'A0000000620001', // java.lang
  'A0000000620002', // java.io
  'A0000000620003', // java.rmi
  'A0000000620101', // javacard.framework
  'A0000000620102', // javacard.security
  'A0000000620201', // javacardx.crypto
  'A0000000620202', // javacardx.biometry
  'A0000000620203', // javacardx.external
  'A0000000620204', // javacardx.framework
  'A0000000620205', // javacardx.apdu
  'A0000000620208', // javacardx.security
  'A0000000620209', // javacardx.framework.util
  'A00000015100', // org.globalplatform
])

/**
 * Parsed metadata from a validated CAP file.
 */
export interface CapValidationMetadata {
  packageAid: string
  packageVersion: string
  capVersion: string
  flags: number
  importedPackageAids: string[]
  appletAids: string[]
  componentSizes: Record<number, number>
}

/**
 * Result of validating an individual CAP file.
 */
export interface CapValidationResult {
  valid: boolean
  errors: string[]
  metadata?: CapValidationMetadata
}

/**
 * Validated preflight plan for a multi-package deployment topology.
 */
export interface TopologyPreflightPlan {
  valid: boolean
  errors: string[]
  plannedExecutionOrder: string[] // Package AIDs in topological load order
  packageMetadata: Map<string, CapValidationMetadata>
  missingDependencies: Map<string, string[]> // Map of package AID -> array of unfulfilled import AIDs
}

/**
 * Entry input for topology preflight validation.
 */
export interface TopologyPreflightInput {
  name: string
  packageAid: string
  capBytes: Uint8Array
  isLibrary?: boolean
  appletAid?: string
  instanceAid?: string
  privileges?: string
  installParams?: string
}

function normalizeHex(hex: string): string {
  return hex
    .replace(/^0x/i, '')
    .replace(/[\s_:-]/g, '')
    .toUpperCase()
}

function isValidAidHex(hex: string): boolean {
  const norm = normalizeHex(hex)
  return /^[0-9A-F]+$/.test(norm) && norm.length >= 10 && norm.length <= 32 && norm.length % 2 === 0
}

function isValidHexBytes(hex: string): boolean {
  const norm = normalizeHex(hex)
  if (norm.length === 0) return true
  return /^[0-9A-F]+$/.test(norm) && norm.length % 2 === 0
}

/**
 * Strict validator for JavaCard CAP files (v2.1 / v2.2 / v3.0 format).
 *
 * Enforces:
 * 1. Valid ZIP structure or valid raw component stream.
 * 2. Header.cap contains magic number 0xDECAFFED.
 * 3. Required components are present (Header tag 1, Directory tag 2, Import tag 4, Class tag 6, Method tag 7, StaticField tag 8, ConstantPool tag 5, RefLocation tag 9).
 * 4. Extracted Header package AID matches declared package AID.
 * 5. Component sizes match Directory.cap component size table.
 * 6. Parsing of Import.cap and Applet.cap.
 */
export function validateCap(capBytes: Uint8Array, declaredPackageAid?: string): CapValidationResult {
  const errors: string[] = []

  if (!capBytes || capBytes.length === 0) {
    return {
      valid: false,
      errors: ['Invalid CAP file: empty or null byte buffer'],
    }
  }

  const unwrapped = unwrapLoadFileDataBlock(capBytes)

  let components = extractCapComponentsFromZip(capBytes)
  if (components.size === 0) {
    components = parseRawComponentStream(unwrapped)
  }

  if (components.size === 0) {
    return {
      valid: false,
      errors: ['Invalid CAP file: neither a valid ZIP archive nor a recognizable raw JavaCard component stream'],
    }
  }

  // 1. Check required components
  // Standard required components for an executable library/applet CAP:
  // Tag 1 (Header), Tag 2 (Directory), Tag 4 (Import), Tag 5 (ConstantPool), Tag 6 (Class), Tag 7 (Method), Tag 8 (StaticField), Tag 9 (RefLocation)
  const REQUIRED_TAGS = [1, 2, 4, 5, 6, 7, 8, 9]
  for (const tag of REQUIRED_TAGS) {
    if (!components.has(tag)) {
      errors.push(`Missing mandatory JavaCard component Tag ${tag} (e.g. Header=1, Directory=2, Import=4, etc.)`)
    }
  }

  const header = components.get(1)
  if (!header || header.length < 13) {
    errors.push('Header.cap is missing or truncated')
    return { valid: false, errors }
  }

  // 2. Validate Header magic (0xDECAFFED)
  const magic = (header[3] << 24) | (header[4] << 16) | (header[5] << 8) | header[6]
  if (magic >>> 0 !== 0xdecaffed) {
    errors.push(`Invalid Header.cap magic: 0x${(magic >>> 0).toString(16).toUpperCase()} (expected 0xDECAFFED)`)
  }

  const capMinor = header[7]
  const capMajor = header[8]
  const flags = header[9]
  const pkgMinor = header[10]
  const pkgMajor = header[11]
  const pkgAidLen = header[12]

  if (13 + pkgAidLen > header.length) {
    errors.push('Header.cap truncated while reading package AID')
    return { valid: false, errors }
  }

  if (pkgAidLen < 5 || pkgAidLen > 16) {
    errors.push(`Invalid package AID length in Header.cap: ${pkgAidLen} bytes (expected 5..16 bytes per ISO 7816-4)`)
  }

  const parsedPackageAid = uint8ToHex(header.subarray(13, 13 + pkgAidLen)).toUpperCase()

  if (declaredPackageAid) {
    const cleanDeclared = normalizeHex(declaredPackageAid)
    if (parsedPackageAid !== cleanDeclared) {
      errors.push(
        `Package AID mismatch: Header.cap contains ${parsedPackageAid}, but topology declared ${cleanDeclared}`
      )
    }
  }

  // 3. Validate Directory.cap component size table
  const directory = components.get(2)
  const componentSizes: Record<number, number> = {}

  if (directory && directory.length >= 3) {
    for (let tag = 1; tag <= 12; tag++) {
      const off = 3 + (tag - 1) * 2
      if (off + 2 <= directory.length) {
        const declaredSize = (directory[off] << 8) | directory[off + 1]
        componentSizes[tag] = declaredSize
        const actualComp = components.get(tag)
        if (declaredSize > 0) {
          if (!actualComp) {
            errors.push(
              `Directory.cap declares component Tag ${tag} with size ${declaredSize}, but component is missing`
            )
          } else {
            // Actual component bytes = 3-byte component header + declared size
            const expectedTotalLen = 3 + declaredSize
            if (actualComp.length !== expectedTotalLen) {
              errors.push(
                `Component Tag ${tag} length mismatch: Directory declared payload ${declaredSize} (total ${expectedTotalLen}B), actual length is ${actualComp.length}B`
              )
            }
          }
        }
      }
    }
  }

  // 4. Parse Import.cap dependencies
  const importedPackageAids: string[] = []
  const importComp = components.get(4)
  if (importComp && importComp.length >= 4) {
    const count = importComp[3]
    let off = 4
    for (let i = 0; i < count && off + 3 <= importComp.length; i++) {
      const aidLen = importComp[off + 2]
      if (off + 3 + aidLen <= importComp.length) {
        const aid = uint8ToHex(importComp.subarray(off + 3, off + 3 + aidLen)).toUpperCase()
        importedPackageAids.push(aid)
        off += 3 + aidLen
      }
    }
  }

  // 5. Parse Applet.cap instances
  const appletAids: string[] = []
  const appletComp = components.get(3)
  if (appletComp && appletComp.length >= 4) {
    const count = appletComp[3]
    let off = 4
    for (let i = 0; i < count && off + 1 <= appletComp.length; i++) {
      const aidLen = appletComp[off]
      if (off + 1 + aidLen <= appletComp.length) {
        const aid = uint8ToHex(appletComp.subarray(off + 1, off + 1 + aidLen)).toUpperCase()
        appletAids.push(aid)
        off += 1 + aidLen + 2 // Skip install_method_offset (2B)
      }
    }
  }

  const metadata: CapValidationMetadata = {
    packageAid: parsedPackageAid,
    packageVersion: `${pkgMajor}.${pkgMinor}`,
    capVersion: `${capMajor}.${capMinor}`,
    flags,
    importedPackageAids,
    appletAids,
    componentSizes,
  }

  return {
    valid: errors.length === 0,
    errors,
    metadata,
  }
}

/**
 * Perform a full offline preflight check across a multi-package deployment topology.
 *
 * Verifies:
 * 1. Every entry has valid AID formatting (5..16 bytes, valid hex).
 * 2. Every CAP in the topology is strictly valid.
 * 3. Package AIDs match declarations.
 * 4. Applet and instance AIDs are strictly valid and non-library entries specify applet/instance AIDs defined in Applet.cap.
 * 5. Privileges and installParams are valid hex strings.
 * 6. All package dependencies (Import.cap) are satisfied either by the topology itself or by standard JavaCard/GlobalPlatform platform packages.
 * 7. Resolves the dependency DAG and determines the strict acyclic topological loading sequence.
 * 8. Detects any circular dependencies or missing requirements before any card operations are performed.
 */
export function preflightTopology(topology: TopologyPreflightInput[]): TopologyPreflightPlan {
  const errors: string[] = []
  const packageMetadata = new Map<string, CapValidationMetadata>()
  const missingDependencies = new Map<string, string[]>()
  const topologyAids = new Set<string>()
  const declaredInstanceAids = new Set<string>()

  if (!topology || topology.length === 0) {
    return {
      valid: false,
      errors: ['Topology is empty: no packages to preflight'],
      plannedExecutionOrder: [],
      packageMetadata,
      missingDependencies,
    }
  }

  // 1. Validate each individual entry and CAP
  for (const entry of topology) {
    if (!entry.packageAid || !isValidAidHex(entry.packageAid)) {
      errors.push(
        `Invalid package AID format in topology entry '${entry.name}': '${entry.packageAid}' (must be 5..16 hex bytes)`
      )
      continue
    }

    const cleanAid = normalizeHex(entry.packageAid)
    if (topologyAids.has(cleanAid)) {
      errors.push(`Duplicate package AID in topology: ${cleanAid} (${entry.name})`)
    }
    topologyAids.add(cleanAid)

    // Validate CAP binary
    const capResult = validateCap(entry.capBytes, cleanAid)
    if (!capResult.valid || !capResult.metadata) {
      errors.push(`Validation failed for ${entry.name} (${cleanAid}): ${capResult.errors.join('; ')}`)
      continue
    }

    const meta = capResult.metadata
    packageMetadata.set(cleanAid, meta)

    // Validate Applet / Instance Metadata
    if (entry.isLibrary) {
      if (entry.appletAid || entry.instanceAid) {
        errors.push(`Entry '${entry.name}' is marked as library (isLibrary=true) but declares appletAid/instanceAid`)
      }
    } else {
      // If not a library, verify appletAid and instanceAid
      if (!entry.appletAid) {
        // If the CAP has applets defined in Applet.cap, appletAid is required
        if (meta.appletAids.length > 0) {
          errors.push(
            `Entry '${entry.name}' defines applet module(s) [${meta.appletAids.join(', ')}] in Applet.cap but lacks declared appletAid`
          )
        }
      } else {
        if (!isValidAidHex(entry.appletAid)) {
          errors.push(`Invalid applet AID format in entry '${entry.name}': '${entry.appletAid}'`)
        } else {
          const cleanAppletAid = normalizeHex(entry.appletAid)
          if (!meta.appletAids.includes(cleanAppletAid)) {
            errors.push(
              `Declared appletAid '${cleanAppletAid}' in entry '${entry.name}' was not found in CAP Applet.cap modules [${meta.appletAids.join(', ')}]`
            )
          }
        }
      }

      if (entry.appletAid && !entry.instanceAid) {
        errors.push(`Entry '${entry.name}' specifies appletAid but is missing instanceAid`)
      }

      if (entry.instanceAid) {
        if (!isValidAidHex(entry.instanceAid)) {
          errors.push(`Invalid instance AID format in entry '${entry.name}': '${entry.instanceAid}'`)
        } else {
          const cleanInstAid = normalizeHex(entry.instanceAid)
          if (declaredInstanceAids.has(cleanInstAid)) {
            errors.push(`Duplicate instance AID declared in topology: '${cleanInstAid}' in entry '${entry.name}'`)
          }
          declaredInstanceAids.add(cleanInstAid)
        }
      }

      if (entry.privileges && !isValidHexBytes(entry.privileges)) {
        errors.push(`Invalid hex string for privileges in entry '${entry.name}': '${entry.privileges}'`)
      }

      if (entry.installParams && !isValidHexBytes(entry.installParams)) {
        errors.push(`Invalid hex string for installParams in entry '${entry.name}': '${entry.installParams}'`)
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      plannedExecutionOrder: [],
      packageMetadata,
      missingDependencies,
    }
  }

  // 2. Check import satisfaction
  for (const [pkgAid, meta] of packageMetadata.entries()) {
    const missingForPkg: string[] = []
    for (const importAid of meta.importedPackageAids) {
      const isSystemPkg = STANDARD_JAVACARD_SYSTEM_PACKAGE_AIDS.has(importAid)
      const isTopologyPkg = topologyAids.has(importAid)

      if (!isSystemPkg && !isTopologyPkg) {
        missingForPkg.push(importAid)
      }
    }
    if (missingForPkg.length > 0) {
      missingDependencies.set(pkgAid, missingForPkg)
      errors.push(`Package ${pkgAid} requires missing dependency AIDs: ${missingForPkg.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      plannedExecutionOrder: [],
      packageMetadata,
      missingDependencies,
    }
  }

  // 3. Topological Sort (Kahn's Algorithm for DAG ordering & cycle detection)
  // Dependencies: if A imports B, B must be loaded BEFORE A (B -> A edge)
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const aid of topologyAids) {
    inDegree.set(aid, 0)
    adjacency.set(aid, [])
  }

  for (const [pkgAid, meta] of packageMetadata.entries()) {
    for (const depAid of meta.importedPackageAids) {
      if (topologyAids.has(depAid) && depAid !== pkgAid) {
        adjacency.get(depAid)!.push(pkgAid)
        inDegree.set(pkgAid, (inDegree.get(pkgAid) || 0) + 1)
      }
    }
  }

  const queue: string[] = []
  for (const [aid, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(aid)
    }
  }

  // If initial queue has multiple items, preserve the original topology array ordering where independent
  queue.sort((a, b) => {
    const idxA = topology.findIndex(t => normalizeHex(t.packageAid) === a)
    const idxB = topology.findIndex(t => normalizeHex(t.packageAid) === b)
    return idxA - idxB
  })

  const plannedExecutionOrder: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    plannedExecutionOrder.push(current)

    const dependents = adjacency.get(current) || []
    for (const dep of dependents) {
      const nextDeg = inDegree.get(dep)! - 1
      inDegree.set(dep, nextDeg)
      if (nextDeg === 0) {
        queue.push(dep)
        queue.sort((a, b) => {
          const idxA = topology.findIndex(t => normalizeHex(t.packageAid) === a)
          const idxB = topology.findIndex(t => normalizeHex(t.packageAid) === b)
          return idxA - idxB
        })
      }
    }
  }

  if (plannedExecutionOrder.length < topologyAids.size) {
    errors.push('Circular dependency detected in package topology imports! Topological loading order impossible.')
  }

  return {
    valid: errors.length === 0,
    errors,
    plannedExecutionOrder,
    packageMetadata,
    missingDependencies,
  }
}
