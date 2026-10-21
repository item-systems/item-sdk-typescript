import { inflateRawSync } from 'zlib'

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

/**
 * Parse an in-memory ZIP archive using Central Directory records.
 *
 * This supports all valid ZIP archives regardless of whether data descriptors (bit 3)
 * or streaming compressors were used, because the Central Directory at the end of the
 * archive always contains the authoritative uncompressed size, compressed size, and local header offset.
 */
export function extractCapComponentsFromZip(zipBytes: Uint8Array): Map<number, Uint8Array> {
  const components = new Map<number, Uint8Array>()
  const buf = Buffer.from(zipBytes)

  // Quick check for minimum ZIP length (at least End of Central Directory record = 22 bytes)
  if (buf.length < 22) {
    return components
  }

  // 1. Locate the End of Central Directory (EOCD) signature: 0x06054b50 ("PK\x05\x06")
  // Search backward from the end of buffer (EOCD can have up to 65535 bytes comment)
  let eocdOffset = -1
  const searchLimit = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= searchLimit; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    // Not a valid ZIP file with EOCD
    return components
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10)
  const cdOffset = buf.readUInt32LE(eocdOffset + 16)

  if (cdOffset >= buf.length) {
    return components
  }

  // 2. Iterate through Central Directory records
  let cdPtr = cdOffset
  for (let entryIdx = 0; entryIdx < totalEntries && cdPtr + 46 <= buf.length; entryIdx++) {
    const cdSig = buf.readUInt32LE(cdPtr)
    if (cdSig !== 0x02014b50) {
      // Signature mismatch ("PK\x01\x02")
      break
    }

    const compressionMethod = buf.readUInt16LE(cdPtr + 10)
    const compressedSize = buf.readUInt32LE(cdPtr + 20)
    const fileNameLen = buf.readUInt16LE(cdPtr + 28)
    const extraFieldLen = buf.readUInt16LE(cdPtr + 30)
    const commentLen = buf.readUInt16LE(cdPtr + 32)
    const localHeaderOffset = buf.readUInt32LE(cdPtr + 42)

    const fileNameStart = cdPtr + 46
    const fileName = buf.toString('utf8', fileNameStart, fileNameStart + fileNameLen)

    // Move to next Central Directory record
    cdPtr = fileNameStart + fileNameLen + extraFieldLen + commentLen

    // Only process .cap component files
    if (!fileName.endsWith('.cap')) {
      continue
    }

    // Read Local File Header to find exact file data start offset
    if (localHeaderOffset + 30 > buf.length) {
      continue
    }

    const localSig = buf.readUInt32LE(localHeaderOffset)
    if (localSig !== 0x04034b50) {
      continue
    }

    const locFileNameLen = buf.readUInt16LE(localHeaderOffset + 26)
    const locExtraFieldLen = buf.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + locFileNameLen + locExtraFieldLen

    if (dataStart + compressedSize > buf.length) {
      continue
    }

    const compressedData = buf.subarray(dataStart, dataStart + compressedSize)
    let decompressed: Buffer

    if (compressionMethod === 0) {
      // Stored (uncompressed)
      decompressed = compressedData
    } else if (compressionMethod === 8) {
      // Deflated
      decompressed = inflateRawSync(compressedData)
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod} in ${fileName}`)
    }

    if (decompressed.length > 0) {
      const tag = decompressed[0]
      if (VALID_COMPONENT_TAG_SET.has(tag)) {
        components.set(tag, new Uint8Array(decompressed))
      }
    }
  }

  return components
}

/**
 * Parse a raw concatenated JavaCard component stream.
 *
 * Each component starts with Tag (1B), Size (2B big-endian), followed by Size bytes of payload.
 * Total component length is 3 + Size bytes.
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
 *
 * Guarantees that the output always starts with Tag 0xC4, DER-length, and contains the ordered
 * JavaCard components (Header, Directory, Import, Applet, Class, Method, StaticField, Export,
 * ConstantPool, RefLocation, Descriptor, Debug) per GlobalPlatform 2.2 §11.6.2.3.
 */
export function buildLoadFileDataBlock(capBytes: Uint8Array): Uint8Array {
  // If input is wrapped in 0xC4, unwrap first so we can validate and ensure canonical ordering
  const unwrapped = unwrapLoadFileDataBlock(capBytes)

  // 1. Try Central Directory ZIP extraction
  let components = extractCapComponentsFromZip(capBytes)

  // 2. If not a ZIP (or no components in ZIP), try parsing as a raw concatenated component stream
  if (components.size === 0) {
    components = parseRawComponentStream(unwrapped)
  }

  // 3. If components were successfully identified, construct the canonical Tag 0xC4 Data Block
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

    result[0] = 0xc4 // Tag: Load File Data Block
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

  // 4. Fallback for opaque pre-formatted raw component streams: wrap in Tag 0xC4
  const derLen = encodeDerLength(unwrapped.length)
  const result = new Uint8Array(1 + derLen.length + unwrapped.length)
  result[0] = 0xc4
  result.set(derLen, 1)
  result.set(unwrapped, 1 + derLen.length)
  return result
}
