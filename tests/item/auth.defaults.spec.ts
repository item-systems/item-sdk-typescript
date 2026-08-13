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

function createReadOnlyItem(result: unknown, exception?: string) {
  const calls: any[] = []
  const invoker = {
    async testInvoke(request: any) {
      calls.push(request)
      return exception ? { stack: [], exception } : { stack: [{ value: result }] }
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

async function expectRejected(promise: Promise<unknown>, expectedMessage: string): Promise<void> {
  try {
    await promise
    expect.fail(`Expected rejection containing: ${expectedMessage}`)
  } catch (error) {
    expect((error as Error).message).to.include(expectedMessage)
  }
}

describe('Authentication verification', () => {
  it('serializes the omitted challenge as ILS_PERMISSIVE without sending structure metadata', () => {
    const invocation = ItemAPI.authItem(SCRIPT_HASH, {
      localNfid: 42,
      auth: AUTH,
      burn: false,
    }) as any

    expect(invocation.operation).to.equal('authItem')
    expect(invocation.args).to.have.length(5)
    expect(invocation.args[3]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
    expect(invocation.args[4]).to.deep.equal({ type: 'Boolean', value: false })
    expect(JSON.stringify(invocation.args)).not.to.include('item-auth-v1')
  })

  it('applies the same default and metadata boundary to IS1 builders', () => {
    const claim = IS1API.claim(SCRIPT_HASH, { tokenId: '01', auth: AUTH }) as any
    const authItem = IS1API.authItem(SCRIPT_HASH, { tokenId: '01', auth: AUTH, burn: false }) as any

    expect(claim.args[1].value[2]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
    expect(authItem.args[1].value[2]).to.deep.equal({ type: 'ByteArray', value: 'AQ==' })
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

  it('classifies an explicit false contract result without swallowing the invocation', async () => {
    const { item: itemPromise } = createReadOnlyItem(false)
    const item = await itemPromise

    expect(await item.verifyAuthOutcome({ localNfid: 42, auth: AUTH })).to.deep.equal({
      valid: false,
      reason: 'returned-false',
    })
  })

  it('classifies known ITEM contract proof faults as expected invalid outcomes', async () => {
    const cases: Array<[string, types.AuthVerificationFailureReason]> = [
      ['ITEM: Invalid proof', 'invalid-proof'],
      ['ITEM: Proof has already been used', 'proof-burned'],
      ['ITEM: Proof below write pointer', 'proof-below'],
      ['ITEM: Invalid Challenge Type', 'invalid-challenge'],
      ['ITEM: Invalid bock', 'invalid-block'],
    ]

    for (const [fault, reason] of cases) {
      const { item: itemPromise } = createReadOnlyItem(undefined, fault)
      const item = await itemPromise
      expect(await item.verifyAuthOutcome({ localNfid: 42, auth: AUTH })).to.deep.equal({ valid: false, reason })
    }
  })

  it('keeps unknown contract and transport failures on the rejection path', async () => {
    const { item: faultItemPromise } = createReadOnlyItem(undefined, 'ITEM: unexpected future fault')
    const faultItem = await faultItemPromise
    await expectRejected(faultItem.verifyAuthOutcome({ localNfid: 42, auth: AUTH }), 'ITEM: unexpected future fault')

    const transportItem = await Item.init({
      scriptHash: SCRIPT_HASH,
      invoker: {
        async testInvoke() {
          throw new Error('RPC unavailable')
        },
      } as any,
      listener: {} as any,
      parser: {} as any,
    })
    await expectRejected(transportItem.verifyAuthOutcome({ localNfid: 42, auth: AUTH }), 'RPC unavailable')
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

    await expectRejected(item.verifyAuth({ localNfid: 42, auth: AUTH }), 'authItem simulation returned a non-boolean result')
  })
})
