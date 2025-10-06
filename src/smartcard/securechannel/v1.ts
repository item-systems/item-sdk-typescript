import { CardReader, Reader } from '../reader'
import { Uint8 } from '../byte'
import { CommandApdu, MutuallyAuthenticate, OpenSecureChannel } from '../command-apdu'
import { p256 } from '@noble/curves/nist.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { ResponseAPDU } from '../reponse-apdu'
import * as u from '../utils'
import { createCipheriv, createDecipheriv } from 'node:crypto'
import { CBCBlockCipherMac } from '../crypto'
import { StatusWord } from '../statusword'
import { uint8ToHex } from '../utils'

/**
 * This SecureChannel implementation is valid for products with the firmware
 * dk1, v1.0.0, v2.0.0 and v2.1.0
 */
export class SecureChannelV1 implements CardReader {
  private static BLOCK_SIZE = 16
  private static SECRET_LENGTH = 32
  private static PAYLOAD_MAX_SIZE = 223
  private _reader: Reader
  private _pairingKey: Uint8Array
  private _privateKey: Uint8Array
  private _publicKey: Uint8Array
  private _sharedSecret: Uint8Array
  private _iv: Uint8Array = new Uint8Array()
  private _keyRandomData = new Uint8Array()
  private _sessionEncryptionKey = new Uint8Array()
  private _sessionMacKey = new Uint8Array()
  // Indicates if the secure channel session is established
  private _isOpen = false

  /**
   * A SecureChannel using ECDHE with SECP256R1.
   *
   * @param reader an established communication channel to the card.
   * @param publicKey the public key shared by the card. Returned when selecting the Applet.
   * @param pairingKey
   * @param __privateKey for testing only
   */
  constructor(reader: Reader, publicKey: Uint8Array, pairingKey: Uint8Array, __privateKey?: Uint8Array) {
    this._reader = reader
    this._pairingKey = pairingKey
    if (__privateKey !== undefined) {
      this._privateKey = __privateKey
    } else {
      this._privateKey = p256.utils.randomSecretKey()
    }
    this._publicKey = p256.getPublicKey(this._privateKey, false)
    this._sharedSecret = p256.getSharedSecret(this._privateKey, publicKey).slice(1) // drop the format byte
  }

  async connect(): Promise<boolean> {
    if (this.connected()) {
      return true
    }
    return await this._reader.connect()
  }

  async disconnect(): Promise<void> {
    if (this.connected()) {
      await this._reader.disconnect()
    }
  }

  connected(): boolean {
    return this._reader.connected()
  }

  async send(cla: Uint8, ins: Uint8, p1: Uint8, p2: Uint8, lc: Uint8, data: Uint8Array): Promise<Uint8Array> {
    return await this.transmit(Uint8Array.from([cla, ins, p1, p2, lc, ...data]))
  }

  async sendCommand(apdu: CommandApdu): Promise<ResponseAPDU> {
    return new ResponseAPDU(await this.transmit(apdu.toArray()))
  }

  async transmit(commandAPDU: Uint8Array): Promise<Uint8Array> {
    if (this._isOpen) {
      const wrapped = this.wrap(commandAPDU)
      return this.unwrap(await this._reader.transmit(wrapped))
    }
    return this._reader.transmit(commandAPDU)
  }

  async open() {
    this._isOpen = false

    let response = await this.sendCommand(new OpenSecureChannel(this._publicKey))
    if (response.getSW() !== StatusWord.OK) {
      throw new Error(`Failed to open secure channel: wrong status word 0x${response.getSW().toString(16)}`)
    }

    const data = response.getData()
    if (data.length !== SecureChannelV1.SECRET_LENGTH + SecureChannelV1.BLOCK_SIZE) {
      throw new Error(
        `Failed to open secure channel: invalid data length. Expected ${
          SecureChannelV1.SECRET_LENGTH + SecureChannelV1.BLOCK_SIZE
        } got ${data.length}`
      )
    }
    this._keyRandomData = data.slice(0, SecureChannelV1.SECRET_LENGTH)
    this._iv = data.slice(SecureChannelV1.SECRET_LENGTH, data.length)

    this.initialiseSession()

    const rData = u.randomUint8(SecureChannelV1.SECRET_LENGTH)
    response = await this.sendCommand(new MutuallyAuthenticate(rData))
    if (response.getSW() !== StatusWord.OK) {
      throw new Error(`Failed mutual authentication: 0x${response.getSW().toString(16)}`)
    }
  }

  private initialiseSession() {
    const keyData = sha512
      .create()
      .update(this._sharedSecret)
      .update(this._pairingKey)
      .update(this._keyRandomData)
      .digest()
    this._sessionEncryptionKey = keyData.slice(0, SecureChannelV1.SECRET_LENGTH)
    this._sessionMacKey = keyData.slice(SecureChannelV1.SECRET_LENGTH, SecureChannelV1.SECRET_LENGTH * 2)
    this._isOpen = true
  }

  private wrap(apdu: Uint8Array): Uint8Array {
    const c = CommandApdu.fromArray(apdu)
    const header = c.getHeader()
    const data = c.getData()

    if (data.length > SecureChannelV1.PAYLOAD_MAX_SIZE) {
      throw new Error('data length exceeds max payload size')
    }

    const paddedData = ISO7816Padding(data)
    const cipher = createCipheriv('aes-256-cbc', this._sessionEncryptionKey, this._iv)
    cipher.setAutoPadding(false)
    const encryptedData = u.concatUint8(cipher.update(paddedData), cipher.final())
    const meta = u.concatUint8(
      header,
      Uint8Array.of(encryptedData.length + SecureChannelV1.BLOCK_SIZE),
      new Uint8Array(11)
    )
    this.updateIV(meta, encryptedData)
    const newData = u.concatUint8(this._iv, encryptedData)
    return u.concatUint8(header, Uint8Array.of(newData.length), newData)
  }

  private unwrap(response: Uint8Array): Uint8Array {
    const apdu = new ResponseAPDU(response)
    const data = apdu.getData()
    const meta = new Uint8Array(16)
    meta[0] = data.length
    const mac = data.slice(0, 16)
    const encryptedData = data.slice(16)

    const cipher = createDecipheriv('aes-256-cbc', this._sessionEncryptionKey, this._iv)
    cipher.setAutoPadding(false)
    const decryptedPaddedData = u.concatUint8(cipher.update(encryptedData), cipher.final())
    const decryptedData = removeISO7816Padding(decryptedPaddedData)
    this.updateIV(meta, encryptedData)
    if (!u.uint8Equals(this._iv, mac)) {
      console.log(`invalid mac, expected:`, uint8ToHex(this._iv))
      throw new Error('invalid MAC')
    }
    return decryptedData
  }

  private updateIV(meta: Uint8Array, data: Uint8Array) {
    const mac = new CBCBlockCipherMac(this._sessionMacKey)
    mac.update(meta)
    mac.update(data)
    this._iv = mac.doFinal()
  }
}

export function ISO7816Padding(data: Uint8Array, blockSize = 16): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const padding = new Uint8Array(padLen)
  padding[0] = 0x80

  const padded = new Uint8Array(data.length + padLen)
  padded.set(data, 0)
  padded.set(padding, data.length)
  return padded
}

function removeISO7816Padding(data: Uint8Array): Uint8Array {
  let i = data.length - 1
  while (i >= 0 && data[i] === 0x00) {
    i--
  }
  if (i >= 0 && data[i] === 0x80) {
    return data.slice(0, i)
  }
  return data
}
