import * as u from '../../utils'
import { MockTransport } from '../../transport/mock'
import { Reader } from '../../reader'
import { expect } from 'chai'
import { ISO7816Padding, SecureChannelV1 } from '../../securechannel/v1'
import { DesktopTransport } from '../../transport/desktop'
import { SelectCommand, SignCommand } from '../../command-apdu'
import { concatUint8, hexToUint8 } from '../../utils'
import { createCipheriv } from 'node:crypto'
import { secp256r1 } from '@noble/curves/p256'
import { sha256 } from '@noble/hashes/sha2'
import { SelectResponse, SignResponse } from '../../reponse-apdu'

describe('SecureChannel DK1', () => {
  it('can establish mutual authentication', async () => {
    const expectedKeyRandomData = u.hexToUint8('83e47109ec8a1279c86edb44602888ae30e3ad1fc3d60617d5863b57d777d71f')
    const expectedIV = u.hexToUint8('95e7687b140dfe694292e491112fc4e2')
    const SW_OK = u.hexToUint8('9000')
    const OPEN_CHANNEL_RESPONSE = u.concatUint8(expectedKeyRandomData, expectedIV, SW_OK)
    const MUTUALLY_AUTHENTICATE_RESPONSE = u.hexToUint8(
      '93EFA5D958168678A1D5E11889497CB9DFA42B2EA2AB6A9D860F1D24A44A9A49D8B7EC635C2F5BDB194754B39E1CF7ADF2B53B996CE738F75D04B70DA1363CD89000'
    )

    const responses = [OPEN_CHANNEL_RESPONSE, MUTUALLY_AUTHENTICATE_RESPONSE]
    const transport = new MockTransport(responses)
    const reader = new Reader(transport)
    const connected = await reader.connect()
    expect(connected).to.equal(true)

    const cardPublicKey = u.hexToUint8(
      '04e6182b2e12ac69b3d288d54f9fc07ebc305988141fc0274637ae36cf771e3057114ae752355f2fdb1cc52883c5b17d19c8afd47806478428b6ce877eb07baa96'
    )
    const pairingKey = u.hexToUint8('8743A38910DC01D949F17A5D660BF97ED315DCAB0A75E1BC0DAE4CC4FDBAF819')
    const testPrivateKey = u.hexToUint8('716cbe07d53c736e1aea1df79d5759d4ac794ed032f8ae84c764c059a2ac8a58')
    const sc = new SecureChannelV1(reader, cardPublicKey, pairingKey, testPrivateKey)
    try {
      await sc.open()
    } catch (err) {
      expect.fail('expected open to succeed, but it threw: ' + err)
    }
  })

  it('should work with a real Desktop reader', async () => {
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
    expect(
      secp256r1.verify(signResponse.getSignature(), msgHash, signResponse.getPublicKey(), { prehash: false })
    ).to.equal(true)
  })
})

describe('internal implementation tests', () => {
  it('should encrypt APDU data correctly', () => {
    const iv = hexToUint8('7dab356035e961ba6254fb92b3afb1e6')
    const encryptionKey = hexToUint8('b8851d385e552ff1f294edd2f14c912da80ff341dcabcff5493ad62e3d623138')
    const data = hexToUint8('2d960eb57122fb164c7dd6b89507e7f4a6716eedb365deb2d32956eb071333e3')
    const paddedData = ISO7816Padding(data)
    const cipher = createCipheriv('aes-256-cbc', encryptionKey, iv)
    cipher.setAutoPadding(false)
    const encryptedData = concatUint8(cipher.update(paddedData), Uint8Array.from(cipher.final()))
    const expected = hexToUint8(
      '69a0cfe02b169534a8e64af532477e6edba95994330f11fd87574fc879c0e3ee818fdfe24a5eb58ec721a9b05b37a9f2'
    )
    expect(encryptedData).to.deep.equal(expected)
  })

  it('should produce the right secret', () => {
    const privateKey = hexToUint8('1c658d8f15773331591a199bd9b83be54f07469cb987a6a486c5cd3cb7c2237c')
    const cardPublicKey = hexToUint8(
      '04e6182b2e12ac69b3d288d54f9fc07ebc305988141fc0274637ae36cf771e3057114ae752355f2fdb1cc52883c5b17d19c8afd47806478428b6ce877eb07baa96'
    )
    const sharedSecret = secp256r1.getSharedSecret(privateKey, cardPublicKey).slice(1)
    const expectedSecret = hexToUint8('58b4f840e0efab7cc16c0c048255af7c6a51f31bfe066b94819e95622ff25262')
    expect(sharedSecret).to.deep.equal(expectedSecret)
  })

  it('should pass verify signature', () => {
    const msgHash = hexToUint8('315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3')
    const sig = hexToUint8(
      '3045022100dea4b0186146aecd4c5088db2957ddade41c44df4e71eb2f4820b0f85d625bd602205f1fedc581719b74fef82524f674d14aff68a33e4f9aa475bec77f242da991ee'
    )
    const pk = hexToUint8(
      '0414b2b16f4d4fdf1dba184d5a28556fbe41b0f47d84fa906fe43509989bded400a6c8d1b49a933e66fc637c5495dd8ffa79d6f2b5f4a0020f0a99e03cc0b26084'
    )
    expect(secp256r1.verify(sig, msgHash, pk, { prehash: false })).to.equal(true)
  })
})
