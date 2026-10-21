/**
 * Zero-dependency pure TypeScript RFC 1951 (DEFLATE / Inflate Raw) decompressor.
 * Compatible with all JavaScript runtimes: Node.js, Web Browsers, React Native (Hermes/JSC),
 * Expo, and Electron without requiring Node 'zlib' or 'buffer'.
 */

// Length code base values and extra bits (codes 257..285)
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
]
const LENGTH_EXTRA_BITS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]

// Distance code base values and extra bits (codes 0..29)
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
]
const DISTANCE_EXTRA_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]

// Code length order for dynamic header decoding
const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

class BitReader {
  public data: Uint8Array
  public bytePos = 0
  public bitBuffer = 0
  public bitCount = 0

  constructor(data: Uint8Array) {
    this.data = data
  }

  public readBits(n: number): number {
    while (this.bitCount < n) {
      if (this.bytePos >= this.data.length) {
        throw new Error('Unexpected end of DEFLATE stream')
      }
      this.bitBuffer |= this.data[this.bytePos++] << this.bitCount
      this.bitCount += 8
    }
    const val = this.bitBuffer & ((1 << n) - 1)
    this.bitBuffer >>>= n
    this.bitCount -= n
    return val
  }

  public alignToByte(): void {
    this.bitBuffer = 0
    this.bitCount = 0
  }

  public readBytes(len: number): Uint8Array {
    this.alignToByte()
    if (this.bytePos + len > this.data.length) {
      throw new Error('Unexpected end of DEFLATE uncompressed block')
    }
    const bytes = this.data.subarray(this.bytePos, this.bytePos + len)
    this.bytePos += len
    return bytes
  }
}

interface HuffmanTree {
  table: Int32Array
  maxBits: number
}

function buildHuffmanTree(lengths: Uint8Array | number[]): HuffmanTree {
  let maxBits = 0
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > maxBits) {
      maxBits = lengths[i]
    }
  }

  if (maxBits === 0) {
    return { table: new Int32Array(0), maxBits: 0 }
  }

  const blCount = new Uint16Array(maxBits + 1)
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > 0) {
      blCount[lengths[i]]++
    }
  }

  const nextCode = new Uint32Array(maxBits + 1)
  let code = 0
  for (let bits = 1; bits <= maxBits; bits++) {
    code = (code + blCount[bits - 1]) << 1
    nextCode[bits] = code
  }

  const tableSize = 1 << maxBits
  const table = new Int32Array(tableSize).fill(-1)

  for (let sym = 0; sym < lengths.length; sym++) {
    const len = lengths[sym]
    if (len > 0) {
      const symCode = nextCode[len]++
      // Bit-reverse symCode into index of maxBits
      let revCode = 0
      for (let j = 0; j < len; j++) {
        revCode = (revCode << 1) | ((symCode >> j) & 1)
      }
      // Fill in all entries that match this prefix
      const step = 1 << len
      for (let idx = revCode; idx < tableSize; idx += step) {
        table[idx] = (sym << 4) | len
      }
    }
  }

  return { table, maxBits }
}

function decodeSymbol(reader: BitReader, tree: HuffmanTree): number {
  if (tree.maxBits === 0) {
    throw new Error('Empty Huffman tree')
  }
  // Peek maxBits from bitBuffer without consuming immediately
  while (reader.bitCount < tree.maxBits && reader.bytePos < reader.data.length) {
    reader.bitBuffer |= reader.data[reader.bytePos++] << reader.bitCount
    reader.bitCount += 8
  }

  const mask = (1 << tree.maxBits) - 1
  const lookup = tree.table[reader.bitBuffer & mask]
  if (lookup === -1) {
    throw new Error('Invalid Huffman symbol in DEFLATE stream')
  }

  const sym = lookup >> 4
  const len = lookup & 0x0f

  reader.bitBuffer >>>= len
  reader.bitCount -= len

  return sym
}

// Lazy init fixed trees
let fixedLitTree: HuffmanTree | null = null
let fixedDistTree: HuffmanTree | null = null

function getFixedTrees(): [HuffmanTree, HuffmanTree] {
  if (!fixedLitTree || !fixedDistTree) {
    const litLengths = new Uint8Array(288)
    for (let i = 0; i <= 143; i++) litLengths[i] = 8
    for (let i = 144; i <= 255; i++) litLengths[i] = 9
    for (let i = 256; i <= 279; i++) litLengths[i] = 7
    for (let i = 280; i <= 287; i++) litLengths[i] = 8
    fixedLitTree = buildHuffmanTree(litLengths)

    const distLengths = new Uint8Array(32).fill(5)
    fixedDistTree = buildHuffmanTree(distLengths)
  }
  return [fixedLitTree, fixedDistTree]
}

