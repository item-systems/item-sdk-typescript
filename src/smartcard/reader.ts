import { Uint8 } from './byte'
import { CommandApdu } from './command-apdu'
import { Transport } from './transport/transport'
import { ResponseAPDU } from './reponse-apdu'

/**
 * Reader interface for card communication.
 *
 * The reader layer sits above a transport and below any secure-channel wrapper.
 * It is responsible for enforcing connection state and for exposing both raw and
 * structured APDU send paths.
 */
export interface CardReader {
  /**
   * Establish a connection.
   */
  connect(): Promise<boolean>

  /**
   * End a connection.
   */
  disconnect(): Promise<void>

  /**
   * Returns whether the connection is currently active.
   */
  connected(): boolean

  /**
   * Transmit a raw command APDU to the card.
   */
  transmit(commandAPDU: Uint8Array): Promise<Uint8Array>

  /**
   * Assemble and send an APDU from its component fields.
   */
  send(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array): Promise<Uint8Array>

  /**
   * Send a typed command APDU and parse the response into a `ResponseAPDU`.
   */
  sendCommand(apdu: CommandApdu): Promise<ResponseAPDU>
}

/**
 * Default reader implementation backed by a `Transport`.
 *
 * This class provides the minimal connection-state checks and APDU convenience
 * helpers needed by the secure-channel layer and tests.
 */
export class Reader implements CardReader {
  private _transport: Transport
  private _connected = false

  constructor(transport: Transport) {
    this._transport = transport
  }

  async connect(): Promise<boolean> {
    this._connected = await this._transport.connect()
    return this._connected
  }

  async disconnect(): Promise<void> {
    await this._transport.disconnect()
  }

  public connected(): boolean {
    return this._connected
  }

  public async transmit(commandAPDU: Uint8Array): Promise<Uint8Array> {
    this._assertConnected()
    return await this._transport.transmit(commandAPDU)
  }

  async send(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array): Promise<Uint8Array> {
    this._assertConnected()
    return await this.transmit(new Uint8Array([cla, ins, p1, p2, lc, ...data]))
  }

  async sendCommand(apdu: CommandApdu): Promise<ResponseAPDU> {
    this._assertConnected()
    return new ResponseAPDU(await this._transport.transmit(apdu.toArray()))
  }

  /**
   * Fail fast when callers attempt to use the reader before connecting.
   */
  private _assertConnected() {
    if (!this._connected) {
      throw new Error('Reader is not connected')
    }
  }
}
