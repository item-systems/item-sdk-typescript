import { inflateRaw } from './inflate'

/**
 * JavaCard standard component tags in GlobalPlatform Load File Data Block (Tag 0xC4).
 * Canonical order defined by JavaCard Virtual Machine specification & GlobalPlatform 2.2 §11.6.2.3:
 * 1.  Header (Tag 1)
 * 2.  Directory (Tag 2)
 * 3.  Import (Tag 4)
 * 4.  Applet (Tag 3) - optional
 * 5.  Class (Tag 6)
 * 6.  Method (Tag 7)
 * 7.  StaticField (Tag 8)
 * 8.  Export (Tag 10) - optional
 * 9.  ConstantPool (Tag 5)
 * 10. RefLocation (Tag 9)
 * 11. Descriptor (Tag 11) - optional
 * 12. Debug (Tag 12) - optional
 */
export const ORDERED_COMPONENT_TAGS = [1, 2, 4, 3, 6, 7, 8, 10, 5, 9, 11, 12]

/**
 * Valid JavaCard component tags.
 */
const VALID_COMPONENT_TAG_SET = new Set(ORDERED_COMPONENT_TAGS)

const textDecoder = new TextDecoder('utf-8')

/**
 * Parse an in-memory ZIP archive using Central Directory records.
 *
 * This supports all valid ZIP archives regardless of whether data descriptors (bit 3)
 * or streaming compressors were used, because the Central Directory at the end of the
 * archive always contains the authoritative uncompressed size, compressed size, and local header offset.
 *
 * 100% portable pure TypeScript (DataView / Uint8Array) without Node Buffer or zlib dependencies.
 */
