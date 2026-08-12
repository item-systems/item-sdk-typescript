import { expect } from 'chai'
import { SignCommand } from '../../src/smartcard/command-apdu'
import { Reader } from '../../src/smartcard/reader'
import { SignResponse } from '../../src/smartcard/reponse-apdu'
import { Transport } from '../../src/smartcard/transport/transport'
import { hexToUint8 } from '../../src/smartcard/utils'

/**
 * Test-only transport that captures the card action APDU before returning a
 * deterministic card response. It keeps this test at the reader/transport
 * boundary without requiring a physical PC/SC reader.
 */
class RecordingTransport extends Transport {
  readonly commands: Uint8Array[] = []

  constructor(private readonly response: Uint8Array) {
    super()
  }

  async connect(): Promise<boolean> {
    return true
  }

  async disconnect(): Promise<void> {}

  async transmit(command: Uint8Array): Promise<Uint8Array> {
    this.commands.push(command)
    return this.response
  }
}

describe('Smartcard sign action', () => {
  it('dispatches the canonical sign APDU and exposes a proof with a signature compatibility alias', async () => {
    const messageHash = hexToUint8('315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3')
    const cardResponse = hexToUint8(
      'a2818a304502201d2f5bcc0f223855efcbad399a1e5e4367f7ef376e4eefa471035b0a4952410b022100dfd71fecd03e689e797280272e60db4d293304bd3266959b9e82dfc9f3bd8efb04410414b2b16f4d4fdf1dba184d5a28556fbe41b0f47d84fa906fe43509989bded400a6c8d1b49a933e66fc637c5495dd8ffa79d6f2b5f4a0020f0a99e03cc0b260849000'
    )
    const transport = new RecordingTransport(cardResponse)
    const reader = new Reader(transport)

    expect(await reader.connect()).to.equal(true)

    const response = await reader.sendCommand(new SignCommand(messageHash))
    const signed = new SignResponse(response.toArray())

    // CLA=A0, INS=12, P1/P2=00, Lc=32, then the exact supplied digest.
    expect(transport.commands).to.deep.equal([
      hexToUint8('a012000020315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3'),
    ])
    expect(response.getSW()).to.equal(0x9000)
    const expectedProof = hexToUint8(
      '304502201d2f5bcc0f223855efcbad399a1e5e4367f7ef376e4eefa471035b0a4952410b022100dfd71fecd03e689e797280272e60db4d293304bd3266959b9e82dfc9f3bd8efb'
    )
    expect(signed.getProof()).to.deep.equal(expectedProof)
    expect(signed.getSignature()).to.deep.equal(expectedProof)
    expect(signed.getPublicKey()).to.deep.equal(
      hexToUint8(
        '0414b2b16f4d4fdf1dba184d5a28556fbe41b0f47d84fa906fe43509989bded400a6c8d1b49a933e66fc637c5495dd8ffa79d6f2b5f4a0020f0a99e03cc0b26084'
      )
    )
  })
})
