import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
import { u, wallet, rpc } from '@cityofzion/neon-core'
import { assert } from 'chai'
import { Generator } from '@cityofzion/props'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Authentication', function () {
  this.timeout(60000)

  // Populate the contract admin WIF
  const ACCOUNT = new wallet.Account('')

  // TESTING
  const mockItem = new wallet.Account('473285e66da60a76079292a6e5e774d45813596bfb0e42cb3bc3ebcaad2fc772')
  const tokens = { lizardTokenId: 3, itemTokenId: 13 }

  const scriptHash = Item.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  it('should check a signature', async function () {
    const tokenId = '30'
    const blockIndex = 3347182

    const itemKey = new wallet.Account('031191135657711468be9b94d0f8f7db1b4cbd5f43051dadb433fab757a0e79be1')
    console.log(itemKey.publicKey)
    console.log(itemKey.address)
    const sig =
      'c5594a2dcc231e9d07eb34ea4431037b845a0c10f8f70c4a4eb695241694788a63b6ae0098f51d941ce281b49c7dc059dde6f70870f208a7b311d3c62fe88690'

    // itemKey = await new wallet.Account()

    /*
    const client = new Neon.rpc.RPCClient(NODE)
    const blockHeight = await client.getBlockCount()
    blockIndex = blockHeight - 10
    const blockHash = await client.getBlockHash(blockIndex)
    const formattedBlockHash = u.reverseHex(blockHash.substring(2))
    sig = wallet.sign(formattedBlockHash, itemKey.privateKey)


     */
    console.log(itemKey.publicKey)
    console.log(sig)

    const sdk = await getSDK(ACCOUNT)

    const adminUser = await sdk.getUserJSON({
      address: ACCOUNT.address,
    })
    console.log(adminUser)

    const token = await sdk.getItemJSON({
      tokenId,
    })
    console.log(token)

    const authRes = await sdk.auth({
      mode: 'default',
      assetPubKey: itemKey.publicKey,
      blockIndex,
      signature: sig,
      burn: false,
    })
    console.log(authRes)

    const res = await sdk.bindItemConfirmed({
      // mode: 'default'
      tokenId,
      assetPubKey: itemKey.publicKey,
      blockIndex,
      signature: sig,
      // burn: false
    })
    console.log(res)
  })

  it('should bind an asset', async function () {
    const sdk = await getSDK(ACCOUNT)
    const client = new rpc.RPCClient(NODE)

    const targetBlockHeight = await client.getBlockCount()
    const blockHash = await client.getBlockHash(targetBlockHeight - 1)
    const formattedBlockHash = u.reverseHex(blockHash.substring(2))

    // should bind the nft to the mock item
    const sig = wallet.sign(formattedBlockHash, mockItem.privateKey)

    const res = await sdk.bindItemConfirmed({
      tokenId: tokens.itemTokenId.toString(),
      assetPubKey: mockItem.publicKey,
      blockIndex: targetBlockHeight - 1,
      signature: sig,
    })
    assert.isTrue(res)
  })

  it('should run a default authentication test', async function () {
    const targetBlock = 33

    const sdk = await getSDK()

    // let testAccount = new wallet.Account()
    // console.log(testAccount)
    const client = new rpc.RPCClient(NODE)
    const blockHash = await client.getBlockHash(targetBlock)
    const formattedBlockHash = u.reverseHex(blockHash.substring(2))
    // let sig = wallet.sign(formattedBlockHash, testAccount.privateKey)

    // const sig = 'cfeca11329e111e468279383aee9164eb556bedebcaff47ba0055a9c049efd346ac3bf9b53a07283c7231ae8e454a3ee6d78c4403990cab9735d94749542d9fa'
    // const blockHash = 'c3c3647ee02139b7bf26a6f8ee0019599eba19543294df3e515868df63b92d38'
    // const formattedBlockHash = u.reverseHex(blockHash)

    /*
    block index: 3303938
    block hash: dbd827910417ce1be239a9d8d744a0a188846662995d1628caa09708fbee5685
    public key: 03ea0e2b7445225536eb609ac2eb1935e14943697e93058397e6605793c64401c3

    signature: 2447b66bcdce2b78e31ae761b7dd112cee1ea6597c8aab11f1303adb86146f8db371d4e63bca0c4b81ce9fb94e4304dc7100a2bbc0d4eece8ff63772c6e42a6d
     */

    // let formattedBlockHash = 'c1ecd3d15263627ee7fe5099d9ded14dbbc7fdd371b520fe6681dacfe8ac39be'
    // formattedBlockHash = u.reverseHex('dbd827910417ce1be239a9d8d744a0a188846662995d1628caa09708fbee5685')
    const testAccount = new wallet.Account('036760967dcf8aeb9e730218b2a66a9d9f0efbab02c534f442e9bbfc77abf4d2a9')
    const sig =
      'dc9942387570a8c6edd482dc723d993db38c5686b9cd5fb4b9569430bb258038f2742a094188ee1aba3e22fa5e91b721d544db1673b9ec31284f4f63bbba950f'

    console.log(`test account pubkey: ${testAccount.publicKey}`)
    // console.log(`formatted block hash: ${blockHash}`)
    console.log(`sig: ${sig}`)

    const sigCheck = wallet.verify(formattedBlockHash, sig, testAccount.publicKey)
    console.log(`Signature validity: ${sigCheck}`)

    const res = await sdk.auth({
      mode: 'default',
      assetPubKey: testAccount.publicKey,
      blockIndex: targetBlock,
      signature: sig,
      burn: false,
    })
    assert(res)
  })

  it('should run core authentication', async function () {
    const sdk = await getSDK(ACCOUNT)
    const mockITEM = await new wallet.Account()
    const client = new rpc.RPCClient(NODE)
    const authAge = 4
    // Create an item epoch
    const maxSupply = 5000
    const generatorInstanceId = 11
    let txid = await sdk.createEpoch({
      label: 'DK1',
      generatorInstanceId,
      mintFee: 10 * 10 ** 8,
      sysFee: 0.4 * 10 ** 8,
      maxSupply,
      authAge,
    })
    let log = await Utils.transactionCompletion(txid)
    const epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])

    // Grant mint permissions to the epoch for the generator instance
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

    txid = await generator.setInstanceAuthorizedContracts(generatorInstanceId, authorizedContracts, ACCOUNT)
    log = await Utils.transactionCompletion(txid)
    let res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.equal(1, 1)

    // Mint a new ITEM NFT
    txid = await sdk.offlineMint({
      epochId,
      address: ACCOUNT.address,
    })
    log = await Utils.transactionCompletion(txid)
    const tokenId = NeonParser.parseRpcResponse(log.executions[0].stack![0])

    let targetBlockHeight = await client.getBlockCount()
    let blockHash = await client.getBlockHash(targetBlockHeight - 1)
    let formattedBlockHash = u.reverseHex(blockHash.substring(2))

    // should bind the nft to the mock item
    let sig = wallet.sign(formattedBlockHash, mockITEM.privateKey)

    console.log('binding item')
    res = await sdk.bindItemConfirmed({
      tokenId: tokenId.toString(),
      assetPubKey: mockITEM.publicKey,
      blockIndex: targetBlockHeight - 1,
      signature: sig,
    })
    assert.equal(res, true)
    const tokenJSON = await sdk.getItemJSON({
      tokenId: tokenId.toString(),
    })
    console.log(tokenJSON)

    // verify light auth
    console.log('light auth')
    targetBlockHeight = await client.getBlockCount()
    blockHash = await client.getBlockHash(targetBlockHeight - 1)
    formattedBlockHash = u.reverseHex(blockHash.substring(2))
    sig = wallet.sign(formattedBlockHash, mockITEM.privateKey)

    res = await sdk.auth({
      mode: 'light',
      assetPubKey: mockITEM.publicKey,
      blockIndex: targetBlockHeight - 1,
      signature: sig,
      burn: false,
    })
    assert.isTrue(res)

    // fail an old block
    console.log('fail an old auth')
    targetBlockHeight = await client.getBlockCount()
    blockHash = await client.getBlockHash(targetBlockHeight - authAge - 5)
    formattedBlockHash = u.reverseHex(blockHash.substring(2))
    sig = wallet.sign(formattedBlockHash, mockITEM.privateKey)

    try {
      res = await sdk.auth({
        mode: 'light',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: false,
      })
      assert.fail()
    } catch (err) {}

    // verify restrictive auth
    console.log('verify resitricted')
    targetBlockHeight = await client.getBlockCount()
    blockHash = await client.getBlockHash(targetBlockHeight - 1)
    formattedBlockHash = u.reverseHex(blockHash.substring(2))
    sig = wallet.sign(formattedBlockHash, mockITEM.privateKey)

    res = await sdk.auth({
      mode: 'restrictive',
      assetPubKey: mockITEM.publicKey,
      blockIndex: targetBlockHeight - 1,
      signature: sig,
      burn: false,
    })
    assert.isTrue(res)

    // fail auth for someone who doesnt own the token
    console.log('fail restricted for lack of ownership')
    const usurper = new wallet.Account()
    sig = wallet.sign(formattedBlockHash, usurper.privateKey)
    try {
      res = await sdk.auth({
        mode: 'restrictive',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: false,
      })
      assert.fail()
    } catch (err) {}

    // TODO - sign the wrong block and verify
    console.log('sign the wrong block and fail')
    const targetBlock = 2
    blockHash = await client.getBlockHash(targetBlock)
    formattedBlockHash = u.reverseHex(blockHash.substring(2))

    sig = wallet.sign(formattedBlockHash, ACCOUNT.privateKey)

    try {
      res = await sdk.auth({
        mode: 'default',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlock + 1,
        signature: sig,
        burn: false,
      })
      assert.fail()
    } catch (err) {}

    // create a unique signature
    // verify restrictive auth
    console.log('create a unique auth signature')
    targetBlockHeight = await client.getBlockCount()
    blockHash = await client.getBlockHash(targetBlockHeight - 1)
    formattedBlockHash = u.reverseHex(blockHash.substring(2))
    sig = wallet.sign(formattedBlockHash, mockITEM.privateKey)

    res = await sdk.authCommitConfirmed({
      mode: 'restrictive',
      assetPubKey: mockITEM.publicKey,
      blockIndex: targetBlockHeight - 1,
      signature: sig,
      burn: true,
    })
    assert.isTrue(res)

    // try to replay attack
    console.log('try a replay attack')
    try {
      res = await sdk.auth({
        mode: 'restrictive',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: false,
      })
      assert.fail()
    } catch (err) {}
  })
})
