import { expect } from 'chai'
import { SignResponse } from '../../src/index'
import { hexToUint8 } from '../../src/smartcard/utils'

describe('Package smartcard proof export', () => {
  it('exports SignResponse from the package root with the canonical proof accessor', () => {
    const response = new SignResponse(
      hexToUint8(
        'a2818a304502201d2f5bcc0f223855efcbad399a1e5e4367f7ef376e4eefa471035b0a4952410b022100dfd71fecd03e689e797280272e60db4d293304bd3266959b9e82dfc9f3bd8efb04410414b2b16f4d4fdf1dba184d5a28556fbe41b0f47d84fa906fe43509989bded400a6c8d1b49a933e66fc637c5495dd8ffa79d6f2b5f4a0020f0a99e03cc0b260849000'
      )
    )

    expect(response.getProof()).to.deep.equal(response.getSignature())
  })
})
