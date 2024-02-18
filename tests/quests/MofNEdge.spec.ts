import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { Quest, Utils } from '../../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'
import { EdgeConditionITEMPick } from '../../dist/esm/types'

// TODO - Mint and verify total supply change
// TODO - Transfer tests

describe('Basic loop quest workflow', function () {
  this.timeout(60000)

  const NODE = 'http://127.0.0.1:50012'
  const ACCOUNT = new Neon.wallet.Account('b319cdef7f5f30f55d3dabc3e99cfc820bf1ccac7db66b51e2a4b281b83e5079')

  const getSDK = async (account?: any) => {
    return new Quest({
      scriptHash: Quest.PRIVATENET,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }

  let questId = -1
  const questMetadata = {
    title: 'Visit 2 murals and get a free beer',
    description: 'the quest details (M of N)',
    maxCompletions: 5,
  }

  const edgeConditions: EdgeConditionITEMPick = {
    count: 1,
    tokens: [1758],
  }

  it('should get all the quests', async () => {
    const quests = await getSDK()
    const totalQuests = await quests.totalQuests()
    console.log(totalQuests)
    for (let i = 1; i <= totalQuests; i++) {
      const quest = await quests.getQuestJSON({
        questId: i,
      })
      console.log(quest)
    }
  })

  it('should create a quest and set the edge condition', async () => {
    const quests = await getSDK(ACCOUNT)

    let txid = await quests.createQuest(questMetadata)
    let log = await Utils.transactionCompletion(txid)
    console.log(txid, parseInt(log.executions[0].gasconsumed) / 10 ** 8)
    questId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    const quest = await quests.getQuestJSON({
      questId,
    })
    console.log(quest)

    const params = {
      edgeId: quest.edges[0],
      conditionType: 1,
      condition: edgeConditions,
    }
    console.log(params)
    txid = await quests.setEdgeCondition(params)
    log = await Utils.transactionCompletion(txid)
    console.log(txid, parseInt(log.executions[0].gasconsumed) / 10 ** 8)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(`res: ${res}`)

    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0],
    })
    console.log(edge)
  })

  it('should set the quest as active and verify states', async () => {
    const quests = await getSDK(ACCOUNT)
    const txid = await quests.setQuestActive({
      questId,
      state: true,
    })
    const log = await Utils.transactionCompletion(txid)
    console.log(txid, parseInt(log.executions[0].gasconsumed) / 10 ** 8)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.equal(res, 1)

    const quest = await quests.getQuestJSON({
      questId,
    })
    assert.equal(quest.active, true)
  })

  it('should traverse the quest edge and verify state', async () => {
    const quests = await getSDK(ACCOUNT)
    const quest = await quests.getQuestJSON({
      questId,
    })
    console.log(quest)

    const scanExample = [
      'https://itm.st/mp/2485?d=BGb1l5Pw4lSvEve..Kq.F_pJJzabDRFQUPA4qd6QgPzOQ4T35W4G98l5h6Wt1xBRgMZ3CYFeflqMHDN1jwXFjM.3v7CLkb8DwiWx5zbgamf223qwOgpJKQDTkbwy5MbaNDBEAiB9WGa9Hzj1KzReGn3VAuKV2I_69ouVRAAbZB0O8BVS_gIgfvE4K.egRVpAn3ZuKSUh21XB4wbLwpJD2wCVLi1Sen4-',
    ]
    const tokens = [1758]
    const resolution = []

    for (let i = 0; i < scanExample.length; i++) {
      const parsed = Utils.decodeNDEF(scanExample[i])
      resolution.push({
        tokenId: tokens[i],
        msg: parsed.entropy,
        sig: parsed.sig,
      })
    }

    const txid = await quests.traverseEdge({
      edgeId: quest.edges[0],
      conditionType: 1,
      resolution,
    })
    const log = await Utils.transactionCompletion(txid)
    console.log(txid, parseInt(log.executions[0].gasconsumed) / 10 ** 8)

    const questAgain = await quests.getQuestJSON({
      questId,
    })
    assert.equal(quest.completions + 1, questAgain.completions)
  })
})
