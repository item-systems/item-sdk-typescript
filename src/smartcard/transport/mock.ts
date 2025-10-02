import { Transport } from './transport'

export class MockTransport extends Transport {
  private readonly _responses: Uint8Array[]
  private _idx = 0

  constructor(responses: Uint8Array[]) {
    super()
    this._responses = responses
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transmit(_: Uint8Array): Promise<Uint8Array> {
    const r = this._responses[this._idx]
    this._idx += 1
    return r
  }

  async connect(): Promise<boolean> {
    return true
  }
}
