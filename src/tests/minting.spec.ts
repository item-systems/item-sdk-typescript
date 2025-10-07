import { NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'
import { Item, Utils } from '../'
import { ITEM_PRIVATENET } from './common'
import { Generator } from '@cityofzion/props'
// @ts-ignore
import Neon, { u } from '@cityofzion/neon-core'
import { assert } from 'chai'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Minting', function () {
  this.timeout(60000)

  // contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const testAccount = new Neon.wallet.Account('f82dac3b9b5361917fd0d3467a68677ed4debe2357e1e8e525c67c51c97a8bb7')

  const scriptHash = ITEM_PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init({ rpcAddress: NODE, account }),
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
  let epochId = -1
  let tokenId = -1

  it('Should create an item epoch using the new generator instance', async function () {
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.createEpoch(epochParams)
    const log = await Utils.transactionCompletion(txid)
    epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.isAbove(epochId, 0)
  })

  it('Should set use permissions for the generator instance', async function () {
    const authorizedContracts = [
      {
        scriptHash,
        code: epochId,
      },
    ]
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
    })
    await generator.init()

    const txid = await generator.setInstanceAuthorizedContracts(generatorInstanceId, authorizedContracts, ACCOUNT)
    const log = await Utils.transactionCompletion(txid)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.equal(res, 1)
  })

  it('Should mint an ITEM', async function () {
    const sdk = await getSDK(ACCOUNT)
    const txid = await sdk.offlineMint({
      epochId,
      address: testAccount.address,
      bindOnPickup: false,
    })
    const log = await Utils.transactionCompletion(txid)
    const event = NeonParser.parseRpcResponse(log.executions[0].notifications![0].state, {
      type: 'Hash160',
      hint: 'ScriptHash',
    })

    assert.equal(event[0], undefined)
    assert.equal(event[1], '0x' + testAccount.scriptHash)
    assert.equal(event[2], 1)

    const res = log.executions[0].stack![0]
    const parsed = NeonParser.parseRpcResponse(res, { type: 'Hash160', hint: 'ScriptHash' })
    assert.equal(event[3], parsed)
    tokenId = parseInt(u.reverseHex(u.base642hex(res.value as string)), 16)
  })

  it('Should verify the ITEM was minted using account state', async function () {
    const sdk = await getSDK(ACCOUNT)

    const account = await sdk.getUserJSON({
      address: testAccount.address,
    })
    assert.isNotNull(account.balance)
    assert.isAbove(account.balance as number, 0)
  })

  it('Should get the ITEM that was minted', async function () {
    const sdk = await getSDK(ACCOUNT)
    console.log(tokenId)
    const res = await sdk.getItemJSON({
      tokenId,
    })
    console.log(res)

    assert.equal(res.name, 'ITEM')
    assert.isEmpty(res.asset)
    assert.equal(res.bindOnPickup, 0)
    assert.isAbove(Object.keys(res.traits).length, 0)
    assert.equal(res.epoch.epochId, epochId)

    const flatRes = await sdk.getItemJSONFlat({
      tokenId,
    })

    const properties = await sdk.properties({
      tokenId,
    })
    assert.equal(JSON.stringify(flatRes), JSON.stringify(properties))
  })

  it('Should get the tokens of the user', async function () {
    const sdk = await getSDK()

    const tokens = await sdk.tokensOf({
      address: testAccount.address,
    })

    assert.notEqual(tokens.indexOf(tokenId), -1)
  })
})
