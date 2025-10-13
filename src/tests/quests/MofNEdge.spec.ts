import { NeonParser } from '@cityofzion/neon-dappkit'
import { constants, Quests, Utils, types, Item } from '../../'
// @ts-ignore
import Neon from '@cityofzion/neon-core'
import { assert } from 'chai'

describe('M of N quest loop', function () {
  this.timeout(60000)

  const account = new Neon.wallet.Account('b319cdef7f5f30f55d3dabc3e99cfc820bf1ccac7db66b51e2a4b281b83e5079')

  const node = constants.NetworkOption.MainNet
  const quests = new Quests({
    account,
    node,
  })

  let questId = -1
  const questMetadata = {
    title: 'FREE BEER for 2 SCANS',
    description:
      `Elevate your Denver web3 experience with our exclusive offer that brings together art, technology, and craft beer in a perfect harmony! Simply tap scan two ITEM Systems plaques seamlessly integrated into Denver Walls murals. These plaques not only showcase the city's artistic flair but also serve as a passport to celebrate the Smart Economy Podcast, where intellect meets innovation.\n` +
      '\n' +
      `After completing your creative journey, head over to Ratio Beerworks to redeem your scanned plaques on-chain and enjoy a complimentary Colorado craft beer. Immerse yourself in the eclectic atmosphere of RiNo, surrounded by captivating street art, as you savor the local flavors of Ratio Beerworks' brews. It's a delightful fusion of art, technology, and the craft beer culture that defines Colorado. Don't miss out on this opportunity to celebrate the rich tapestry of Denver's culture while toasting to the spirit of innovation!`,
    maxCompletions: 600,
  }

  const edgeConditions: types.EdgeConditionITEMPick = {
    count: 2,
    tokens: [1743, 1744, 1745, 1746, 1747, 1748, 1749, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1757, 1758, 1759],
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
    let log = await Utils.transactionCompletion(txid, {
      period: 1000,
      timeout: 60000,
      node: constants.NetworkOption.MainNet,
    })
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
    txid = await quests.setEdgeCondition(params)
    log = await Utils.transactionCompletion(txid, {
      period: 1000,
      timeout: 60000,
      node: constants.NetworkOption.MainNet,
    })
    console.log(txid, parseInt(log.executions[0].gasconsumed) / 10 ** 8)
    const res = NeonParser.parseRpcResponse(log.executions[0].stack![0])
    console.log(`res: ${res}`)

    const edge = await quests.getEdgeJSON({
      edgeId: quest.edges[0],
    })
    console.log(edge)
  })

  it('should set the quest as active and verify states', async () => {
    questId = 3
    const txid = await quests.setQuestActive({
      questId,
      state: true,
    })
    const log = await Utils.transactionCompletion(txid, {
      period: 1000,
      timeout: 60000,
      node: constants.NetworkOption.MainNet,
    })
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

    const resolution = scanExample.map(scan => {
      return Utils.decodeNDEF(scan)
    })

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

  it('', async () => {
    const sigs = [
      'https://itm.st/mp/1cf8?d=BMAp2UCX_vR93Ptzcy0IrJvrNWKGN.S8btSPPS.LieL1bZLzJT3Efvedc_i3DyqMASmsVN.9ZtMf.67FIts_icoAAAAABjBGAiEAlsiT3vVk69uvR.v.6Mna1nhKuVVXJGtFiSMgmopkAOcCIQCY7Fgc6wmlx_MimhXEEOYcpIztQrYrRHi6qr6p1JdVnw--',
      'https://itm.st/mp/1cf8?d=BHOJFppgddHTSiIHDVtZSfLZJ4qRAuEX6Tp6dTpAR8xb5O5btJ3oxOIXTH2YAlC9wAzToOTBT8qsl5eqy2Wy2SoAAAAABjBFAiBHizKdzKSYklftBvLKfeIBpQhaikI7fjFNU2gBkYcsSAIhALqnBAse44QXi8L225PHgXVql9u7qrC7N.M0HDLAXrG5',
      'https://itm.st/mp/1cf8?d=BKyfa7fTSA1mkMO6j9cjH_WFvHL8yFluOTuehF22mpBc_aBC8uy8bFJj8OvWiIq_gqCbj3zkKqIl5HM0jO2dXkMAAAAABTBFAiAB.Xy6t6oueYQTmXZF43YKXK6s7GJfGMRTn9hkGkJwbwIhAJrszpAJTFOXjcDV1ll0DEqCIFAuGT2_qjNPCR4Q96q6',
      'https://itm.st/mp/1cf8?d=BKAgRVutfVudY0xKlByjyJx_1qs92f99zjpmFxV6IXxgG5eg4MsawtxkTkQZqmi0a6f9WPa2ZCFaW9acHjWm1vUAAAAABzBEAiAy.n3p0I1nFS5Rj2hTEK_PghmGAHWgDzEiiPVaCVU9KAIgO42X1HRmPPbIPyLoiSoyUnhitGBqaSzlxEHu3qDxLq4-',
    ]
    const item = new Item()
    for (let i = 0; i < sigs.length; i++) {
      const decode = Utils.decodeNDEF(sigs[i])
      try {
        await item.auth({
          mode: 'default',
          assetPubKey: decode.pubKey,
          message: decode.msg,
          signature: decode.sig,
          burn: false,
        })
        const encode = Utils.encodePublicKey(decode.pubKey)
        console.log(decode.pubKey)
        console.log(`https://itm.st/mp/1cf8?p=${encode}`)
      } catch {
        console.log(false, decode.pubKey)
      }
    }
  })
})
