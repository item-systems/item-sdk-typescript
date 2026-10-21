import { inflateRawSync } from 'zlib'

/**
 * JavaCard standard component tags in GlobalPlatform Load File Data Block (Tag 0xC4).
 * Order defined by JavaCard Virtual Machine specification & GlobalPlatform 2.2 §11.6.2.3:
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
 */
const ORDERED_COMPONENT_TAGS = [1, 2, 4, 3, 6, 7, 8, 10, 5, 9, 11]

/**
 * Parse an in-memory ZIP archive (standard .cap file format output by JavaCard SDK / Gradle)
 * and extract the ordered JavaCard component bytes.
 */
export function extractCapComponentsFromZip(zipBytes: Uint8Array): Map<number, Uint8Array> {
  const components = new Map<number, Uint8Array>()
  const buf = Buffer.from(zipBytes)

  // Quick check for ZIP Local File Header magic: PK\x03\x04
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    // If not a ZIP, check if it is already a raw Component TLV or Load File Data Block
    if (buf[0] === 0xc4 || ORDERED_COMPONENT_TAGS.includes(buf[0])) {
      return components // Already raw format
    }
    throw new Error('Invalid CAP format: expected ZIP archive (PK\\x03\\x04) or raw component stream')
  }

  let offset = 0
  while (offset + 30 <= buf.length) {
    const signature = buf.readUInt32LE(offset)
    if (signature !== 0x04034b50) {
      // Reached central directory or end of local file headers
      break
    }

    const compressionMethod = buf.readUInt16LE(offset + 8)
    const compressedSize = buf.readUInt32LE(offset + 18)
    const fileNameLen = buf.readUInt16LE(offset + 26)
    const extraFieldLen = buf.readUInt16LE(offset + 28)

    const fileNameStart = offset + 30
    const fileName = buf.toString('utf8', fileNameStart, fileNameStart + fileNameLen)
    const dataStart = fileNameStart + fileNameLen + extraFieldLen

    if (dataStart + compressedSize > buf.length) {
      break
    }

    const compressedData = buf.subarray(dataStart, dataStart + compressedSize)
    let decompressed: Buffer

    if (compressionMethod === 0) {
      // Stored (no compression)
      decompressed = compressedData
    } else if (compressionMethod === 8) {
      // Deflated
      decompressed = inflateRawSync(compressedData)
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod} in file ${fileName}`)
    }

    if (fileName.endsWith('.cap') && decompressed.length > 0) {
      const tag = decompressed[0]
      if (ORDERED_COMPONENT_TAGS.includes(tag)) {
        components.set(tag, new Uint8Array(decompressed))
      }
    }

    offset = dataStart + compressedSize
  }

  return components
}

/**
 * Encode length into ASN.1 / BER-TLV format.
 */
function encodeDerLength(length: number): Uint8Array {
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
 * from a raw CAP file (ZIP archive or component stream).
 *
 * Per GlobalPlatform 2.2 §11.6.2.3:
 * Load File Data Block = 0xC4 || DER-length || [Component 1 TLV || Component 2 TLV || ...]
 * in strict JavaCard VM specification component order.
 */
export function buildLoadFileDataBlock(capBytes: Uint8Array): Uint8Array {
  // If already wrapped in Tag 0xC4, return directly
  if (capBytes.length > 2 && capBytes[0] === 0xc4) {
    return capBytes
  }

  const components = extractCapComponentsFromZip(capBytes)

  // If no components were extracted (e.g. raw component stream without ZIP), return input
  if (components.size === 0) {
    return capBytes
  }

  // Calculate total payload length across all components in canonical order
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
