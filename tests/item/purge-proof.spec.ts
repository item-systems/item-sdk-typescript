import { expect } from 'chai'
import { ItemAPI } from '../../src/api/neoN3/item'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'
const MESSAGE = '00112233'
const PROOF = 'aabbccdd'

function purgeArgumentValue(params: any): string {
  const invocation = ItemAPI.purgeItem(SCRIPT_HASH, params)
  return (invocation.args[2] as { value: string }).value
}

describe('Purge proof nomenclature', () => {
  it('serializes the canonical proof field without changing the contract argument order', () => {
    const invocation = ItemAPI.purgeItem(SCRIPT_HASH, {
      localNfid: 42,
      message: MESSAGE,
      proof: PROOF,
    })

    expect(invocation.operation).to.equal('purgeItem')
    expect(invocation.args).to.deep.equal([
      { type: 'Integer', value: '42' },
      { type: 'ByteArray', value: 'ABEiMw==' },
      { type: 'ByteArray', value: 'qrvM3Q==' },
    ])
  })

  it('accepts deprecated signature input as a compatibility alias', () => {
    expect(
      purgeArgumentValue({
        localNfid: 42,
        message: MESSAGE,
        signature: PROOF,
      })
    ).to.equal('qrvM3Q==')
  })

  it('accepts matching canonical and deprecated fields once', () => {
    expect(
      purgeArgumentValue({
        localNfid: 42,
        message: MESSAGE,
        proof: PROOF,
        signature: PROOF,
      })
    ).to.equal('qrvM3Q==')
  })

  it('rejects ambiguous proof material before it reaches the contract invocation', () => {
    expect(() =>
      purgeArgumentValue({
        localNfid: 42,
        message: MESSAGE,
        proof: PROOF,
        signature: '01020304',
      })
    ).to.throw('PurgeItem.proof and deprecated PurgeItem.signature must match when both are supplied')
  })

  it('rejects missing proof material before it reaches the contract invocation', () => {
    expect(() => purgeArgumentValue({ localNfid: 42, message: MESSAGE })).to.throw('PurgeItem.proof is required')
  })
})