/**
 * Decompress a raw RFC 1951 DEFLATE byte stream (without zlib or gzip headers).
 */
export function inflateRaw(compressed: Uint8Array): Uint8Array {
  const reader = new BitReader(compressed)
  let output = new Uint8Array(Math.max(compressed.length * 3, 1024))
  let outPos = 0

  function ensureCapacity(needed: number) {
    if (outPos + needed > output.length) {
      const nextSize = Math.max(output.length * 2, outPos + needed + 1024)
      const next = new Uint8Array(nextSize)
      next.set(output)
      output = next
    }
  }

  let isFinal = false
  while (!isFinal) {
    isFinal = reader.readBits(1) === 1
    const blockType = reader.readBits(2)

    if (blockType === 0) {
      // Uncompressed block
      reader.alignToByte()
      const len = reader.readBits(16)
      const nlen = reader.readBits(16)
      if ((len ^ 0xffff) !== nlen) {
        throw new Error('Invalid uncompressed block length in DEFLATE')
      }
      const raw = reader.readBytes(len)
      ensureCapacity(raw.length)
      output.set(raw, outPos)
      outPos += raw.length
    } else if (blockType === 1 || blockType === 2) {
      // Huffman compressed block
      let litTree: HuffmanTree
      let distTree: HuffmanTree

      if (blockType === 1) {
        // Fixed Huffman
        ;[litTree, distTree] = getFixedTrees()
      } else {
        // Dynamic Huffman
        const hlit = reader.readBits(5) + 257
        const hdist = reader.readBits(5) + 1
        const hclen = reader.readBits(4) + 4

        const codeLengths = new Uint8Array(19)
        for (let i = 0; i < hclen; i++) {
          codeLengths[CODE_LENGTH_ORDER[i]] = reader.readBits(3)
        }
        const codeTree = buildHuffmanTree(codeLengths)

        const totalCodes = hlit + hdist
        const treeLengths = new Uint8Array(totalCodes)
        let idx = 0
        while (idx < totalCodes) {
          const sym = decodeSymbol(reader, codeTree)
          if (sym < 16) {
            treeLengths[idx++] = sym
          } else if (sym === 16) {
            const repeat = reader.readBits(2) + 3
            const prev = idx > 0 ? treeLengths[idx - 1] : 0
            for (let r = 0; r < repeat && idx < totalCodes; r++) {
              treeLengths[idx++] = prev
            }
          } else if (sym === 17) {
            const repeat = reader.readBits(3) + 3
            for (let r = 0; r < repeat && idx < totalCodes; r++) {
              treeLengths[idx++] = 0
            }
          } else if (sym === 18) {
            const repeat = reader.readBits(7) + 11
            for (let r = 0; r < repeat && idx < totalCodes; r++) {
              treeLengths[idx++] = 0
            }
          }
        }

        litTree = buildHuffmanTree(treeLengths.subarray(0, hlit))
        distTree = buildHuffmanTree(treeLengths.subarray(hlit))
      }

      // Decode symbols
      while (true) {
        const sym = decodeSymbol(reader, litTree)
        if (sym < 256) {
          ensureCapacity(1)
          output[outPos++] = sym
        } else if (sym === 256) {
          // End of block
          break
        } else {
          // Length-distance copy
          const lengthCode = sym - 257
          const lengthExtra = LENGTH_EXTRA_BITS[lengthCode]
          const length = LENGTH_BASE[lengthCode] + (lengthExtra > 0 ? reader.readBits(lengthExtra) : 0)

          const distCode = decodeSymbol(reader, distTree)
          const distExtra = DISTANCE_EXTRA_BITS[distCode]
          const distance = DISTANCE_BASE[distCode] + (distExtra > 0 ? reader.readBits(distExtra) : 0)

          if (distance > outPos) {
            throw new Error(`Invalid back-reference distance in DEFLATE: ${distance} > ${outPos}`)
          }

          ensureCapacity(length)
          let srcPos = outPos - distance
          for (let k = 0; k < length; k++) {
            output[outPos++] = output[srcPos++]
          }
        }
      }
    } else {
      throw new Error(`Reserved DEFLATE block type: ${blockType}`)
    }
  }

  return output.subarray(0, outPos)
}
