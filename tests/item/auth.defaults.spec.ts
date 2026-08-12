import { expect } from 'chai'
import { Item, types } from '../../dist/esm/index.js'
import { ItemAPI } from '../../dist/esm/api/neoN3/item.js'
import { IS1API } from '../../dist/esm/api/neoN3/IS1.js'

const SCRIPT_HASH = '0x3491b358a9ddce38cb567e2bb8bd1bf783cd556d'
const AUTH = {
  message: '00',
  proof: '00',
  structure: 'item-auth-v1',
}

function createReadOnlyItem(result: unknown) {
  const calls: any[] = []
  const invoker = {
    async testInvoke(request: any) {
      calls.push(request)
      return { stack: [{ value: result }] }
    },
  }
  const parser = {
    parseRpcResponse(stackItem: any) {
      return stackItem.value
    },
  }

  return {
    calls,
    item: Item.init({
      scriptHash: SCRIPT_HASH,
      invoker: invoker as any,
      listener: {} as any,
      parser: parser as any,
    }),
  }
}

describe('Authentication verification', () => {
  it('serializes the omitted challenge as ILS_PERMISSIVE without sending structure metadata', () => {
    const invocation = ItemAPI.authItem(SCRIPT_HASH, {
      localNfid: 42,
      auth: AUTH,
      burn: false,
    })

    expect(invocation.operation).to.equal('authItem')
    expect(invocation.args).to.have.length(5)
    expect(invocation.args[3]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
    expect(invocation.args[4]).to.deep.equal({ type: 'Boolean', value: false })
    expect(JSON.stringify(invocation.args)).not.to.include('item-auth-v1')
  })

  it('applies the same default and metadata boundary to IS1 builders', () => {
    const claim = IS1API.claim(SCRIPT_HASH, { tokenId: '01', auth: AUTH })
    const authItem = IS1API.authItem(SCRIPT_HASH, { tokenId: '01', auth: AUTH, burn: false })

    expect((claim.args[1] as any).value[2]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
    expect((authItem.args[1] as any).value[2]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
    expect(JSON.stringify([claim, authItem])).not.to.include('item-auth-v1')
  })

  it('verifyAuth test-invokes authItem with burn disabled and returns a structured result', async () => {
    const { item: itemPromise, calls } = createReadOnlyItem(true)
    const item = await itemPromise

    const result = await item.verifyAuth({ localNfid: 42, auth: AUTH })

    expect(result).to.deep.equal({ valid: true })
    expect(calls).to.have.length(1)
    expect(calls[0].invocations[0].operation).to.equal('authItem')
    expect(calls[0].invocations[0].args[4]).to.deep.equal({ type: 'Boolean', value: false })
    expect(calls[0].signers).to.deep.equal([])
  })

  it('isAuthValid remains a backward-compatible alias of verifyAuth', async () => {
    const { item: itemPromise, calls } = createReadOnlyItem(false)
    const item = await itemPromise
    const params: types.IsAuthValid = { localNfid: 42, auth: AUTH }

    expect(await item.isAuthValid(params)).to.deep.equal({ valid: false })
    expect(calls).to.have.length(1)
  })

  it('rejects an unexpected non-boolean contract result', async () => {
    const { item: itemPromise } = createReadOnlyItem('true')
    const item = await itemPromise

    try {
      await item.verifyAuth({ localNfid: 42, auth: AUTH })
      expect.fail('verifyAuth should reject non-boolean VM results')
    } catch (error) {
      expect(error).to.be.instanceOf(TypeError)
      expect((error as Error).message).to.equal('authItem simulation returned a non-boolean result')
    }
  })
})
