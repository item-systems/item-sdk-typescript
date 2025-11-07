import * as u from '../../src/smartcard/utils'
import { SelectCommand } from '../../src/smartcard/command-apdu'
import { MockTransport } from '../../src/smartcard/transport/mock'
import { Reader } from '../../src/smartcard/reader'
import { expect } from 'chai'

describe('reader', () => {
  it('can send command apdu', async () => {
    const PROPS_AID = u.hexToUint8('FF41784C6162730001')
    const expectedResponse = u.hexToUint8(
      'a15a0101ffa3100e045d42b45fb1d3a7512be8bb9f89d2a44104e6182b2e12ac69b3d288d54f9fc07ebc305988141fc0274637ae36cf771e3057114ae752355f2fdb1cc52883c5b17d19c8afd47806478428b6ce877eb07baa969000'
    )

    const responses = [expectedResponse]
    const transport = new MockTransport(responses)
    const reader = new Reader(transport)

    expect(await reader.connect()).to.equal(true)
    const resp = await reader.sendCommand(new SelectCommand(PROPS_AID))

    expect(resp.getSW()).to.equal(0x9000)
    const expectedData = expectedResponse.slice(0, expectedResponse.length - 2)
    expect(resp.getData()).to.deep.equal(expectedData)
  })
})
