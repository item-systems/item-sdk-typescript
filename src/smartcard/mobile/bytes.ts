import { StatusWord } from './status'
export const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}
export function integer(value: number, max = 255): number {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`Expected integer 0–${max}`)
  return value
}
export const word = (n: number): Uint8Array => {
  integer(n, 65535)
  return Uint8Array.of(n >>> 8, n & 255)
}
export const hex = (a: Uint8Array): string => Array.from(a, n => n.toString(16).padStart(2, '0')).join('')
export function unhex(s: string, length?: number): Uint8Array {
  const clean = s.replace(/\s/g, '')
  if (!/^(?:[0-9a-fA-F]{2})*$/.test(clean)) throw new Error('Enter complete hexadecimal bytes')
  const out = Uint8Array.from(clean.match(/../g) ?? [], n => parseInt(n, 16))
  if (length !== undefined && out.length !== length) throw new Error(`Expected ${length} bytes`)
  return out
}
export function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
export class Cursor {
  offset = 0
  constructor(readonly data: Uint8Array) {}
  take(n: number): Uint8Array {
    if (n < 0 || this.offset + n > this.data.length) throw new Error('Truncated card response')
    const a = this.data.slice(this.offset, this.offset + n)
    this.offset += n
    return a
  }

  byte(): number {
    return this.take(1)[0]
  }

  word(): number {
    const a = this.take(2)
    return (a[0] << 8) | a[1]
  }

  end(): void {
    if (this.offset !== this.data.length) throw new Error('Unexpected trailing response bytes')
  }
}
const STATUS: Record<number, string> = {
  0x6982: 'Authentication failed',
  0x6985: 'Conditions not satisfied',
  0x6986: 'Permission denied',
  0x6a10: 'No master key present',
  0x6a11: 'Master key slots full',
  0x6a12: 'Crypto registry unavailable',
  0x6a13: 'Plugin already registered',
  0x6a82: 'Applet not found',
  0x6a84: 'Storage full',
  0x6a86: 'Invalid slot or parameters',
  0x6d00: 'Command not supported by this firmware',
  0x6700: 'Invalid command length',
}
export class CardError extends Error {
  constructor(readonly status: number) {
    super(
      `${
        STATUS[status] ??
        Object.entries(StatusWord)
          .find(([, value]) => value === status)?.[0]
          ?.replace(/^SW_/, '')
          .replace(/_/g, ' ') ??
        'Card command failed'
      } (${status.toString(16).toUpperCase()})`
    )
  }
}
export function response(raw: Uint8Array): Uint8Array {
  if (raw.length < 2) throw new Error('Truncated APDU response')
  const sw = (raw[raw.length - 2] << 8) | raw[raw.length - 1]
  if (sw !== 0x9000) throw new CardError(sw)
  return raw.slice(0, -2)
}
export function apdu(cla: number, ins: number, p1 = 0, p2 = 0, data: Uint8Array = new Uint8Array(0)): Uint8Array {
  ;[cla, ins, p1, p2, data.length].forEach(n => integer(n))
  return concat(Uint8Array.of(cla, ins, p1, p2, data.length), data)
}
export function derivationPath(path: string): Uint8Array {
  if (!/^m(?:\/[0-9]+'?){0,10}$/.test(path))
    throw new Error("Use a path such as m/44'/888'/0'/0/0 (maximum 10 components)")
  const out = new Uint8Array(Math.max(0, path.split('/').length - 1) * 4)
  path
    .split('/')
    .slice(1)
    .forEach((part, i) => {
      const hardened = part.endsWith("'")
      const n = Number(part.replace("'", ''))
      integer(n, 0x7fffffff)
      new DataView(out.buffer).setUint32(i * 4, n + (hardened ? 0x80000000 : 0), false)
    })
  return out
}
