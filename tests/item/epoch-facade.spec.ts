import { expect } from 'chai'
import { Item } from '../../dist/esm/index.js'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'

function createEpochItem(result = 73) {
  const calls: any[] = []
  const listenerCalls: any[] = []
  const invoker = {
    async invokeFunction(request: any) {
      calls.push(request)
      return '0xcreateepoch'
    },
  }
  const listener = {
    async waitForApplicationLog(txId: string, timeout: number) {
      listenerCalls.push({ txId, timeout })
      return { executions: [{ stack: [{ value: result }] }] }
    },
  }
  const parser = {
    parseRpcResponse(stackItem: any) {
      return stackItem.value
    },
  }

  return {
    calls,
    listenerCalls,
    item: Item.init({
      scriptHash: SCRIPT_HASH,
      invoker: invoker as any,
      listener: listener as any,
      parser: parser as any,
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

  it('waits for and parses the created epoch id through the synchronous facade', async () => {
    const { item: itemPromise, calls, listenerCalls } = createEpochItem(73)
    const item = await itemPromise

    expect(await item.createEpochSync(1234)).to.equal(73)
    expect(calls).to.have.length(1)
    expect(calls[0].invocations[0]).to.deep.equal({
      scriptHash: SCRIPT_HASH,
      operation: 'createEpoch',
      args: [],
    })
    expect(listenerCalls).to.deep.equal([{ txId: '0xcreateepoch', timeout: 1234 }])
  })
})
