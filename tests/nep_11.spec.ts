import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
import { Generator } from '@cityofzion/props'
// @ts-ignore
import Neon, { u } from '@cityofzion/neon-core'
import { assert } from 'chai'
import { StackItemJson } from '@cityofzion/neo3-invoker'

describe('NEP-11 features', function () {
  this.timeout(60000)

  // contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const testAccount = new Neon.wallet.Account('')

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
    label: 'Test Epoch',
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

    const ts = await sdk.totalSupply()

    const txid = await sdk.offlineMint({
      epochId,
      address: testAccount.address,
      bindOnPickup: false,
    })
    const log = await Utils.transactionCompletion(txid)
    const event = NeonParser.parseRpcResponse(log.executions[0].notifications![0].state, {
      ByteStringToScriptHash: true,
    })

    assert.equal(event[0], undefined)
    assert.equal(event[1], '0x' + testAccount.scriptHash)
    assert.equal(event[2], 1)

    const res = log.executions[0].stack![0]
    const parsed = NeonParser.parseRpcResponse(res, {
      ByteStringToScriptHash: true,
    })
    assert.equal(event[3], parsed)
    tokenId = parseInt(u.reverseHex(u.base642hex(res.value as string)), 16)

    const newTS = await sdk.totalSupply()
    assert.equal(newTS, ts + 1)
  })

  it('Should get the symbol', async function () {
    const sdk = await getSDK()
    const symbol = await sdk.symbol()
    assert.equal(symbol, 'ITEM')
  })

  it('Should get the decimals', async function () {
    const sdk = await getSDK()
    const decimals = await sdk.decimals()
    assert.equal(decimals, 0)
  })

  it('Should get the total supply', async function () {
    const sdk = await getSDK()
    const ts = await sdk.totalSupply()
    assert.isAbove(ts, 0)
  })

  it('Should get the balance of', async function () {
    const sdk = await getSDK()
    const balance = await sdk.balanceOf({
      address: testAccount.address,
    })
    assert.equal(balance, 1)
  })

  it('Should get the tokens of', async function () {
    const sdk = await getSDK()
    const tokens = await sdk.tokensOf({
      address: testAccount.address,
    })
    assert.equal(tokens[0], tokenId)
    assert.equal(tokens.length, 1)
  })

  it('Should get the owner of', async function () {
    const sdk = await getSDK()
    const owner = await sdk.ownerOf({
      tokenId,
    })
    assert.equal(owner, testAccount.address)
  })

  it('Should get the tokens', async function () {
    const sdk = await getSDK()
    const tokens = await sdk.tokens()
    assert.isAbove(tokens.length, 0)
    assert.notEqual(tokens.indexOf(tokenId), -1)
  })

  it('Should get the properties', async function () {
    const sdk = await getSDK()
    const properties = await sdk.properties({
      tokenId,
    })
    assert(properties)
  })

  it('should transfer an item', async function () {
    const sdk = await getSDK(ACCOUNT)
    const testAccountB = new Neon.wallet.Account()

    let txid = await sdk.offlineMint({
      epochId,
      address: ACCOUNT.address,
      bindOnPickup: false,
    })
    let log = await Utils.transactionCompletion(txid)
    const newToken = parseInt(u.reverseHex(u.base642hex(log.executions[0].stack![0].value as string)), 16)
    console.log(newToken)

    txid = await sdk.transfer({
      to: testAccountB.address,
      tokenId: newToken,
      data: '',
    })
    log = await Utils.transactionCompletion(txid)
    const res = NeonParser.parseRpcResponse(log.executions![0].stack![0])
    assert.isTrue(res)

    // verify notifications
    const notif = NeonParser.parseRpcResponse(log.executions![0].notifications[0].state, {
      ByteStringToScriptHash: true,
    })
    assert.equal(log.executions![0].notifications[0].eventname, 'Transfer')
    assert.equal(notif[0], '0x' + ACCOUNT.scriptHash)
    assert.equal(notif[1], '0x' + testAccountB.scriptHash)
    assert.equal(notif[2], 1)

    const tok = (log.executions![0].notifications![0].state.value as StackItemJson[])[3]
    assert.equal(parseInt(u.reverseHex(u.base642hex(tok.value as string)), 16), newToken)

    const ownerRes = await sdk.ownerOf({
      tokenId: newToken,
    })
    assert.equal(ownerRes, testAccountB.address)
  })
})
