import { expect } from 'chai'
import { Item } from '../../dist/esm/index.js'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'

function createEpochItem() {
  const calls: any[] = []
  const invoker = {
    async invokeFunction(request: any) {
      calls.push(request)
      return '0xcreateepoch'
    },
  }

  return {
    calls,
    item: Item.init({
      scriptHash: SCRIPT_HASH,
      invoker: invoker as any,
      listener: {} as any,
      parser: {} as any,
    }),
  }
}

describe('Epoch facade', () => {
  it('submits the existing createEpoch invocation through the Item facade', async () => {
    const { item: itemPromise, calls } = createEpochItem()
    const item = await itemPromise

    expect(await item.createEpoch()).to.equal('0xcreateepoch')
    expect(calls).to.deep.equal([
      {
        invocations: [
          {
            scriptHash: SCRIPT_HASH,
            operation: 'createEpoch',
            args: [],
          },
        ],
        signers: [],
      },
    ])
  })
})
