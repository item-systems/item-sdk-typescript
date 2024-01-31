import { NeonInvoker } from '@cityofzion/neon-invoker'
import { ContractInvocation } from '@cityofzion/neo3-invoker'

import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
import { Generator } from '@cityofzion/props'
// @ts-ignore
import Neon, { u, wallet } from '@cityofzion/neon-core'
import { assert } from 'chai'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Bind on pickup', function () {
  this.timeout(60000)

  const mockAssetSig =
    'https://itm.st/mp/2485?d=BKe44xyvvjiuea6NGZMK4bXYf8rt3vECOR' +
    'KT1LDHbg60TFnhqX0V2xiSfUaCy79x3.Oc9B5xA6.ncVDq4l2WVVHMHbzVU8Jl4eHE4rlQc5ES' +
    'umQWLuvBnpgwLPuPLHadiTBGAiEAsXfRcaj10m0OXj4i0XmDy2lyqrocFv0kF9PaL3C8hSgCIQ' +
    'DdrRMmAfaZN79yTl4hUnpHToPhZfMyMYDp69pkIHjD2Q--'
  const mockAsset = Utils.decodeNDEF(mockAssetSig)

  // populate with contract admin
  const ACCOUNT = new Neon.wallet.Account('')
  const claimAccount = new Neon.wallet.Account('')
  console.log(claimAccount.WIF)
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
  let epochId = -1
  let tokenId = -1

  it('Should create an item epoch using a generator instance', async function () {
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

  it('Should mint a token and verify that BoP is disabled', async function () {
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.offlineMint({
      epochId,
      address: ACCOUNT.address,
      bindOnPickup: false,
    })
    const log = await Utils.transactionCompletion(txid)
    const res = log.executions[0].stack![0]
    tokenId = parseInt(u.reverseHex(u.base642hex(res.value as string)), 16)

    const token = await sdk.getItemJSON({
      tokenId,
    })
    assert.equal(token.bindOnPickup, 0)
  })

  it('should bind an asset to its digital twin', async function () {
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.bindItem({
      tokenId,
      assetPubKey: mockAsset.pubKey,
    })
    await Utils.transactionCompletion(txid)

    const token = await sdk.getItemJSON({
      tokenId,
    })
    assert.equal(mockAsset.pubKey, u.str2hexstring(token.asset as string))
  })

  it('Should enable BoP', async function () {
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.setBindOnPickup({
      tokenId,
      state: true,
    })
    await Utils.transactionCompletion(txid)
    const token = await sdk.getItemJSON({
      tokenId,
    })
    assert.equal(token.bindOnPickup, 1)
  })

  it('Should verify that the signature received is valid', async function () {
    console.log(`actual account pubkey: ${mockAsset.pubKey}`)
    const sigCheck = wallet.verify(mockAsset.entropy, mockAsset.sig, mockAsset.pubKey)
    console.log(`signature validity: ${sigCheck}`)

    const sdk = await getSDK()
    const res = await sdk.auth({
      mode: 'default',
      assetPubKey: mockAsset.pubKey,
      message: mockAsset.entropy,
      signature: mockAsset.sig,
      burn: false,
    })
    console.log(`invocation result: ${res}`)
  })

  it('Should claim the asset', async function () {
    const claimSDK = await getSDK(claimAccount)

    // transfer some GAS so the ITEM can be claimed
    const invocation: ContractInvocation = {
      scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      operation: 'transfer',
      args: [
        { type: 'Hash160', value: ACCOUNT.address },
        { type: 'Hash160', value: claimAccount.address },
        { type: 'Integer', value: 10 ** 8 },
        { type: 'Any', value: '' },
      ],
    }
    const transferInvoker = await NeonInvoker.init(NODE, ACCOUNT)
    let txid = await transferInvoker.invokeFunction({
      invocations: [invocation],
      signers: [],
    })
    await Utils.transactionCompletion(txid)

    // verify the owner
    let token = await claimSDK.getAssetItemJSON({
      assetPubKey: mockAsset.pubKey,
    })
    assert.equal(Neon.wallet.getAddressFromScriptHash(token.owner.slice(2)), ACCOUNT.address)

    // claim the asset
    txid = await claimSDK.claimBindOnPickup({
      assetPubKey: mockAsset.pubKey,
      message: mockAsset.entropy,
      signature: mockAsset.sig,
    })

    const log = await Utils.transactionCompletion(txid)
    const event = NeonParser.parseRpcResponse(log.executions[0].notifications![0].state, {
      ByteStringToScriptHash: true,
    })
    console.log(event)
    // verify the notification
    assert.equal(event[0], '0x' + ACCOUNT.scriptHash)
    assert.equal(event[1], '0x' + claimAccount.scriptHash)
    assert.equal(event[2], 1)
    assert.equal(parseInt(u.reverseHex(u.str2hexstring(event[3])), 16), tokenId)

    // verify the owner
    token = await claimSDK.getAssetItemJSON({
      assetPubKey: mockAsset.pubKey,
    })

    assert.equal(Neon.wallet.getAddressFromScriptHash(token.owner.slice(2)), claimAccount.address)
    assert.equal(token.bindOnPickup, 0)
  })

  it('Should define some user-defined traits', async function () {
    const claimSDK = await getSDK(claimAccount)

    let tok = await claimSDK.getItemJSON({
      tokenId,
    })

    const txid = await claimSDK.setItemProperties({
      tokenId,
      properties: {
        foo: 'bar',
        nice: 'job',
      },
    })
    await Utils.transactionCompletion(txid)

    tok = await claimSDK.getItemJSON({
      tokenId,
    })
    assert.equal(tok.traits.user_defined.foo, 'bar')
    assert.equal(tok.traits.user_defined.nice, 'job')
  })

  it('Should lock the token', async function () {
    const claimSDK = await getSDK(claimAccount)

    let tok = await claimSDK.getItemJSON({
      tokenId,
    })
    console.log(tok)
    console.log(claimAccount.address, wallet.getAddressFromScriptHash(tok.owner.slice(2)))
    const txid = await claimSDK.lock({
      tokenId,
    })
    await Utils.transactionCompletion(txid)

    tok = await claimSDK.getItemJSON({
      tokenId,
    })
    console.log(tok)
  })
})
