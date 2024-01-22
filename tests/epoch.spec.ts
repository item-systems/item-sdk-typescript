import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'

describe('Epoch features', function () {
  this.timeout(60000)

  // contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const scriptHash = Item.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  const maxSupply = 5000
  const generatorInstanceId = 11
  const epochParams = {
    label: 'DK1',
    generatorInstanceId,
    mintFee: 10 * 10 ** 8,
    sysFee: 0.4 * 10 ** 8,
    maxSupply,
    authAge: 4,
  }
  let epochId = 0

  it('Should create an item epoch using a generator instance', async function () {
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.createEpoch(epochParams)
    const log = await Utils.transactionCompletion(txid)
    epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    log.executions[0].notifications!.forEach(notif => {
      console.log(NeonParser.parseRpcResponse(notif.state))
    })
    assert.isAbove(epochId, 0)
  })

  it('Should get an epoch using the epoch id', async function () {
    const sdk = await getSDK()
    const res = await sdk.getEpochJSON({
      epochId,
    })
    assert.equal(res.authAge, epochParams.authAge)
    assert.equal(res.label, epochParams.label)
    assert.equal(res.epochId, epochId)
    assert.equal(res.generatorInstanceId, epochParams.generatorInstanceId)
    assert.equal(res.mintFee, epochParams.mintFee)
    assert.equal(res.sysFee, epochParams.sysFee)
    assert.equal(res.maxSupply, epochParams.maxSupply)
    assert.equal(res.totalSupply, 0)
  })
})
