import { Transport } from './transport'

/**
 * Interface representing a native mobile NFC ISO-DEP transceiver.
 * Compatible with react-native-nfc-manager, CoreNFC (iOS), and Android IsoDep.
 */
export interface NativeNfcTransceiver {
  transceive(commandApdu: Uint8Array): Promise<Uint8Array>
  close?(): Promise<void>
}

/**
 * Pure mobile transport implementation for React Native / iOS / Android.
 * Operates across Native NFC ISO-DEP connections without any desktop PC/SC dependencies.
 */
export class MobileNfcTransport extends Transport {
  private transceiver: NativeNfcTransceiver
  private isConnected = false

  constructor(transceiver: NativeNfcTransceiver) {
    super()
    this.transceiver = transceiver
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true
    return true
  }

  public async disconnect(): Promise<void> {
    if (this.transceiver.close) {
      await this.transceiver.close()
    }
    this.isConnected = false
  }

  public async transmit(rawCommandAPDU: Uint8Array): Promise<Uint8Array> {
    if (!this.isConnected) {
      throw new Error('MobileNfcTransport is not connected')
    }
    return await this.transceiver.transceive(rawCommandAPDU)
  }
}
