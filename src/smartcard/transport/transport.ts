/**
 * The medium used to send/receive APDUs.
 *
 * Transport implementations abstract the physical or simulated communication
 * channel underneath the reader layer. They are intentionally minimal so the
 * same reader and secure-channel logic can operate over desktop PC/SC, mocks,
 * or future transports without changing protocol code.
 */
export abstract class Transport {
  /**
   * Send a raw ISO-7816 command APDU and return the raw response APDU.
   */
  abstract transmit(rawCommandAPDU: Uint8Array): Promise<Uint8Array>

  /**
   * Establish a connection with the underlying card/device.
   *
   * Returns `true` when a usable session is available and `false` when the
   * transport failed to establish one without throwing.
   */
  abstract connect(): Promise<boolean>

  /**
   * End the connection with the underlying card/device.
   */
  abstract disconnect(): Promise<void>
}
