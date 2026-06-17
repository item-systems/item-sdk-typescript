import { Transport } from './transport'

/**
 * Deterministic in-memory transport for tests.
 *
 * Each call to `transmit()` returns the next pre-seeded response, allowing unit
 * tests to exercise reader and secure-channel logic without real hardware.
 */
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

  /**
   * Simulate a successful connection immediately.
   */
  async connect(): Promise<boolean> {
    return true
  }

  /**
   * No-op disconnect for the mock transport.
   */
  async disconnect(): Promise<void> {}
}
