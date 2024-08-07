import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils } from '../dist/esm'
import { Generator, Collection, types } from '@cityofzion/props'
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'
import { NetworkOption } from '@cityofzion/props/dist/interface'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Consensus 2023', function () {
  this.timeout(60000)

  // populate with contract admin
  const ACCOUNT = new Neon.wallet.Account('')

  const scriptHash = NetworkOption.MainNet
  const NODE = 'https://mainnet2.neo2.coz.io:443'


  it('should get the generator', async function () {
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NetworkOption.MainNet,
    })
    await generator.init()
    const res = await generator.getGeneratorJSON(16)
    console.log(res)
  })

  it('should create a new generator instance', async function () {
    console.log(ACCOUNT.address)
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NetworkOption.MainNet,
    })
    await generator.init()

    const txid = await generator.createInstance(8, ACCOUNT)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 30000,
    })
    const generatorInstanceId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log('generator instance id: ', generatorInstanceId)
    assert.isAbove(generatorInstanceId, 0)
  })

  /*
  it('Should create an item epoch using the new generator instance', async function () {
    const maxSupply = 2000
    const generatorInstanceId = 14
    const sdk = await getSDK(ACCOUNT)

    const txid = await sdk.createEpoch({
      label: 'DK1',
      generatorInstanceId,
      mintFee: 10 * 10 ** 8,
      sysFee: 0.4 * 10 ** 8,
      maxSupply,
      authAge: 20,
    })
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 30000,
    })
    const epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    log.executions[0].notifications!.forEach(notif => {
      console.log(NeonParser.parseRpcResponse(notif.state))
    })
    console.log(epochId)
    console.log(txid)
    assert.isAbove(epochId, 0)
  })

  it('Should set use permissions for the generator instance', async function () {
    const epochId = 5
    const generatorInstanceId = 14

    const authorizedContracts = [
      {
        scriptHash,
        code: epochId,
      },
    ]
    const generator = await new Generator({
      network: NetworkOption.MainNet,
    })
    await generator.init()

    const txid = await generator.setInstanceAuthorizedContracts(generatorInstanceId, authorizedContracts, ACCOUNT)
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 30000,
    })
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(res)
    assert.equal(res, 1)

    const r = await generator.getGeneratorInstanceJSON(generatorInstanceId)
    console.log(r)
  })

  it('it should get the item with the public key', async function () {
    const sdk = await getSDK()
    const item = await sdk.getAssetItemJSON({
      assetPubKey: '03d4dbc966d4e2c43be0beab56859c1dd04bb1f542d1562d6531064574023dfad5',
    })
    console.log(item)
  })

  it('should get the user', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getUserJSON({
      address: ACCOUNT.address,
    })
    console.log(res)
  })

  it('Should mint', async function () {
    const testAccount = new Neon.wallet.Account('L2QckffShko8godFoH6wS1TK6AtdGZHdx5D4M8rn9KdwcnSEKrpg')

    const sdk = await getSDK(ACCOUNT)
    console.log(ACCOUNT.address)
    const admin = await sdk.getUserJSON({
      address: ACCOUNT.address,
    })
    console.log(admin)

    const txid = await sdk.offlineMint({
      epochId,
      address: testAccount.address
      //address: ACCOUNT.address,

    })
    const log = await Utils.transactionCompletion(txid,{
      node: NODE,
      period: 1000,
      timeout: 30000
    })
    const event = NeonParser.parseRpcResponse(log.executions[0].notifications![0].state, {
      ByteStringToScriptHash: true,
    })

    console.log(event)
    assert.equal(event[0], undefined)
    assert.equal(event[1], '0x' + ACCOUNT.scriptHash)
    assert.equal(event[2], 1)
    assert.isAbove(event[3], 0)

    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.equal(res, 1)


    const tokens = await sdk.tokensOf({
      address: testAccount.address,
    })
    console.log('tokens: ', tokens)

    const token = await sdk.getItemJSON({
      tokenId: tokens[0],
    })

    console.log(token)
  })

  /*
  it("should run light authentications", async function() {

    const sdk = await getSDK(ACCOUNT)
    const mockITEM = await new Neon.wallet.Account()
    const client = new Neon.rpc.RPCClient(NODE)

    // verify light auth
    console.log('light auth')
    const targetBlockHeight = await client.getBlockCount()
    const blockHash = await client.getBlockHash(targetBlockHeight - 1)
    const formattedBlockHash = u.reverseHex(blockHash.substring(2))
    const sig = Neon.wallet.sign(formattedBlockHash, mockITEM.privateKey)

    console.log(sig)

    //verify that the item is authentic and the signature is unique
    try {
      let txid = await sdk.authCommit({
        mode: 'default',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: true
      })
    } catch(e){
      //already scanned
    }
    const log = await Utils.transactionCompletion(txid,{
      node: NODE,
      period: 1000,
      timeout: 60000
    })
    let res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.isTrue(res)

    try {
      res = await sdk.authCommit({
        mode: 'default',
        assetPubKey: mockITEM.publicKey,
        blockIndex: targetBlockHeight - 1,
        signature: sig,
        burn: true
      })
      assert.fail()
    } catch(e){}
  })


  // fix me
  it('get the epoch', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getEpochJSON({
      epochId: '2',
    })
    console.log(res)
  })

  it('get the epoch', async function () {
    const sdk = await getSDK(ACCOUNT)
    const res = await sdk.getEpochJSON({
      epochId: '2',
    })
    console.log(res)
  })

  it('should select the winner of the silver ring', async function () {
    // initialize our collection prop instance
    const collection = new Collection({
      network: types.NetworkOption.MainNet,
    })
    await collection.init()

    // our list of options that the network will be choosing from
    const options = `@neowatcher123
    @KeiZhao6736
    @Rheoknudson
    @jeff11818944
    @HeirloomH
    @0xmilosneo
    @GrassFedGuru
    @Fio02618066
    @juandav95015799
    @sikasi9
    @Crypt0Babylon
    @LucaLatini
    @BouzN3
    @OnyinyePrince2
    @Matthew20Rex
    @kaci96142066
    @console_player1
    @Hodl4L
    @zatouroff
    @Ikechuk042
    @mayonese_sw
    @JpLerossignol
    @NEOGASM7
    @Emmanue58895257
    @hq_vuong
    @janinmsq
    @iam_Furst
    @Jhonata18254670
    @Rodes_Neo
    @Joris79D
    @JudeJuwon
    @NEO_R1CH
    @JirkaPech
    @CryptoKnorry
    @Fakiledetimile1
    @AW153_xyz
    @schlummer2k
    @real_Mr_google
    @GreengoXrp
    @Lucash2763
    @hectorc05
    @Emilio90739075
    @Neo_Blockchain
    @GreenfinchApp
    @JanTY23
    @solokrisofficia
    @kriptoyasina
    @koinarge
    @Jhonata18254670
    @NEOFORCEONE
    @ercliow
    @DarkGoat_Neo
    @Mohsen8239
    @KeiZhao6736
    @0xmilosneo
    @GrassFedGuru
    @TheJollyHodler
    @schlummer2k
    @roschler
    @janinmsq
    @Emilio90739075
    @ChungaLunga10
    @Joris79D
    @whoamiiran
    @mayonese_sw
    @dalstish
    @iam_Furst
    @sikasi9
    @Ikechuk042
    @OnyinyePrince2
    @AbiolaDogara
    @Matthew20Rex
    @kaci96142066
    @DimeRonald
    @john_devadoss
    @gincryptonicgm1
    @KacperSuperson
    @JudeJuwon
    @Kvngiyzz
    @Fakiledetimile1
    @KSamjoe1
    @Lizzywealth5
    @Victori42413719
    @testertje777_OG
    @EnronsHome
    @solokrisofficia
    @GrabowskiDylan
    @real_Mr_google
    @FlamboyantFLM
    @face2interface
    @whaledh
    @BoavYittan
    @BouzN3
    @ColumboTrader
    @NguyenL06969144
    @Rodes_Neo
    @Carol80010563
    @Emmanue58895257
    @JpLerossignol
    @QuirkySoulCLG
    @JakeEwol
    @Blessin40211672
    @kriptoyasina
    @78avt
    @Crypto123454321
    @DevHawk`

    function onlyUnique(value: any, index: any, array: any) {
      return array.indexOf(value) === index
    }

    const uniqueContestants = options.split('\n').map(o => {
      return o.trim()
    })
    console.log(uniqueContestants)

    const contestantsClean = uniqueContestants.map(item => {
      return Neon.u.sha256(item).slice(0, 4)
    })
    assert((contestantsClean.filter(onlyUnique).length = options.length))
    console.log(contestantsClean)

    // pick 5 from the list of options; do not replace the selections in the options once selected (no repeat selections)
    // const txid = await collection.sampleFromRuntimeCollection(contestantsClean, 1, false, ACCOUNT)
    const txid = '0xd32da8dea67aa376297020d8fabd2f55a78edd1c9b5169d5fd26ad84561ff4c8'
    console.log(txid)

    const applog = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 30000,
    })
    const res = NeonParser.parseRpcResponse(applog.executions[0].stack![0])

    // its a good idea to log this for reference via https://dora.coz.io
    console.log(res)

    const i = contestantsClean.indexOf(res[0])
    console.log(uniqueContestants[i])
  })


   */

})