export function extractCapComponentsFromZip(zipBytes: Uint8Array): Map<number, Uint8Array> {
  const components = new Map<number, Uint8Array>()

  if (zipBytes.length < 22) {
    return components
  }

  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength)

  // 1. Locate the End of Central Directory (EOCD) signature: 0x06054b50 ("PK\x05\x06")
  let eocdOffset = -1
  const searchLimit = Math.max(0, zipBytes.length - 65557)
  for (let i = zipBytes.length - 22; i >= searchLimit; i--) {
    if (zipBytes[i] === 0x50 && zipBytes[i + 1] === 0x4b && zipBytes[i + 2] === 0x05 && zipBytes[i + 3] === 0x06) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    return components
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const cdOffset = view.getUint32(eocdOffset + 16, true)

  if (cdOffset >= zipBytes.length) {
    return components
  }

  // 2. Iterate through Central Directory records
  let cdPtr = cdOffset
  for (let entryIdx = 0; entryIdx < totalEntries && cdPtr + 46 <= zipBytes.length; entryIdx++) {
    const cdSig = view.getUint32(cdPtr, true)
    if (cdSig !== 0x02014b50) {
      break
    }

    const compressionMethod = view.getUint16(cdPtr + 10, true)
    const compressedSize = view.getUint32(cdPtr + 20, true)
    const fileNameLen = view.getUint16(cdPtr + 28, true)
    const extraFieldLen = view.getUint16(cdPtr + 30, true)
    const commentLen = view.getUint16(cdPtr + 32, true)
    const localHeaderOffset = view.getUint32(cdPtr + 42, true)

    const fileNameStart = cdPtr + 46
    const fileNameBytes = zipBytes.subarray(fileNameStart, fileNameStart + fileNameLen)
    const fileName = textDecoder.decode(fileNameBytes)

    cdPtr = fileNameStart + fileNameLen + extraFieldLen + commentLen

    if (!fileName.endsWith('.cap')) {
      continue
    }

    if (localHeaderOffset + 30 > zipBytes.length) {
      continue
    }

    const localSig = view.getUint32(localHeaderOffset, true)
    if (localSig !== 0x04034b50) {
      continue
    }

    const locFileNameLen = view.getUint16(localHeaderOffset + 26, true)
    const locExtraFieldLen = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + locFileNameLen + locExtraFieldLen

    if (dataStart + compressedSize > zipBytes.length) {
      continue
    }

    const compressedData = zipBytes.subarray(dataStart, dataStart + compressedSize)
    let decompressed: Uint8Array

    if (compressionMethod === 0) {
      decompressed = compressedData
    } else if (compressionMethod === 8) {
      decompressed = inflateRaw(compressedData)
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod} in ${fileName}`)
    }

    if (decompressed.length > 0) {
      const tag = decompressed[0]
      if (VALID_COMPONENT_TAG_SET.has(tag)) {
        components.set(tag, decompressed)
      }
    }
  }

  return components
}

/**
 * Parse a raw concatenated JavaCard component stream.
 */
export function parseRawComponentStream(streamBytes: Uint8Array): Map<number, Uint8Array> {
  const components = new Map<number, Uint8Array>()
  let offset = 0

  while (offset + 3 <= streamBytes.length) {
    const tag = streamBytes[offset]
    if (!VALID_COMPONENT_TAG_SET.has(tag)) {
      break
    }

    const payloadSize = (streamBytes[offset + 1] << 8) | streamBytes[offset + 2]
    const totalComponentLen = 3 + payloadSize

    if (offset + totalComponentLen > streamBytes.length) {
      break
    }

    const compData = streamBytes.subarray(offset, offset + totalComponentLen)
    components.set(tag, compData)
    offset += totalComponentLen
  }

  return components
}

/**
 * Unwrap Tag 0xC4 Load File Data Block to extract the inner component payload if present.
 */
export function unwrapLoadFileDataBlock(data: Uint8Array): Uint8Array {
  if (data.length > 2 && data[0] === 0xc4) {
    let derLenBytes = 1
    let payloadLen = 0

    if (data[1] < 128) {
      payloadLen = data[1]
      derLenBytes = 1
    } else if (data[1] === 0x81 && data.length >= 3) {
      payloadLen = data[2]
      derLenBytes = 2
    } else if (data[1] === 0x82 && data.length >= 4) {
      payloadLen = (data[2] << 8) | data[3]
      derLenBytes = 3
    } else if (data[1] === 0x83 && data.length >= 5) {
      payloadLen = (data[2] << 16) | (data[3] << 8) | data[4]
      derLenBytes = 4
    } else if (data[1] === 0x84 && data.length >= 6) {
      payloadLen = (data[2] << 24) | (data[3] << 16) | (data[4] << 8) | data[5]
      derLenBytes = 5
    }

    const start = 1 + derLenBytes
    if (start + payloadLen <= data.length) {
      return data.subarray(start, start + payloadLen)
    }
  }
  return data
}

/**
 * Encode length into ASN.1 / BER-TLV format.
 */
export function encodeDerLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length])
  } else if (length <= 0xff) {
    return new Uint8Array([0x81, length])
  } else if (length <= 0xffff) {
    return new Uint8Array([0x82, (length >> 8) & 0xff, length & 0xff])
  } else if (length <= 0xffffff) {
    return new Uint8Array([0x83, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])
  } else {
    return new Uint8Array([0x84, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])
  }
}

/**
 * Construct a standard GlobalPlatform Load File Data Block (Tag 0xC4)
 * from input bytes (ZIP-formatted .cap archive, raw component stream, or pre-wrapped block).
 */
export function buildLoadFileDataBlock(capBytes: Uint8Array): Uint8Array {
  const unwrapped = unwrapLoadFileDataBlock(capBytes)

  let components = extractCapComponentsFromZip(capBytes)

  if (components.size === 0) {
    components = parseRawComponentStream(unwrapped)
  }

  if (components.size > 0) {
    let componentsTotalLength = 0
    for (const tag of ORDERED_COMPONENT_TAGS) {
      const compData = components.get(tag)
      if (compData) {
        componentsTotalLength += compData.length
      }
    }

    const derLen = encodeDerLength(componentsTotalLength)
    const result = new Uint8Array(1 + derLen.length + componentsTotalLength)

    result[0] = 0xc4
    result.set(derLen, 1)

    let writeOffset = 1 + derLen.length
    for (const tag of ORDERED_COMPONENT_TAGS) {
      const compData = components.get(tag)
      if (compData) {
        result.set(compData, writeOffset)
        writeOffset += compData.length
      }
    }

    return result
  }

  const derLen = encodeDerLength(unwrapped.length)
  const result = new Uint8Array(1 + derLen.length + unwrapped.length)
  result[0] = 0xc4
  result.set(derLen, 1)
  result.set(unwrapped, 1 + derLen.length)
  return result
}
