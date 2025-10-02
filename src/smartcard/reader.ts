import { Uint8 } from './byte'
import { CommandApdu } from './command-apdu'
import { Transport } from './transport/transport'
import { ResponseAPDU } from './reponse-apdu'

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
   * Returns if the connection is currently active.
   */
  connected(): boolean

  /**
   * Transmit raw bytes to the card
   * @param commandAPDU ISO7816 command APDU
   */
  transmit(commandAPDU: Uint8Array): Promise<Uint8Array>

  /**
   * Sends an ISO 7816-4 command APDU and returns the response APDU.
   *
   * @param cla - Class byte of the APDU. Defines the type of command, logical channel, and security context.
   * @param ins - Instruction byte of the APDU. Specifies the operation to perform (e.g., SELECT, READ, WRITE).
   * @param p1 - Parameter 1 byte. Instruction-specific parameter, often used for addressing or options.
   * @param p2 - Parameter 2 byte. Instruction-specific parameter, often used for addressing or options.
   * @param lc - Length of the data field (number of bytes in the `data` array). For commands without data, this is typically 0.
   * @param data - Data field of the APDU. Contains additional information required for the command (optional, can be empty).
   * @returns Response APDU as a `Uint8Array`, containing response data and status words (SW1-SW2) according to ISO 7816-4.
   */
  send(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array): Promise<Uint8Array>

  /**
   * Send ISO7816 Command APDU types.
   * @param apdu
   */
  sendCommand(apdu: CommandApdu): Promise<ResponseAPDU>
}

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

  private _assertConnected() {
    if (!this._connected) {
      throw new Error('Reader is not connected')
    }
  }
}
