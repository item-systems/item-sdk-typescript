/**
 * The medium used to send/receive data.
 */
export abstract class Transport {
  /**
   * Send data to the device.
   * @param rawCommandAPDU ISO-7816 command APDU to send.
   * @returns ISO-7816 response APDU
   */
  abstract transmit(rawCommandAPDU: Uint8Array): Promise<Uint8Array>

  /**
   * Establish a connection with the card.
   * @returns true is established. false on any error or failure to establish
   */
  abstract connect(): Promise<boolean>
}