import { NeonParser } from '@cityofzion/neon-parser'
import { constants, Quests, Utils } from '../../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'

// TODO - Mint and verify total supply change
// TODO - Transfer tests

describe('Basic loop quest workflow', function () {
  this.timeout(60000)

  const account = new Neon.wallet.Account('b319cdef7f5f30f55d3dabc3e99cfc820bf1ccac7db66b51e2a4b281b83e5079')

  const node = constants.NetworkOption.LocalNet
  const quests = new Quests({
    account,
    node,
  })

  let quest
  let questId = -1
  const questMetadata = {
    title: 'Visit 2 murals and get a free beer',
    description: 'the quest details',
    maxCompletions: 5,
  }

  it('should create a quest and verify components', async () => {
    const txid = await quests.createQuest(questMetadata)
    const log = await Utils.transactionCompletion(txid)
    questId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(`questId: ${questId}`)

    // verify the quest
    quest = await quests.getQuestJSON({
      questId,
    })
  })

  it('should set the quest as active and verify states', async () => {
    const txid = await quests.setQuestActive({
      questId,
      state: true,
    })
    const log = await Utils.transactionCompletion(txid)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    assert.equal(res, 1)

    const quest = await quests.getQuestJSON({
      questId,
    })
    assert.equal(quest.active, true)
    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0],
    })
    const node = await quests.getNodeJSON({
      nodeId: edge.entry_node,
    })
    assert.notEqual(node.edges.indexOf(quest.edges[0]), -1)
  })

  it('should traverse the quest edge and verify state', async () => {
    const quest = await quests.getQuestJSON({
      questId,
    })

    const txid = await quests.traverseEdge({
      edgeId: quest.edges[0],
      conditionType: 1,
      resolution: [],
    })
    await Utils.transactionCompletion(txid)

    const questAgain = await quests.getQuestJSON({
      questId,
    })
    assert.equal(quest.completions + 1, questAgain.completions)
  })

  it('should burn the quest and verify that it cannot be overrun', async () => {
    let quest = await quests.getQuestJSON({
      questId,
    })
    while (quest.completions < quest.max_completions) {
      const txid = await quests.traverseEdge({
        edgeId: quest.edges[0],
        conditionType: 1,
        resolution: [],
      })
      await Utils.transactionCompletion(txid)

      quest = await quests.getQuestJSON({
        questId,
      })
    }
    try {
      await quests.traverseEdge({
        edgeId: quest.edges[0],
        conditionType: 1,
        resolution: [],
      })
      assert.fail()
    } catch (e) {
      console.log('pass')
    }
  })
})
