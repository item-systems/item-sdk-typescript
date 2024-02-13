import { NeonInvoker } from "@cityofzion/neon-invoker";
import { NeonParser } from "@cityofzion/neon-parser";
import { Quest, Utils } from "../../dist/esm";
// @ts-ignore
import Neon, { wallet } from "@cityofzion/neon-core";
import { assert } from "chai";
import { AccountQuestPermissions } from "../../dist/esm/types";
import { NodePermissions, QuestPermissions } from "../../dist/esm/types/quests";
import { helpers } from "@cityofzion/props";

// TODO - Mint and verify total supply change
// TODO - Transfer tests

describe('Basic loop quest workflow', function () {
  this.timeout(60000)

  const scriptHash = Quest.PRIVATENET
  const NODE = 'http://127.0.0.1:50012'
  const ACCOUNT = new Neon.wallet.Account('')

  const getSDK = async (account?: any) => {
    return new Quest({
      scriptHash,
      invoker: await NeonInvoker.init(NODE, account),
      parser: NeonParser,
    })
  }
  let initialQuests = 0
  let initialEdges = 0
  let initialNodes = 1
  let questId = -1
  const questMetadata = {
    title: 'Visit 2 murals and get a free beer',
    description: 'the quest details',
    maxCompletions: 5
  }

  it('should get the initial contract state', async () => {
    const quests = await getSDK()
    initialQuests = await quests.totalQuests()
    assert.isAtLeast(initialQuests, 0)

    initialEdges = await quests.totalEdges()
    assert.isAtLeast(initialQuests, 0)

    initialNodes = await quests.totalNodes()
    assert.isAtLeast(initialNodes, 0)

  })

  it('should get all the quests', async() => {
    const quests = await getSDK()
    const totalQuests = await quests.totalQuests()
    console.log(totalQuests)
    for(let i = 1; i <= totalQuests; i++) {
      const quest = await quests.getQuestJSON({
        questId: i,
      })
      console.log(quest)
    }
  })

  it( 'should create a quest and verify components', async () => {
    const quests = await getSDK(ACCOUNT)

    console.log(ACCOUNT.WIF, ACCOUNT.address)
    const user = await quests.getUserJSON({
      address: ACCOUNT.address
    })
    console.log(user)

    const txid = await quests.createQuest(questMetadata)
    const log = await Utils.transactionCompletion(txid)
    questId = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(`questId: ${questId}`)


    // verify the totals
    const questCount = await quests.totalQuests()
    assert.equal(questCount, initialQuests + 1)

    const edgeCount = await quests.totalEdges()
    assert.equal(edgeCount, initialEdges + 1)

    const nodeCount = await quests.totalNodes()
    assert.equal(nodeCount, initialNodes)

    // verify the quest
    const quest = await quests.getQuestJSON({
      questId,
    })
    assert.equal(questCount, quest.quest_id)
    assert.equal(wallet.getAddressFromScriptHash(quest.creator.substring(2)), ACCOUNT.address)
    assert.equal(quest.permissions, QuestPermissions.RESTRICTED)
    assert.equal(quest.active, false)
    assert.equal(quest.title, questMetadata.title)
    assert.equal(quest.description, questMetadata.description)
    assert.equal(quest.completions, 0)
    assert.equal(quest.max_completions, questMetadata.maxCompletions)
    assert.equal(quest.entry_nodes[0], 1)
    assert.equal(quest.exit_nodes[0], 1)
    assert.equal(quest.edges.length, 1)

    // verify that the edge was created and verify its properties
    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0]
    })
    assert.isAbove(edge.edge_id, 0)
    assert.equal(edge.quest_id, questId)
    assert.equal(edge.description, '')
    assert.equal(edge.entry_node, 1)
    assert.equal(edge.exit_node, 1)
    assert.equal(edge.condition.condition_type, 1)
    assert.equal(edge.condition.label, '0x746e756f432065727574616e676953204d455449')
    assert.equal(edge.condition.count, 0)
    assert.equal(edge.condition.tokens.length, 0)

    // verify that the edge was not attached to the node
    const node = await quests.getNodeJSON({
      nodeId: 1
    })
    assert.equal(node.edges.indexOf(edge.edge_id), -1)
  })

  it('should set the quest as active and verify states', async () => {
    const quests = await getSDK(ACCOUNT)
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
    assert.isTrue(quest.active)
    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0]
    })
    const node = await quests.getNodeJSON({
      nodeId: edge.entry_node
    })
    assert.notEqual(node.edges.indexOf(quest.edges[0]), -1)
  })

  it('should traverse the quest edge and verify state', async () => {
    const quests = await getSDK(ACCOUNT)
    const quest = await quests.getQuestJSON({
      questId: 1,
    })
    console.log(quest)
    const node = await quests.getNodeJSON({
      nodeId: 1
    })
    console.log(quest)
    console.log(node)
    const txid = await quests.traverseEdge({
      edgeId: quest.edges[0],
      resolution: [],
    })
    const log = await Utils.transactionCompletion(txid)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(res)

    const questAgain = await quests.getQuestJSON({
      questId: 1,
    })
    console.log(questAgain)
  })





})
