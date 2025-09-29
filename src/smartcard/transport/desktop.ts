import { Transport } from './transport'
import * as pcsc from 'pcsc-mini'

const { CardDisposition, CardMode, ReaderStatus } = pcsc

/**
 * A transport class for use with MacOSX, Windows or Linux.
 * Linux users must install the necessary requirements documented here:
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

  async transmit(rawCommandAPDU: Uint8Array): Promise<Uint8Array> {
    if (!this._card) {
      // TODO: return proper error code
      console.log('trying to transmit but no card present')
      return Uint8Array.of(0x00, 0x00)
    }
    return this._card.transmit(rawCommandAPDU)
  }

  /**
   * Establish a new connection with the card. Fails after 10 seconds if not able to create a connection.
   */
  async connect(): Promise<boolean> {
    // polling loop
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

  // Do not change this to a normal function. The arrow function is done to preserve
  // the correct `this` instance such that `connect()` can poll the card state.
  private onReader = (reader: pcsc.Reader) => {
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

  private onError(err: pcsc.Err) {
    console.error('Unexpected PCSC error: ', err)
  }
}
