import * as u from '../../../src/smartcard/utils'
import { Reader } from '../../../src/smartcard/reader'
import { expect } from 'chai'
import { SecureChannelV1 } from '../../../src/smartcard/securechannel/v1'
import { SelectCommand, SignCommand } from '../../../src/smartcard/command-apdu'
import { sha256 } from '@noble/hashes/sha2'
import { p256 } from '@noble/curves/nist'
import { SelectResponse, SignResponse } from '../../../src/smartcard/reponse-apdu'

const RUN_SMARTCARD_MANUAL = process.env.RUN_SMARTCARD_MANUAL === '1'

describe('SecureChannel DK1 manual', () => {
  ;(RUN_SMARTCARD_MANUAL ? it : it.skip)('should work with a real Desktop reader', async () => {
    const { DesktopTransport } = await import('../../../src/smartcard/transport/desktop')
    const reader = new Reader(new DesktopTransport())
    await reader.connect()

    const PROPS_AID = u.hexToUint8('FF41784C6162730001')
    let response = await reader.sendCommand(new SelectCommand(PROPS_AID))
    expect(response.getSW()).to.equal(0x9000)
    const cardPublicKey = new SelectResponse(response.toArray()).getPublicKey()
    const pairingKey = u.hexToUint8('8743A38910DC01D949F17A5D660BF97ED315DCAB0A75E1BC0DAE4CC4FDBAF819')
    const sc = new SecureChannelV1(reader, cardPublicKey, pairingKey)

    try {
      await sc.open()
    } catch (err) {
      expect.fail('expected open to succeed, but it threw: ' + err)
    }

    const message = 'Hello, world!'
    const encoder = new TextEncoder()
    const msgHash = sha256.create().update(encoder.encode(message)).digest()

    response = await sc.sendCommand(new SignCommand(msgHash))
    expect(response.getSW()).to.equal(0x9000)

    const signResponse = new SignResponse(response.toArray())
    expect(p256.verify(signResponse.getSignature(), msgHash, signResponse.getPublicKey(), { prehash: false })).to.equal(
      true
    )
    await reader.disconnect()
  })
})
