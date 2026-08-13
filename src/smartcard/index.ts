/**
 * Supported portable smartcard surface.
 *
 * This entrypoint intentionally excludes `DesktopTransport`: desktop reader
 * access relies on the optional `pcsc-mini` dependency and hardware/runtime
 * setup. Consumers that need it may use their platform integration explicitly.
 */
export { Reader } from './reader'
export type { CardReader } from './reader'
export { CommandApdu, SelectCommand, OpenSecureChannel, MutuallyAuthenticate, SignCommand } from './command-apdu'
export { ResponseAPDU, SelectResponse, SignResponse } from './reponse-apdu'
export { MockTransport } from './transport/mock'
export { Transport } from './transport/transport'
export { StatusWord } from './statusword'
export type { Uint8 } from './byte'
export { SecureChannelV1, ISO7816Padding } from './securechannel/v1'
export { concatUint8, hexToUint8, uint8ToHex, randomUint8, uint8Equals } from './utils'
