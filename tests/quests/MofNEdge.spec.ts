import { NeonInvoker } from '@cityofzion/neon-invoker'
import { NeonParser } from '@cityofzion/neon-parser'
import { constants, Quests, Utils, types } from '../../dist/esm'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'

describe('M of N quest loop', function () {
  this.timeout(60000)

  const account = new Neon.wallet.Account('b319cdef7f5f30f55d3dabc3e99cfc820bf1ccac7db66b51e2a4b281b83e5079')

  const node = constants.NetworkOption.LocalNet
  const quests = new Quests({
    account,
    node
  })

  let questId = -1
  const questMetadata = {
    title: 'Lorem ipsum',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis ornare laoreet fringilla. Nunc facilisis tempus ante a imperdiet. Integer non volutpat nisl, vitae auctor leo. Etiam vel suscipit purus, id semper tellus. Cras aliquet cursus dui vitae consectetur. Nullam convallis arcu nunc, sit amet laoreet ipsum commodo sed. Donec condimentum dapibus dictum. Donec ut tempus ipsum. Integer tempus, massa et varius congue, libero tortor maximus nisl, non euismod libero nisi ut nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Proin at sagittis ex, non tristique metus.\n' +
      '\n' +
      'Vestibulum imperdiet consequat nulla quis sollicitudin. Nullam sed ipsum ullamcorper, mattis felis sed, vestibulum neque. Proin pulvinar nisi a sodales pellentesque. Sed tincidunt aliquam enim, viverra congue ligula elementum nec. Donec nec eleifend magna. Vivamus posuere dolor placerat, maximus turpis in, iaculis magna. Maecenas finibus eu dui nec ultrices.',
    maxCompletions: 5,
  }

  const edgeConditions: types.EdgeConditionITEMPick = {
    count: 2,
    tokens: [1743,
      1744,
      1745,
      1746,
      1747,
      1748,
      1749,
      1750,
      1751,
      1752,
      1753,
      1754,
      1755,
      1756,
      1757,
      1758,
      1759],
  }

  it('should get all the quests', async () => {
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
    const quest = await quests.getQuestJSON({
      questId,
    })
    console.log(quest)

    const scanExample = [
      'https://itm.st/mp/2485?d=BGb1l5Pw4lSvEve..Kq.F_pJJzabDRFQUPA4qd6QgPzOQ4T35W4G98l5h6Wt1xBRgMZ3CYFeflqMHDN1jwXFjM.3v7CLkb8DwiWx5zbgamf223qwOgpJKQDTkbwy5MbaNDBEAiB9WGa9Hzj1KzReGn3VAuKV2I_69ouVRAAbZB0O8BVS_gIgfvE4K.egRVpAn3ZuKSUh21XB4wbLwpJD2wCVLi1Sen4-',
      'https://itm.st/mp/2485?d=BCEwLkePue.aiLyiJp69F1N7C.2dNiqH6QeiE9WZnTlVD90yRRBXza3enVwJ6d4j7dx0dHYdLZhu.DTLwUWonrie19GQJtHeV25Bf8Uakly9pQouHFXlsXdmp.120aiocTBEAiB_ZtjifLOisaLXG2i.nvTWSjBSG5svVPX_ccPCSp2mGgIgMUxD56obiUc09xM6c3C4TyjzSwue9Po7XYPQ1Tx_01E-',
    ]

    const resolution = scanExample.map((scan) => {
      return Utils.decodeNDEF(scan)
      }
    )

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
