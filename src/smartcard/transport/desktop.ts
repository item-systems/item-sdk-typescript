import { Transport } from './transport'
import * as pcsc from 'pcsc-mini'

const { CardDisposition, CardMode, ReaderStatus } = pcsc

/**
 * PC/SC-backed transport for desktop operating systems.
 *
 * This transport watches for reader/card events through `pcsc-mini`, keeps the
 * currently connected card handle, and exposes a simple APDU transmit API to the
 * rest of the SDK. It is the production transport used for real hardware flows
 * on macOS, Windows, and Linux.
 *
 * Linux users must install the prerequisites documented by `pcsc-mini`:
 * https://github.com/kofi-q/pcsc-mini?tab=readme-ov-file#prerequisites
 */
export class DesktopTransport extends Transport {
  private _client: pcsc.Client
  private _card: pcsc.Card | undefined
  private _reader: pcsc.Reader | undefined

  constructor() {
    super()
    // @ts-ignore
    this._client = new pcsc.Client().on('reader', this.onReader).on('error', this.onError).start()
  }

  /**
   * Transmit a raw APDU to the currently present card.
   *
   * If no card is present, the transport returns a generic failure status word
   * so higher layers receive a protocol-shaped error response instead of a null
   * value.
   */
  async transmit(rawCommandAPDU: Uint8Array): Promise<Uint8Array> {
    if (!this._card) {
      console.error('trying to transmit but no card present')
      return Uint8Array.of(0x6f, 0x00)
    }
    return this._card.transmit(rawCommandAPDU)
  }

  /**
   * Wait for a card connection to become available.
   *
   * The transport polls its internally updated card handle for up to 10 seconds
   * while the PC/SC event handlers react to reader state changes.
   */
  async connect(): Promise<boolean> {
    const polling = async (): Promise<boolean> => {
      while (true) {
        if (this._card !== undefined) {
          return true
        }
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const timeoutPromise = new Promise<boolean>((resolve, reject) =>
      setTimeout(() => reject(new Error('Timeout waiting for card to connect')), 10_000)
    )

    return Promise.race([polling(), timeoutPromise])
  }

  /**
   * Disconnect the current card session and stop the PC/SC client.
   */
  async disconnect(): Promise<void> {
    if (this._card !== undefined) {
      await this._card.disconnect(CardDisposition.RESET)
      this._client.stop()
    }
  }

  // Do not change this to a normal function. The arrow function preserves the
  // instance binding required for `connect()` polling to observe updated state.
  private onReader = (reader: pcsc.Reader) => {
    this._reader = reader
    // @ts-ignore
    reader.on('change', async status => {
      if (status.hasAny(ReaderStatus.MUTE, ReaderStatus.IN_USE)) {
        return
      }
      if (!status.has(ReaderStatus.PRESENT)) {
        this._card?.disconnect(CardDisposition.RESET)
        this._card = undefined
        return
      }

      try {
        if (!this._card) {
          this._card = await reader.connect(CardMode.SHARED)
        }
      } catch (err) {
        console.error('Card error: ', err)
      }
    })
  }

  /**
   * Log unexpected PC/SC client errors.
   */
  private onError(err: pcsc.Err) {
    console.error('Unexpected PCSC error: ', err)
  }
}
