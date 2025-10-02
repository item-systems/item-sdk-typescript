import { NeonParser } from '@cityofzion/neon-parser'
import { Item, Utils, types, Quests } from '../src'
import Neon, { u } from "@cityofzion/neon-core";
import { NetworkOption } from '@cityofzion/props/dist/interface'
import { NeonInvoker } from '@cityofzion/neon-invoker'

// TODO - Mint and verify total supply change
// TODO - Transfer tests
describe('Consensus 2023', function () {
  this.timeout(60000)

  // populate with contract admin
  const ACCOUNT = new Neon.wallet.Account('L5kx9QRKG9dwzSJF72pgps1d2scJZjnECWoKuUGVsz2D1WRBEaJ7')
  const poc = new Neon.wallet.Account('')
  console.log(poc.WIF, poc.address)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const GENERATOR_ID = 12
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const GENERATOR_INSTANCE_ID = 16
  const ITEM_EPOCH = 7
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scriptHash = '' // Item.MAINNET
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const NETWORK = NetworkOption.MainNet
  const NODE = 'https://mainnet2.neo.coz.io:443'

  const getSDK = async (account?: any) => {
    return new Item({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  /*
  it('should create a new collection', async function () {
    const collection = await new Collection({
      scriptHash: '0xf05651bc505fd5c7d36593f6e8409932342f9085',
      network: NETWORK,
    })
    await collection.init()

    const tc = await collection.totalCollections()
    console.log(tc)
    for (let i = 1; i <= tc!; i++) {
      const c = await collection.getCollectionJSON(i)
      console.log(c)
    }
  })

  it('should create the generator', async function () {
    this.timeout(0)
    console.log(ACCOUNT.address)

    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NETWORK,
    })
    await generator.init()

    const genParams: types.GeneratorType = {
      label: 'Shadow Brother Sunday',
      baseGeneratorFee: 15140620,
      traits: [
        {
          label: 'type',
          slots: 1,
          traitLevels: [
            {
              dropScore: 1000000,
              mintMode: 0,
              traits: [
                {
                  type: 0,
                  maxMint: -1,
                  args: {
                    collectionId: 8,
                    index: 2,
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'format',
          slots: 1,
          traitLevels: [
            {
              dropScore: 1000000,
              mintMode: 0,
              traits: [
                {
                  type: 0,
                  maxMint: -1,
                  args: {
                    collectionId: 8,
                    index: 4,
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'perf',
          slots: 1,
          traitLevels: [
            {
              dropScore: 1000000,
              mintMode: 0,
              traits: [
                {
                  type: 0,
                  maxMint: -1,
                  args: {
                    collectionId: 8,
                    index: 5,
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'framerate',
          slots: 1,
          traitLevels: [
            {
              dropScore: 1000000,
              mintMode: 0,
              traits: [
                {
                  type: 0,
                  maxMint: -1,
                  args: {
                    collectionId: 8,
                    index: 6,
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'frames',
          slots: 1,
          traitLevels: [
            {
              dropScore: 1000000,
              mintMode: 0,
              traits: [
                {
                  type: 0,
                  maxMint: -1,
                  args: {
                    collectionId: 8,
                    index: 7,
                  },
                },
              ],
            },
          ],
        },
      ],
    }

    const ts = await generator.totalGenerators()
    console.log(ts)

    const res = await generator.createGenerator(genParams, ACCOUNT, 60000)
    console.log(res)
  })

  it('should get the generator', async function () {
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NETWORK,
    })
    await generator.init()
    const res = await generator.getGeneratorJSON(GENERATOR_ID)
    console.log(res)
  })

  it('should create a new generator instance', async function () {
    this.timeout(0)

    console.log(ACCOUNT.address)
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NETWORK,
    })
    await generator.init()

    const txid = await generator.createInstance(GENERATOR_ID, ACCOUNT)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 60000,
    })
    const generatorInstanceId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log('generator instance id: ', generatorInstanceId)
    assert.isAbove(generatorInstanceId, 0)

    const instance = await generator.getGeneratorInstanceJSON(generatorInstanceId)
    console.log(instance)
  })

  it('Should create an item epoch using the new generator instance', async function () {
    this.timeout(0)
    const maxSupply = 30
    const sdk = new Item({
      account: ACCOUNT
    })

    const txid = await sdk.createEpoch({
      label: 'ITEM Systems Apparel',
      generatorInstanceId: GENERATOR_INSTANCE_ID,
      mintFee: 100 * 10 ** 9,
      sysFee: 30140620,
      maxSupply,
      authAge: 20,
    })
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 60000,
    })
    const epochId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    log.executions[0].notifications!.forEach(notif => {
      console.log(NeonParser.parseRpcResponse(notif.state))
    })
    console.log(epochId)
    console.log(txid)
    assert.isAbove(epochId, 0)
  })


  it('should get the epoch', async function () {
    const sdk = new Item()
    const res = await sdk.getEpochJSON({
      epochId: ITEM_EPOCH,
    })
    console.log(res)
  })

  it('Should set use permissions for the generator instance', async function () {
    this.timeout(0)

    const authorizedContracts = [
      {
        scriptHash: '0x904deb56fdd9a87b48d89e0cc0ac3415f9207840',
        code: ITEM_EPOCH,
      },
    ]
    const generator = await new Generator({
      scriptHash: '0x0e312c70ce6ed18d5702c6c5794c493d9ef46dc9',
      network: NETWORK,
    })
    await generator.init()

    const txid = await generator.setInstanceAuthorizedContracts(GENERATOR_INSTANCE_ID, authorizedContracts, ACCOUNT)
    console.log(txid)
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      node: NODE,
      timeout: 60000,
    })
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(res)

    const r = await generator.getGeneratorInstanceJSON(GENERATOR_INSTANCE_ID)
    console.log(r)
  })


   */
  it('Should mint', async function () {
    this.timeout(0)
    const item = new Item({
      account: ACCOUNT,
    })

    const address = ACCOUNT.address

    const txid = await item.offlineMint({
      epochId: ITEM_EPOCH,
      address,
      bindOnPickup: false,
    })
    console.log(txid)

    const log = await Utils.transactionCompletion(txid, {
      node: NODE,
      period: 1000,
      timeout: 60000,
    })
    const event = NeonParser.parseRpcResponse(log.executions[0].notifications![0].state, {
      ByteStringToScriptHash: true,
    })
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])

    console.log(event, res)
  })

  it('should get the last token', async function () {
    const sdk = await getSDK(ACCOUNT)
    const ts = await sdk.totalSupply()

    const lastToken = await sdk.getItemJSON({
      tokenId: ts,
    })
    console.log(lastToken)
  })

  it('should get the token of a user', async function () {
    const sdk = await getSDK(ACCOUNT)
    const tokens = await sdk.tokensOf({
      address: 'Nihv7FqvJb3Ajco7jtyS5xuLWrW3r8kedu',
    })

    const token = await sdk.getItemJSON({
      tokenId: tokens[0],
    })
    console.log(u.hex2base64(u.str2hexstring(token.tokenId.toString())))
    console.log(token)
  })

  it('Should get an edge', async () => {
    const quests = new Quests({
      account: ACCOUNT,
    })
    const quest = await quests.getQuestJSON({
      questId: 3,
    })

    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0],
    })
    console.log(edge)



    const edgeConditions: types.EdgeConditionITEMPick = {
      count: 2,
      tokens: [], // edge.condition.tokens.filter(onlyUnique).concat([1767]), // tokens doesn't exist on EdgeType
    }
    console.log(edgeConditions)

    const params = {
      edgeId: quest.edges[0],
      conditionType: 1,
      condition: edgeConditions,
    }
    const txid = await quests.setEdgeCondition(params)
    console.log(txid)
  })
})

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onlyUnique(value, index, array) {
  return array.indexOf(value) === index
}
